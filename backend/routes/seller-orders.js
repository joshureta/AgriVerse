const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const allowedStatuses = new Set(["pending", "confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"]);
const orderSelect = [
  "id, order_number, buyer_id, delivery_method, payment_method, payment_status, order_status",
  "subtotal, shipping_fee, total_amount, customer_note",
  "delivery_full_name, delivery_mobile_number, delivery_country, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay",
  "estimated_delivery_at, confirmed_at, preparing_at, ready_for_delivery_at, out_for_delivery_at, delivered_at, cancelled_at, created_at, updated_at",
  "items:buyer_order_items(id, product_name, weight_label, quantity, unit_price, line_total)",
  "history:buyer_order_status_history(id, previous_status, new_status, note, created_at, changed_by)",
].join(",");

router.use(requireAuth, requireRole("farm_worker"));
router.use((req, res, next) => {
  if (req.profile.worker_category !== "seller") {
    return res.status(403).json({ error: "Only seller accounts can manage orders" });
  }
  return next();
});

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

function serializeOrder(order) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    shipping_fee: Number(order.shipping_fee),
    total_amount: Number(order.total_amount),
    items: (order.items || []).map((item) => ({
      ...item,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().slice(0, 100).replace(/[,()%]/g, " ");
    if (status && !allowedStatuses.has(status)) throw httpError(400, "Invalid order status");

    let query = getSupabase().from("buyer_orders").select(orderSelect).order("created_at", { ascending: false }).limit(200);
    if (status) query = query.eq("order_status", status);
    if (search) query = query.or(`order_number.ilike.%${search}%,delivery_full_name.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ orders: (data || []).map(serializeOrder) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders").select(orderSelect)
      .eq("id", readOrderId(req.params.id)).single();
    if (error?.code === "PGRST116") throw httpError(404, "Order not found");
    if (error) throw error;
    return res.json({ order: serializeOrder(data) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    const note = String(req.body.note || "").trim();
    if (!allowedStatuses.has(status) || status === "pending") throw httpError(400, "Invalid next order status");
    if (note.length > 500) throw httpError(400, "Status note must not exceed 500 characters");
    const { data, error } = await getSupabase().rpc("change_buyer_order_status", {
      p_order_id: readOrderId(req.params.id),
      p_new_status: status,
      p_changed_by: req.user.id,
      p_note: note || null,
    });
    if (error) {
      if (/not found/i.test(error.message || "")) throw httpError(404, error.message);
      if (/cannot move|invalid|only seller/i.test(error.message || "")) throw httpError(409, error.message);
      throw error;
    }
    return res.json({ order: serializeOrder(data) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
