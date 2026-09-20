const { getSupabase } = require("../supabase");

const STATUS_COPY = {
  confirmed: ["Order confirmed", "The seller confirmed your order."],
  preparing: ["Order is being prepared", "Your pineapples are being packed."],
  ready_for_delivery: ["Order is ready", "Your order is ready for delivery or pickup."],
  out_for_delivery: ["Out for delivery", "Your pineapple order is on the way."],
  ready_for_pickup: ["Ready for pickup!", "Show your pickup code at the counter to collect your order."],
  delivered: ["Order delivered", "Your order has been marked as delivered."],
  cancelled: ["Order cancelled", "This order was cancelled."],
  completed: ["Order completed", "Your order has been completed."],
};

async function createOrderStatusNotification({ buyerId, orderId, orderNumber, status }) {
  const copy = STATUS_COPY[status];
  if (!buyerId || !orderId || !copy) return;

  const { error } = await getSupabase().from("notifications").insert({
    recipient_id: buyerId,
    type: "order_status_updated",
    title: copy[0],
    body: `${copy[1]} Order ${orderNumber || `#${orderId}`}.`,
    entity_type: "order",
    entity_id: orderId,
  });
  if (error) throw error;
}

async function createDeliveryAssignedNotification({ driverId, orderId, orderNumber }) {
  if (!driverId || !orderId) return;

  const { error } = await getSupabase().from("notifications").insert({
    recipient_id: driverId,
    type: "delivery_assigned",
    title: "New delivery assigned",
    body: `You've been assigned order ${orderNumber || `#${orderId}`} for delivery.`,
    entity_type: "order",
    entity_id: orderId,
  });
  if (error) throw error;
}

async function createDeliveryScheduleUpdatedNotification({ driverId, orderId, orderNumber }) {
  if (!driverId || !orderId) return;

  const { error } = await getSupabase().from("notifications").insert({
    recipient_id: driverId,
    type: "delivery_assigned",
    title: "Delivery schedule updated",
    body: `Your delivery window for order ${orderNumber || `#${orderId}`} was updated.`,
    entity_type: "order",
    entity_id: orderId,
  });
  if (error) throw error;
}

const DISPUTE_CATEGORY_LABELS = {
  damaged: "damaged produce",
  spoiled_rotten: "spoiled or rotten produce",
  wrong_item: "the wrong item",
  missing_item: "a missing item",
  wrong_quantity: "the wrong quantity",
};

// There's no per-order seller column, so "who prepared this" is read off the
// status-history trail (same approach as the admin disputes list).
async function findOrderSellerId(orderId) {
  const { data, error } = await getSupabase().from("buyer_order_status_history")
    .select("changed_by")
    .eq("order_id", orderId).in("new_status", ["confirmed", "preparing"]).not("changed_by", "is", null)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  return data?.changed_by || null;
}

// Tells the admins, and whoever the buyer's report points at (driver or seller), that a dispute needs a look.
async function createDisputeOpenedNotifications({ orderId, orderNumber, category, responsibleRole, driverId }) {
  if (!orderId) return;

  const { data: admins, error: adminError } = await getSupabase().from("profiles").select("id").eq("role", "admin");
  if (adminError) throw adminError;

  const responsibleId = responsibleRole === "driver" ? driverId : responsibleRole === "seller" ? await findOrderSellerId(orderId) : null;
  const recipientIds = [...new Set([...(admins || []).map((admin) => admin.id), responsibleId].filter(Boolean))];
  if (recipientIds.length === 0) return;

  const orderLabel = orderNumber || `#${orderId}`;
  const issue = DISPUTE_CATEGORY_LABELS[category] || "a problem";
  const { error } = await getSupabase().from("notifications").insert(recipientIds.map((recipientId) => ({
    recipient_id: recipientId,
    type: "dispute_opened",
    title: "Delivery issue reported",
    body: `The buyer reported ${issue} on order ${orderLabel}. Review the report and evidence.`,
    entity_type: "order",
    entity_id: orderId,
  })));
  if (error) throw error;
}

// Tells the buyer what the admin decided. Uses the order_status_updated type so it shows in the buyer's feed.
async function createDisputeResolvedNotification({ buyerId, orderId, orderNumber, resolution, refundAmount }) {
  if (!buyerId || !orderId) return;

  const orderLabel = orderNumber || `#${orderId}`;
  const refunded = resolution === "refunded";
  const amount = Number(refundAmount);
  const { error } = await getSupabase().from("notifications").insert({
    recipient_id: buyerId,
    type: "order_status_updated",
    title: refunded ? "Refund approved" : "Return request not approved",
    body: refunded
      ? `Your refund${Number.isFinite(amount) && amount > 0 ? ` of PHP ${amount.toLocaleString("en-PH")}` : ""} for order ${orderLabel} was approved.`
      : `Your return request for order ${orderLabel} was reviewed and not approved. Open the order to read the admin's note.`,
    entity_type: "order",
    entity_id: orderId,
  });
  if (error) throw error;
}

module.exports = {
  createOrderStatusNotification,
  createDeliveryAssignedNotification,
  createDeliveryScheduleUpdatedNotification,
  createDisputeOpenedNotifications,
  createDisputeResolvedNotification,
};
