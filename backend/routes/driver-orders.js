const express = require("express");
const { requireAuth, requireRole, requireInitialPasswordChanged, requireProfileOnboardingComplete } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("farm_worker"), requireInitialPasswordChanged, requireProfileOnboardingComplete);
router.use((req, res, next) => req.profile.worker_category === "driver" ? next() : res.status(403).json({ error: "Driver access is required" }));

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, order_status, delivery_full_name, delivery_mobile_number, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay, delivery_scheduled_at, delivery_window_end_at")
      .eq("assigned_driver_id", req.user.id).order("delivery_scheduled_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

module.exports = router;
