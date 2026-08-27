const crypto = require("crypto");
const express = require("express");
const { getSupabase } = require("../supabase");

const router = express.Router();

// PayMongo signs each webhook with a header shaped like:
//   Paymongo-Signature: t=<timestamp>,te=<test-mode signature>,li=<live-mode signature>
// The signed payload is `${timestamp}.${rawBody}`, hashed with HMAC-SHA256 using the
// webhook's signing secret. This mirrors PayMongo's publicly documented design (modeled
// after Stripe's Stripe-Signature scheme) — verify this against a real test delivery from
// the PayMongo dashboard before relying on it for live payments; PayMongo's own doc page
// for the exact byte format has been retired and could not be confirmed at build time.
function verifySignature(rawBody, header, secret) {
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

  const candidates = [parts.te, parts.li].filter(Boolean);
  return candidates.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    return candidateBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

router.post("/", async (req, res) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  const signatureHeader = req.headers["paymongo-signature"];

  if (!verifySignature(req.body, signatureHeader, secret)) {
    return res.status(400).json({ error: "Invalid webhook signature" });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid webhook payload" });
  }

  // PayMongo's dashboard only offers "payment.paid" / "payment.failed" (there is no
  // "payment_intent.*" event category) — a captured Payment Intent resolves into a
  // Payment resource, and that Payment carries payment_intent_id back to the intent
  // we stored on the order.
  const eventType = event?.data?.attributes?.type;
  const payment = event?.data?.attributes?.data;
  const intentId = payment?.type === "payment" ? payment.attributes?.payment_intent_id : null;

  try {
    if (intentId && eventType === "payment.paid") {
      await getSupabase()
        .from("buyer_orders")
        .update({ payment_status: "paid" })
        .eq("paymongo_payment_intent_id", intentId);
    } else if (intentId && eventType === "payment.failed") {
      await getSupabase()
        .from("buyer_orders")
        .update({ payment_status: "failed" })
        .eq("paymongo_payment_intent_id", intentId);
    }
  } catch (error) {
    console.error("Failed to apply PayMongo webhook event:", error.message);
  }

  return res.status(200).json({ received: true });
});

module.exports = router;
