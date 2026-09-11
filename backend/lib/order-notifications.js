const { getSupabase } = require("../supabase");

const STATUS_COPY = {
  confirmed: ["Order confirmed", "The seller confirmed your order."],
  preparing: ["Order is being prepared", "Your pineapples are being packed."],
  ready_for_delivery: ["Order is ready", "Your order is ready for delivery or pickup."],
  out_for_delivery: ["Out for delivery", "Your pineapple order is on the way."],
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

module.exports = { createOrderStatusNotification };
