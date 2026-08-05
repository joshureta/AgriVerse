const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const statuses = new Set(["pending", "in_progress", "completed"]);
const taskSelect =
  "id, category, field, priority, status, schedule_start, estimated_duration_minutes, description, created_at, updated_at";

router.use(requireAuth, requireRole("farm_worker"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readTaskId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw httpError(400, "Invalid task ID");
  }
  return id;
}

router.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    if (status && !statuses.has(status)) {
      throw httpError(400, "Invalid task status");
    }

    let query = getSupabase()
      .from("tasks")
      .select(taskSelect)
      .eq("assigned_worker_id", req.user.id)
      .order("schedule_start", { ascending: true });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ tasks: data || [] });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!statuses.has(status)) {
      throw httpError(400, "Invalid task status");
    }

    const { data, error } = await getSupabase()
      .from("tasks")
      .update({ status })
      .eq("id", readTaskId(req.params.id))
      .eq("assigned_worker_id", req.user.id)
      .select(taskSelect)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw httpError(404, "Assigned task was not found");

    return res.json({ task: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
