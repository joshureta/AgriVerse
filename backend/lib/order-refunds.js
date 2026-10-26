const { getSupabase } = require("../supabase");
const { paymongoGet, paymongoRequest } = require("./paymongo");
const { createRefundCompletedNotification, createRefundClaimNotification } = require("./order-notifications");
const { httpError } = require("./http-error");

function refundTransferLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && /(^|\.)paymongo(?:-stg)?\.com$/i.test(url.hostname)) return url.href;
  } catch { /* PayMongo did not return a transfer link. */ }
  return null;
}

async function getRefundResource(order) {
  if (order.payment_method === "qrph") {
    const payment = await paymongoGet(`/payments/${encodeURIComponent(order.paymongo_payment_id)}`);
    const refund = (payment?.data?.attributes?.refunds || []).find((item) => item?.id === order.paymongo_refund_id);
    if (!refund) throw httpError(404, "The QR Ph refund is not yet visible on the PayMongo payment");
    return { data: refund };
  }
  return paymongoGet(`/refunds/${encodeURIComponent(order.paymongo_refund_id)}`);
}

function requireTestRefundKey() {
  if (!process.env.PAYMONGO_SECRET_KEY?.startsWith("sk_test_")) {
    throw httpError(503, "Test refunds require a PayMongo test secret key");
  }
}

function refundCentavos(amount) {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(cents) || cents < 100 || Math.abs(cents / 100 - Number(amount)) > 0.000001) {
    throw httpError(400, "Enter a refund amount of at least PHP 1.00, to two decimal places");
  }
  return cents;
}

async function resolvePaidPayment(order, amountCentavos) {
  requireTestRefundKey();
  if (!["gcash", "qrph"].includes(order.payment_method) || order.payment_status !== "paid") {
    throw httpError(409, "Only paid GCash and QR Ph orders can be refunded through PayMongo");
  }
  if (!order.paymongo_payment_intent_id) throw httpError(409, "The original PayMongo payment cannot be found");

  let paymentId = order.paymongo_payment_id;
  if (!paymentId) {
    const intent = await paymongoGet(`/payment_intents/${encodeURIComponent(order.paymongo_payment_intent_id)}`);
    if (intent?.data?.attributes?.livemode !== false || intent?.data?.attributes?.status !== "succeeded") {
      throw httpError(409, "The original test payment is not confirmed as paid");
    }
    const payment = (intent.data.attributes.payments || []).find((item) => item?.attributes?.status === "paid")
      || (intent.data.attributes.payments || []).find((item) => item?.id);
    paymentId = payment?.id;
  }
  if (!paymentId) throw httpError(409, "PayMongo has not provided a Payment ID for this order yet");

  const payment = await paymongoGet(`/payments/${encodeURIComponent(paymentId)}`);
  const attributes = payment?.data?.attributes || {};
  if (payment?.data?.id !== paymentId || attributes.livemode !== false || attributes.status !== "paid"
      || attributes.payment_intent_id !== order.paymongo_payment_intent_id || attributes.currency !== "PHP") {
    throw httpError(409, "The original test payment is not eligible for a refund");
  }
  if (amountCentavos > Number(attributes.amount)) throw httpError(400, "Refund cannot exceed the original payment");
  return paymentId;
}

