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
      .eq("delivery_method", "delivery").eq("order_status", "preparing").is("assigned_driver_id", null)
      .order("created_at", { ascending: true });
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
      .update({ assigned_driver_id: assignedDriverId, delivery_scheduled_at: schedule.start, delivery_window_end_at: schedule.end, driver_assigned_at: new Date().toISOString() })
      .eq("id", orderId(req.params.id)).eq("delivery_method", "delivery").eq("order_status", "preparing").is("assigned_driver_id", null)
      .select("id, order_number, assigned_driver_id, delivery_scheduled_at, delivery_window_end_at").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This order is no longer ready for driver assignment");
    return res.status(201).json({ order: data });
  } catch (error) { return next(error); }
});

module.exports = router;
