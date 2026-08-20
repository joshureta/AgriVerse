const express = require("express");
const { requireAuth, requireRole, requireInitialPasswordChanged, requireProfileOnboardingComplete } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("farm_worker"), requireInitialPasswordChanged, requireProfileOnboardingComplete);
router.use((req, res, next) => req.profile.worker_category === "driver" ? next() : res.status(403).json({ error: "Driver access is required" }));

function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function orderId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID"); return id; }
function vehicleId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Select a valid vehicle"); return id; }

const orderSelect = "id, order_number, total_amount, payment_method, order_status, delivery_assignment_status, assigned_vehicle_id, delivery_full_name, delivery_mobile_number, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay, delivery_scheduled_at, delivery_window_end_at, vehicle:delivery_vehicles(id, vehicle_name, plate_number)";

async function fetchDriverOrder(id, driverId) {
  const { data, error } = await getSupabase().from("buyer_orders").select(orderSelect)
    .eq("id", id).eq("assigned_driver_id", driverId).maybeSingle();
  if (error) throw error;
  if (!data) throw httpError(404, "Assigned delivery order was not found");
  return data;
}

router.get("/vehicles", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("delivery_vehicles")
      .select("id, vehicle_name, plate_number").eq("status", "available").order("vehicle_name");
    if (error) throw error;
    return res.json({ vehicles: data || [] });
  } catch (error) { return next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders").select(orderSelect)
      .eq("assigned_driver_id", req.user.id).order("delivery_scheduled_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.post("/:id/accept", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const selectedVehicleId = vehicleId(req.body.vehicle_id);
    const order = await fetchDriverOrder(id, req.user.id);
    if (order.delivery_assignment_status !== "assigned" || order.order_status !== "preparing") throw httpError(409, "This delivery is no longer waiting for acceptance");
    const { data: vehicle, error: vehicleError } = await getSupabase().from("delivery_vehicles")
      .update({ status: "in_use" }).eq("id", selectedVehicleId).eq("status", "available").select("id").maybeSingle();
    if (vehicleError) throw vehicleError;
    if (!vehicle) throw httpError(409, "This vehicle is no longer available");
    const { error } = await getSupabase().from("buyer_orders").update({ assigned_vehicle_id: selectedVehicleId, delivery_assignment_status: "accepted", delivery_accepted_at: new Date().toISOString() })
      .eq("id", id).eq("assigned_driver_id", req.user.id).eq("delivery_assignment_status", "assigned");
    if (error) {
      await getSupabase().from("delivery_vehicles").update({ status: "available" }).eq("id", selectedVehicleId);
      throw error;
    }
    return res.json({ order: await fetchDriverOrder(id, req.user.id) });
  } catch (error) { return next(error); }
});

router.post("/:id/status", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const nextStatus = String(req.body.status || "").trim();
    const order = await fetchDriverOrder(id, req.user.id);
    const transitions = { accepted: "picked_up", picked_up: "out_for_delivery", out_for_delivery: "delivered" };
    if (transitions[order.delivery_assignment_status] !== nextStatus) throw httpError(409, "This delivery cannot move to that status");
    const update = { delivery_assignment_status: nextStatus };
    if (nextStatus === "picked_up") update.delivery_picked_up_at = new Date().toISOString();
    if (nextStatus === "out_for_delivery") update.order_status = "out_for_delivery";
    if (nextStatus === "delivered") { update.order_status = "delivered"; update.delivered_at = new Date().toISOString(); }
    const { error } = await getSupabase().from("buyer_orders").update(update).eq("id", id).eq("assigned_driver_id", req.user.id);
    if (error) throw error;
    if (nextStatus === "delivered" && order.assigned_vehicle_id) {
      const { error: vehicleError } = await getSupabase().from("delivery_vehicles").update({ status: "available" }).eq("id", order.assigned_vehicle_id);
      if (vehicleError) throw vehicleError;
    }
    return res.json({ order: await fetchDriverOrder(id, req.user.id) });
  } catch (error) { return next(error); }
});

module.exports = router;
