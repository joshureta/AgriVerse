const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { createOrderStatusNotification } = require("../lib/order-notifications");
const { httpError } = require("../lib/http-error");

const router = express.Router();
const allowedStatuses = new Set(["pending", "confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "ready_for_pickup", "delivered", "completed", "cancelled"]);
const orderStages = {
  all: null,
  awaiting: ["pending"],
  fulfillment: ["confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "ready_for_pickup"],
  completed: ["delivered", "completed"],
  cancelled: ["cancelled"],
};
const orderSelect = [
  "id, order_number, buyer_id, delivery_method, payment_method, payment_status, order_status, delivery_assignment_status",
  "subtotal, shipping_fee, total_amount, customer_note",
  "delivery_full_name, delivery_mobile_number, delivery_country, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay",
  "estimated_delivery_at, confirmed_at, preparing_at, ready_for_delivery_at, out_for_delivery_at, delivered_at, cancelled_at, created_at, updated_at",
  "ready_for_pickup_at, pickup_code, picked_up_at, picked_up_by",
  "items:buyer_order_items!buyer_order_items_order_id_fkey(id, product_name, weight_label, quantity, unit_price, line_total)",
  "history:buyer_order_status_history(id, previous_status, new_status, note, created_at, changed_by)",
].join(",");

router.use(requireAuth, requireRole("farm_worker"));
router.use((req, res, next) => {
  if (req.profile.worker_category !== "seller") {
    return res.status(403).json({ error: "Only seller accounts can manage orders" });
  }
  return next();
});

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
    const stage = String(req.query.stage || "all").trim();
    if (!Object.prototype.hasOwnProperty.call(orderStages, stage)) throw httpError(400, "Invalid order stage");
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 7, 1), 50);
    const search = String(req.query.search || "").trim().slice(0, 100).replace(/[,()%]/g, " ");
    const supabase = getSupabase();

    function filterStage(query, key) {
      return orderStages[key] ? query.in("order_status", orderStages[key]) : query;
    }

    const countKeys = Object.keys(orderStages);
    const searchFilter = `order_number.ilike.%${search}%,delivery_full_name.ilike.%${search}%,delivery_mobile_number.ilike.%${search}%`;
    const [countResults, filteredCountResult] = await Promise.all([
      Promise.all(countKeys.map((key) => filterStage(supabase.from("buyer_orders").select("id", { count: "exact", head: true }), key))),
      search
        ? filterStage(supabase.from("buyer_orders").select("id", { count: "exact", head: true }), stage).or(searchFilter)
        : Promise.resolve(null),
    ]);
    for (const result of countResults) if (result.error) throw result.error;
    if (filteredCountResult?.error) throw filteredCountResult.error;
    const counts = Object.fromEntries(countKeys.map((key, index) => [key, countResults[index].count || 0]));
    const total = search ? filteredCountResult.count || 0 : counts[stage];
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const currentPage = Math.min(page, totalPages);
    let pageQuery = filterStage(supabase.from("buyer_orders").select(orderSelect), stage);
    if (search) pageQuery = pageQuery.or(searchFilter);
    const pageResult = await pageQuery.order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    if (pageResult.error) throw pageResult.error;
    return res.json({
      orders: (pageResult.data || []).map(serializeOrder),
      counts,
      pagination: { page: currentPage, pageSize, total, totalPages },
    });
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
    // "delivered" is only reachable through the driver-proof flow. "completed" is only reachable
    // from "ready_for_pickup" (the pickup hand-off) — change_buyer_order_status enforces that
    // adjacency, this just blocks the obviously-wrong entry points before hitting the database.
    if (!allowedStatuses.has(status) || status === "pending" || status === "delivered") {
      throw httpError(400, "Invalid next order status");
    }
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
    let completedOrder = data;
    // The database trigger keeps this atomic once migration 043 is installed.
    // Also settle cash pickups on older databases that have not applied it yet.
    if (status === "completed" && data.delivery_method === "pickup" && data.payment_method === "cash" && data.payment_status === "unpaid") {
      const { data: paidOrder, error: paymentError } = await getSupabase().from("buyer_orders")
        .update({ payment_status: "paid" })
        .eq("id", data.id).eq("payment_status", "unpaid")
        .select(orderSelect).maybeSingle();
      if (paymentError) throw paymentError;
      if (paidOrder) {
        completedOrder = paidOrder;
      } else {
        const { data: latestOrder, error: latestError } = await getSupabase().from("buyer_orders")
          .select(orderSelect).eq("id", data.id).single();
        if (latestError) throw latestError;
        completedOrder = latestOrder;
      }
    }
    try {
      await createOrderStatusNotification({
        buyerId: completedOrder.buyer_id,
        orderId: completedOrder.id,
        orderNumber: completedOrder.order_number,
        status,
      });
    } catch (notificationError) {
      console.error("Failed to notify buyer of seller order status change:", notificationError.message);
    }
    return res.json({ order: serializeOrder(completedOrder) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
