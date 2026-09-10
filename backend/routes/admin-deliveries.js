const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function orderId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID"); return id; }
function driverId(value) { const id = String(value || "").trim(); if (!/^[0-9a-f-]{36}$/i.test(id)) throw httpError(400, "Select a valid driver"); return id; }
function date(value) { const result = String(value || "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw httpError(400, "Select a delivery date"); return result; }
function time(value) { const result = String(value || "").trim(); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result)) throw httpError(400, "Select a valid delivery time"); return result; }

function readSchedule(body) {
  const scheduleDate = date(body.delivery_date);
  const start = time(body.start_time);
  const end = time(body.end_time);
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  if (startMinutes < 420 || endMinutes > 1080 || endMinutes <= startMinutes) {
    throw httpError(400, "Deliveries must be scheduled between 7:00 AM and 6:00 PM");
  }
  return { start: `${scheduleDate}T${start}:00+08:00`, end: `${scheduleDate}T${end}:00+08:00` };
}

router.get("/ready-orders", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, delivery_full_name, delivery_mobile_number, delivery_city_municipality, delivery_barangay, order_status")
      .eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").is("assigned_driver_id", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.get("/assigned-orders", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, order_status, assigned_driver_id, assigned_vehicle_id, delivery_assignment_status, delivery_full_name, delivery_mobile_number, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay, delivery_scheduled_at, delivery_window_end_at, assigned_driver:profiles!buyer_orders_assigned_driver_id_fkey(id, full_name), assigned_vehicle:delivery_vehicles(id, vehicle_name, plate_number)")
      .not("assigned_driver_id", "is", null).order("delivery_scheduled_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.post("/:id/assign", async (req, res, next) => {
  try {
    const assignedDriverId = driverId(req.body.driver_id);
    const schedule = readSchedule(req.body);
    const { data: driver, error: driverError } = await getSupabase().from("profiles").select("id")
      .eq("id", assignedDriverId).eq("role", "farm_worker").eq("worker_category", "driver").single();
    if (driverError || !driver) throw httpError(400, "The selected worker is not a driver");
    const { data, error } = await getSupabase().from("buyer_orders")
      .update({ assigned_driver_id: assignedDriverId, assigned_vehicle_id: null, delivery_assignment_status: 'assigned', delivery_accepted_at: null, delivery_picked_up_at: null, delivery_scheduled_at: schedule.start, delivery_window_end_at: schedule.end, driver_assigned_at: new Date().toISOString() })
      .eq("id", orderId(req.params.id)).eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").is("assigned_driver_id", null)
      .select("id, order_number, assigned_driver_id, delivery_scheduled_at, delivery_window_end_at").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This order is no longer ready for driver assignment");
    return res.status(201).json({ order: data });
  } catch (error) { return next(error); }
});

const disputeSelect = [
  "id, order_number, total_amount, payment_method, payment_status",
  "delivery_full_name, delivery_mobile_number, delivery_city_municipality, delivery_barangay",
  "delivery_proof_image_url, delivery_proof_notes, delivery_proof_submitted_at",
  "delivery_dispute_reason, delivery_dispute_created_at, delivery_dispute_category, delivery_dispute_affected_quantity",
  "delivery_dispute_photo_urls, delivery_dispute_responsible_role, delivery_dispute_responder_id, delivery_dispute_response, delivery_dispute_response_at",
  "assigned_driver:profiles!buyer_orders_assigned_driver_id_fkey(id, full_name)",
  "disputed_item:buyer_order_items!buyer_orders_delivery_dispute_item_id_fkey(id, product_name, quantity, unit_price)",
].join(",");

router.get("/disputes", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from("buyer_orders")
      .select(disputeSelect)
      .eq("delivery_dispute_status", "open").order("delivery_dispute_created_at", { ascending: true });
    if (error) throw error;
    const orders = data || [];

    // The driver comes straight off the order, but there's no per-order seller
    // column — so "who prepared this" is read off the status-history trail instead.
    const sellerOrderIds = orders.filter((order) => order.delivery_dispute_responsible_role === "seller").map((order) => order.id);
    const sellerByOrderId = {};
    if (sellerOrderIds.length > 0) {
      const { data: history, error: historyError } = await supabase.from("buyer_order_status_history")
        .select("order_id, created_at, seller:profiles!buyer_order_status_history_changed_by_fkey(id, full_name)")
        .in("order_id", sellerOrderIds).in("new_status", ["confirmed", "preparing"]).not("changed_by", "is", null)
        .order("created_at", { ascending: true });
      if (historyError) throw historyError;
      for (const row of history || []) {
        if (!sellerByOrderId[row.order_id] && row.seller) sellerByOrderId[row.order_id] = row.seller;
      }
    }

    return res.json({ orders: orders.map((order) => ({ ...order, responsible_seller: sellerByOrderId[order.id] || null })) });
  } catch (error) { return next(error); }
});

