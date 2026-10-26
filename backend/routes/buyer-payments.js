const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { paymongoRequest, paymongoGet } = require("../lib/paymongo");
const { httpError } = require("../lib/http-error");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

function readOrderId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID");
  return id;
}

router.post("/:orderId/gcash-checkout", async (req, res, next) => {
  try {
    const orderId = readOrderId(req.params.orderId);
    const { data: order, error } = await getSupabase()
      .from("buyer_orders")
      .select("id, order_number, buyer_id, payment_method, payment_status, total_amount, delivery_full_name, delivery_mobile_number")
      .eq("id", orderId)
      .eq("buyer_id", req.user.id)
      .single();
    if (error?.code === "PGRST116") throw httpError(404, "Order not found");
    if (error) throw error;
    if (order.payment_method !== "gcash") throw httpError(400, "This order is not set up for GCash payment");
    if (!["pending", "failed"].includes(order.payment_status)) throw httpError(409, "This order is not awaiting payment");

    const amount = Math.round(Number(order.total_amount) * 100);
    const webAppUrl = (process.env.WEB_APP_URL || "http://localhost:5173").replace(/\/$/, "");
    const returnUrl = `${webAppUrl}/buyer/payment-confirmation?order=${order.id}`;

    const methodResponse = await paymongoRequest("/payment_methods", {
      data: {
        attributes: {
          type: "gcash",
          billing: {
            name: order.delivery_full_name || undefined,
            email: req.user.email || undefined,
            phone: order.delivery_mobile_number || undefined,
          },
        },
      },
    });
    const paymentMethodId = methodResponse.data.id;

    const intentResponse = await paymongoRequest("/payment_intents", {
      data: {
        attributes: {
          amount,
          currency: "PHP",
          payment_method_allowed: ["gcash"],
          capture_type: "automatic",
          description: `AgriVerse order ${order.order_number}`,
        },
      },
    });
    const paymentIntentId = intentResponse.data.id;
    const clientKey = intentResponse.data.attributes.client_key;

    const attachResponse = await paymongoRequest(`/payment_intents/${paymentIntentId}/attach`, {
      data: {
        attributes: {
          payment_method: paymentMethodId,
          client_key: clientKey,
          return_url: returnUrl,
        },
      },
    });

    const checkoutUrl = attachResponse.data.attributes.next_action?.redirect?.url;
    if (!checkoutUrl) throw httpError(502, "PayMongo did not return a GCash checkout link");

    const { error: updateError } = await getSupabase()
      .from("buyer_orders")
      .update({ paymongo_payment_intent_id: paymentIntentId, paymongo_payment_method_id: paymentMethodId })
      .eq("id", order.id);
    if (updateError) throw updateError;

    return res.json({ checkout_url: checkoutUrl });
  } catch (error) {
    return next(error);
  }
});

function qrResponse(intent) {
  const attributes = intent?.data?.attributes || {};
  const code = attributes.next_action?.code || {};
  const testMode = attributes.livemode === false || process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test_");
  return {
    status: attributes.status === "succeeded" ? "paid" : "pending",
    test_mode: testMode,
    // A test QR Ph image can still be paid with a real bank app. Never expose it in test mode.
    image_url: testMode ? null : code.image_url || null,
    test_url: testMode ? code.test_url || attributes.next_action?.test_url || attributes.test_url || intent?.data?.test_url || null : null,
  };
}

router.post("/:orderId/qrph-checkout", async (req, res, next) => {
  try {
    const orderId = readOrderId(req.params.orderId);
    const supabase = getSupabase();
    const { data: order, error } = await supabase
      .from("buyer_orders")
      .select("id, order_number, buyer_id, payment_method, payment_status, order_status, total_amount, paymongo_payment_intent_id")
      .eq("id", orderId)
      .eq("buyer_id", req.user.id)
      .single();
    if (error?.code === "PGRST116") throw httpError(404, "Order not found");
    if (error) throw error;
    if (order.payment_method !== "qrph") throw httpError(400, "This order is not set up for QR Ph payment");
    if (order.order_status === "cancelled") throw httpError(409, "This order has been cancelled");
    if (!["pending", "failed"].includes(order.payment_status)) throw httpError(409, "This order is not awaiting payment");

    let paymentIntentId = order.paymongo_payment_intent_id;
    if (!paymentIntentId) {
      const created = await paymongoRequest("/payment_intents", {
        data: { attributes: {
          amount: Math.round(Number(order.total_amount) * 100),
          currency: "PHP",
          payment_method_allowed: ["qrph"],
          capture_type: "automatic",
          description: `AgriVerse order ${order.order_number}`,
        } },
      });
      paymentIntentId = created.data.id;
      const { data: claimed, error: claimError } = await supabase
        .from("buyer_orders")
        .update({ paymongo_payment_intent_id: paymentIntentId })
        .eq("id", order.id)
        .is("paymongo_payment_intent_id", null)
        .select("id")
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        const { data: current, error: currentError } = await supabase
          .from("buyer_orders").select("paymongo_payment_intent_id")
          .eq("id", order.id).single();
        if (currentError) throw currentError;
        paymentIntentId = current.paymongo_payment_intent_id;
      }
    }

    let intent = await paymongoGet(`/payment_intents/${paymentIntentId}`);
    let status = intent?.data?.attributes?.status;
    if (status === "succeeded") {
      const { error: paidError } = await supabase.from("buyer_orders").update({ payment_status: "paid" })
        .eq("id", order.id).in("payment_status", ["pending", "failed"]);
      if (paidError) throw paidError;
      return res.json({ status: "paid" });
    }
    if (status === "awaiting_next_action" || status === "processing") {
      return res.json(qrResponse(intent));
    }
    if (status !== "awaiting_payment_method") {
      throw httpError(409, "This QR Ph payment can no longer be used");
    }

    // An expired QR returns the intent to awaiting_payment_method. Attach a fresh
    // method to the same intent so retries stay tied to the original order.
    const method = await paymongoRequest("/payment_methods", {
      data: { attributes: { type: "qrph" } },
    });
    intent = await paymongoRequest(`/payment_intents/${paymentIntentId}/attach`, {
      data: { attributes: {
        payment_method: method.data.id,
        client_key: intent.data.attributes.client_key,
      } },
    });
    const { error: updateError } = await supabase.from("buyer_orders")
      .update({ paymongo_payment_method_id: method.data.id, payment_status: "pending" })
      .eq("id", order.id).eq("paymongo_payment_intent_id", paymentIntentId);
    if (updateError) throw updateError;
    const result = qrResponse(intent);
    if (!result.image_url && !result.test_url && result.status !== "paid") {
      throw httpError(502, "PayMongo did not return a QR Ph payment action");
    }
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