async function applyRefundResource(orderId, resource) {
  const refundId = resource?.id;
  const attributes = resource?.attributes || {};
  if (!refundId || resource?.type !== "refund" || attributes.livemode !== false) {
    throw httpError(502, "PayMongo returned an invalid test refund");
  }
  const status = attributes.status;
  if (!["pending", "processing", "refunding", "succeeded", "failed"].includes(status)) {
    throw httpError(502, "PayMongo returned an unknown refund status");
  }
  const supabase = getSupabase();
  const { data: current, error: lookupError } = await supabase.from("buyer_orders")
    .select("id, buyer_id, order_number, payment_method, paymongo_payment_id, paymongo_refund_id, refund_reference, refund_amount, refund_status")
    .eq("id", orderId).single();
  if (lookupError) throw lookupError;
  if (current.paymongo_payment_id !== attributes.payment_id
      || (current.paymongo_refund_id && current.paymongo_refund_id !== refundId)
      || refundCentavos(current.refund_amount) !== Number(attributes.amount)) {
    throw httpError(409, "PayMongo refund does not match this order");
  }
  if (current.refund_status === "succeeded") return current;

  const nextStatus = status === "succeeded" ? "succeeded" : status === "failed" ? "failed" : "processing";
  const update = {
    paymongo_refund_id: refundId,
    refund_reference: current.payment_method === "qrph" && nextStatus === "processing"
      ? refundTransferLink(attributes.transfer_link) || current.refund_reference || refundId
      : refundId,
    refund_status: nextStatus,
    refund_error: status === "failed" ? "PayMongo could not process this refund" : null,
  };
  if (nextStatus === "succeeded") {
    update.payment_status = "refunded";
    update.refunded_at = new Date().toISOString();
  }
  const allowed = ["submitting", "processing", "review_required", "failed"];
  const { data: updated, error } = await supabase.from("buyer_orders").update(update)
    .eq("id", orderId).in("refund_status", allowed)
    .select("id, buyer_id, order_number, refund_amount, refund_status").maybeSingle();
  if (error) throw error;
  if (updated && nextStatus === "succeeded") {
    try {
      await createRefundCompletedNotification({ buyerId: updated.buyer_id, orderId, orderNumber: updated.order_number, refundAmount: updated.refund_amount });
    } catch (notificationError) {
      console.error("Failed to notify buyer of completed refund:", notificationError.message);
    }
  }
  if (updated && current.payment_method === "qrph" && nextStatus === "processing"
      && refundTransferLink(attributes.transfer_link) && !refundTransferLink(current.refund_reference)) {
    try {
      await createRefundClaimNotification({ buyerId: updated.buyer_id, orderId, orderNumber: updated.order_number });
    } catch (notificationError) {
      console.error("Failed to notify buyer about QR Ph refund link:", notificationError.message);
    }
  }
  return updated || current;
}

async function submitApprovedRefund(order) {
  try {
    const response = await paymongoRequest("/refunds", {
      data: { attributes: {
        amount: refundCentavos(order.refund_amount),
        payment_id: order.paymongo_payment_id,
        reason: "others",
        notes: `AgriVerse order ${order.order_number}: ${order.order_status === "cancelled" ? "cancellation" : "approved dispute"}`,
      } },
    }, { idempotencyKey: order.refund_idempotency_key, qrphRefund: order.payment_method === "qrph" });
    return await applyRefundResource(order.id, response.data);
  } catch (error) {
    if (error.paymongoPayload?.data?.type === "refund") {
      const resource = error.paymongoPayload.data;
      const updated = await applyRefundResource(order.id, resource);
      if (updated.refund_status === "failed") {
        const { error: saveError } = await getSupabase().from("buyer_orders")
          .update({ refund_error: `PayMongo declined the QR Ph test refund (HTTP ${error.paymongoStatus}). Check this payment's refund details in PayMongo.` })
          .eq("id", order.id).eq("paymongo_refund_id", resource.id);
        if (saveError) throw saveError;
      }
      return updated;
    }
    const status = error.status === 400 && ![408, 409, 429].includes(error.paymongoStatus) ? "failed" : "review_required";
    const { data, error: saveError } = await getSupabase().from("buyer_orders")
      .update({ refund_status: status, refund_error: String(error.message || "PayMongo refund could not be confirmed").slice(0, 500) })
      .eq("id", order.id).eq("refund_status", "submitting")
      .select("id, refund_status, refund_error").maybeSingle();
    if (saveError) throw saveError;
    if (!data) throw error;
    return data;
  }
}

module.exports = { refundCentavos, refundTransferLink, resolvePaidPayment, submitApprovedRefund, applyRefundResource, getRefundResource };
