const crypto = require("crypto");
const express = require("express");
const { getSupabase } = require("../supabase");
const { applyRefundResource, getRefundResource } = require("../lib/order-refunds");
const { createRefundRequestedNotifications } = require("../lib/order-notifications");

const router = express.Router();

// PayMongo signs each webhook with a header shaped like:
//   Paymongo-Signature: t=<timestamp>,te=<test-mode signature>,li=<live-mode signature>
// The signed payload is `${timestamp}.${rawBody}`, hashed with HMAC-SHA256 using the
// webhook's signing secret, using PayMongo's documented signature format.
function verifySignature(rawBody, header, secret, testMode) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((pair) => {
      const [key, value] = pair.split("=");
      return [key, value];
    }),
  );
  if (!parts.t || (!parts.te && !parts.li)) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody.toString("utf8")}`)
    .digest("hex");

  const candidates = testMode ? [parts.te].filter(Boolean) : [parts.te, parts.li].filter(Boolean);
  return candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

router.post("/", async (req, res) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const signatureHeader = req.headers["paymongo-signature"];

  if (!verifySignature(req.body, signatureHeader, secret, process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test_"))) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  // A paid Payment carries payment_intent_id back to the intent stored on the order.
  const eventType = event?.data?.attributes?.type;
  const payment = event?.data?.attributes?.data;
  const intentId = payment?.type === "payment" ? payment.attributes?.payment_intent_id : null;

  try {
    if (process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test_") && event?.data?.attributes?.livemode !== false) {
      return res.status(400).json({ error: "Only test events are accepted with the test key" });
    }
    if (intentId && eventType === "payment.paid") {
      const { error: schemaError } = await getSupabase().from("buyer_orders").select("refund_status").limit(1);
      if (schemaError && schemaError.code !== "42703") throw schemaError;
      const refundSchemaReady = !schemaError;
      const { data: paidOrders, error } = await getSupabase()
        .from("buyer_orders")
        .update({ payment_status: "paid", ...(refundSchemaReady ? { paymongo_payment_id: payment.id } : {}) })
        .eq("paymongo_payment_intent_id", intentId)
        .in("payment_status", ["pending", "failed"])
        .select(`id, buyer_id, order_number, order_status${refundSchemaReady ? ", refund_status" : ""}`);
      if (error) throw error;
      for (const order of paidOrders || []) {
        if (order.order_status === "cancelled" && order.refund_status === "requested") {
          try {
            await createRefundRequestedNotifications({ buyerId: order.buyer_id, orderId: order.id, orderNumber: order.order_number });
          } catch (notificationError) {
            console.error("Failed to notify about late payment refund:", notificationError.message);
          }
        }
      }
      if (refundSchemaReady) {
        const { error: idError } = await getSupabase().from("buyer_orders")
          .update({ paymongo_payment_id: payment.id })
          .eq("paymongo_payment_intent_id", intentId).eq("payment_status", "paid")
          .is("paymongo_payment_id", null);
        if (idError) throw idError;
      }
    } else if (intentId && eventType === "payment.failed") {
      const { error } = await getSupabase()
        .from("buyer_orders")
        .update({ payment_status: "failed" })
        .eq("paymongo_payment_intent_id", intentId)
        .eq("payment_status", "pending");
      if (error) throw error;
    } else if (payment?.type === "refund" && ["refund.succeeded", "refund.failed", "refund.updated"].includes(eventType)) {
      const { data: order, error } = await getSupabase().from("buyer_orders")
        .select("id, payment_method, paymongo_payment_id, paymongo_refund_id").eq("paymongo_refund_id", payment.id).maybeSingle();
      if (error) throw error;
      if (order) {
        const refund = await getRefundResource(order);
        await applyRefundResource(order.id, refund.data);
      }
    }
  } catch (error) {
    console.error("Failed to apply PayMongo webhook event:", error.message);
    return res.status(500).json({ error: "Unable to record payment event" });
  }

  return res.status(200).json({ received: true });
});

module.exports = router;