router.post("/:id/resolve-dispute", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const resolution = String(req.body.resolution || "").trim();
    if (!["refunded", "dismissed"].includes(resolution)) throw httpError(400, "Select a valid resolution");
    const notes = String(req.body.notes || "").trim();
    if (!notes) throw httpError(400, "A resolution note is required");
    if (notes.length > 1000) throw httpError(400, "Resolution note must not exceed 1000 characters");

    const supabase = getSupabase();
    const { data: order, error: orderError } = await supabase.from("buyer_orders")
      .select("id, payment_method, delivery_dispute_affected_quantity, disputed_item:buyer_order_items!buyer_orders_delivery_dispute_item_id_fkey(unit_price)")
      .eq("id", id).eq("order_status", "delivered").eq("delivery_dispute_status", "open").maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw httpError(409, "This dispute is no longer open");

    const now = new Date().toISOString();
    const update = {
      delivery_dispute_status: "resolved",
      delivery_dispute_resolution: resolution,
      delivery_dispute_resolved_by: req.user.id,
      delivery_dispute_resolved_at: now,
      delivery_dispute_resolution_notes: notes,
      order_status: "completed",
      completed_at: now,
      completed_via: "dispute_resolved",
    };

    if (resolution === "refunded") {
      const defaultAmount = order.disputed_item ? Number(order.disputed_item.unit_price) * Number(order.delivery_dispute_affected_quantity || 0) : NaN;
      const refundAmount = req.body.refund_amount != null && req.body.refund_amount !== "" ? Number(req.body.refund_amount) : defaultAmount;
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw httpError(400, "Enter a valid refund amount");

      let refundReference;
      if (order.payment_method === "gcash") {
        // No PayMongo refund API call is wired up yet — this only records that a
        // refund was approved, it does not move any money through PayMongo.
        refundReference = "Recorded — GCash refund not yet automated, no money moved by this action";
      } else {
        refundReference = String(req.body.refund_reference || "").trim();
        if (!refundReference) throw httpError(400, "Add a reference for the manual cash/bank transfer before confirming");
        if (refundReference.length > 300) throw httpError(400, "Refund reference must not exceed 300 characters");
      }

      update.payment_status = "refunded";
      update.refund_amount = refundAmount;
      update.refund_reference = refundReference;
      update.refunded_at = now;
    }

    const { data, error } = await supabase.from("buyer_orders").update(update)
      .eq("id", id).eq("order_status", "delivered").eq("delivery_dispute_status", "open")
      .select("id, order_number, order_status, payment_status, delivery_dispute_status, delivery_dispute_resolution, refund_amount, refund_reference")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This dispute is no longer open");

    await supabase.from("buyer_order_status_history").insert({
      order_id: id, previous_status: "delivered", new_status: "completed", changed_by: req.user.id, note: notes,
    });
    return res.json({ order: data });
  } catch (error) { return next(error); }
});

router.patch("/:id/assignment", async (req, res, next) => {
  try {
    const assignedDriverId = driverId(req.body.driver_id);
    const schedule = readSchedule(req.body);
    const { data: driver, error: driverError } = await getSupabase().from("profiles").select("id")
      .eq("id", assignedDriverId).eq("role", "farm_worker").eq("worker_category", "driver").single();
    if (driverError || !driver) throw httpError(400, "The selected worker is not a driver");
    const { data, error } = await getSupabase().from("buyer_orders")
      .update({ assigned_driver_id: assignedDriverId, delivery_scheduled_at: schedule.start, delivery_window_end_at: schedule.end })
      .eq("id", orderId(req.params.id)).eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").eq("delivery_assignment_status", "assigned")
      .select("id, order_number, assigned_driver_id, delivery_scheduled_at, delivery_window_end_at").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Only unaccepted ready-for-delivery orders can be edited");
    return res.json({ order: data });
  } catch (error) { return next(error); }
});

module.exports = router;
