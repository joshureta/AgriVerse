const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (_req, res, next) => {
  try {
    const db = getSupabase();
    const [queued, assigned] = await Promise.all([
      db.from("monitoring_task_findings")
        .select("id, source, kind, evidence, observed_at, created_at, field:farm_fields!monitoring_task_findings_field_id_fkey(field_name)")
        .eq("status", "queued").order("created_at", { ascending: false }).limit(100),
      db.from("monitoring_task_findings")
        .select("id, source, created_at, field:farm_fields!monitoring_task_findings_field_id_fkey(field_name), task:tasks!monitoring_task_findings_task_id_fkey(id, cancelled_at, assigned_worker:profiles!tasks_assigned_worker_id_fkey(full_name), category:task_categories!tasks_category_id_fkey(category_name), schedules(schedule_date,start_time))")
        .eq("status", "assigned")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }).limit(25),
    ]);
    if (queued.error) throw queued.error;
    if (assigned.error) throw assigned.error;
    // Cancelled or deleted tasks no longer warrant an "assigned" notice.
    const activeAssigned = (assigned.data || [])
      .filter((finding) => finding.task?.id && !finding.task.cancelled_at)
      .slice(0, 5);
    res.json({ findings: queued.data || [], assigned: activeAssigned });
  } catch (error) { next(error); }
});

module.exports = router;
