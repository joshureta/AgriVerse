const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { paymongoRequest } = require("../lib/paymongo");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

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
    const returnUrl = `${webAppUrl}/buyer/checkout?order=${order.id}&payment=return`;

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

module.exports = router;
