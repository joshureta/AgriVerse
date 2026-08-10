const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const taskSelect = [
  "id, task_name, description, estimated_duration_minutes, created_at, updated_at",
  "category:task_categories!tasks_category_id_fkey(id, category_name)",
  "field:farm_fields!tasks_field_id_fkey(id, field_name)",
  "priority:task_priorities!tasks_priority_id_fkey(id, priority_name, code)",
  "task_status:task_statuses!tasks_status_id_fkey(id, status_name, code)",
  "schedules(id, schedule_date, start_time, end_time, location, notes, status_id, schedule_status:schedule_statuses!schedules_status_id_fkey(id, status_name, code))",
].join(",");

router.use(requireAuth, requireRole("farm_worker"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readTaskId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid task ID");
  return id;
}

async function statusByCode(table, code) {
  const { data, error } = await getSupabase().from(table).select("id, code")
    .eq("code", String(code || "").trim()).eq("status", true).single();
  if (error || !data) throw httpError(400, "Invalid task status");
  return data;
}

function serializeTask(task) {
  const schedule = Array.isArray(task.schedules) ? task.schedules[0] : task.schedules;
  return {
    ...task,
    schedules: undefined,
    category: task.category?.category_name || "",
    field: task.field?.field_name || "",
    priority: task.priority?.code || "",
    priority_label: task.priority?.priority_name || "",
    status: task.task_status?.code || "",
    status_label: task.task_status?.status_name || "",
    schedule,
    schedule_start: schedule ? `${schedule.schedule_date}T${String(schedule.start_time).slice(0, 8)}+08:00` : null,
  };
}

router.get("/", async (req, res, next) => {
  try {
    let query = getSupabase().from("tasks").select(taskSelect)
      .eq("assigned_worker_id", req.user.id).order("created_at", { ascending: false });
    if (req.query.status) {
      const status = await statusByCode("task_statuses", req.query.status);
      query = query.eq("status_id", status.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ tasks: (data || []).map(serializeTask) });
  } catch (error) { return next(error); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const taskId = readTaskId(req.params.id);
    const status = await statusByCode("task_statuses", req.body.status);
    const { data, error } = await getSupabase().from("tasks").update({ status_id: status.id })
      .eq("id", taskId).eq("assigned_worker_id", req.user.id).select(taskSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, "Assigned task was not found");

    const scheduleCode = status.code === "pending" ? "scheduled" : status.code;
    const scheduleStatus = await statusByCode("schedule_statuses", scheduleCode);
    const { error: scheduleError } = await getSupabase().from("schedules")
      .update({ status_id: scheduleStatus.id }).eq("task_id", taskId);
    if (scheduleError) throw scheduleError;
    return res.json({ task: serializeTask(data) });
  } catch (error) { return next(error); }
});

module.exports = router;
