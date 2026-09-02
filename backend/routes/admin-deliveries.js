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

router.get("/disputes", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, delivery_full_name, delivery_mobile_number, delivery_city_municipality, delivery_barangay, delivery_proof_image_url, delivery_proof_notes, delivery_proof_submitted_at, delivery_dispute_reason, delivery_dispute_created_at, assigned_driver:profiles!buyer_orders_assigned_driver_id_fkey(id, full_name)")
      .eq("delivery_dispute_status", "open").order("delivery_dispute_created_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.post("/:id/resolve-dispute", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const resolution = String(req.body.resolution || "").trim();
    if (!["completed", "escalated"].includes(resolution)) throw httpError(400, "Select a valid resolution");
    const notes = String(req.body.notes || "").trim();
    if (!notes) throw httpError(400, "A resolution note is required");
    if (notes.length > 1000) throw httpError(400, "Resolution note must not exceed 1000 characters");

    const now = new Date().toISOString();
    const update = {
      delivery_dispute_status: "resolved",
      delivery_dispute_resolution: resolution,
      delivery_dispute_resolved_by: req.user.id,
      delivery_dispute_resolved_at: now,
      delivery_dispute_resolution_notes: notes,
    };
    if (resolution === "completed") {
      update.order_status = "completed";
      update.completed_at = now;
      update.completed_via = "dispute_resolved";
    }
    const { data, error } = await getSupabase().from("buyer_orders").update(update)
      .eq("id", id).eq("order_status", "delivered").eq("delivery_dispute_status", "open")
      .select("id, order_number, order_status, delivery_dispute_status, delivery_dispute_resolution").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This dispute is no longer open");

    if (resolution === "completed") {
      await getSupabase().from("buyer_order_status_history").insert({
        order_id: id, previous_status: "delivered", new_status: "completed", changed_by: req.user.id, note: notes,
      });
    }
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
