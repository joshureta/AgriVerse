const express = require("express");
const {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
  requireRole,
} = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const statuses = new Set(["pending", "in_progress", "completed"]);
const taskSelect = [
  "id, task_name, assigned_worker_id, description, estimated_duration_minutes, started_at, completed_at, completion_notes, created_at, updated_at",
  "category:task_categories!tasks_category_id_fkey(id, category_name)",
  "field:farm_fields!tasks_field_id_fkey(id, field_name)",
  "priority:task_priorities!tasks_priority_id_fkey(id, priority_name, code)",
  "task_status:task_statuses!tasks_status_id_fkey(id, status_name, code)",
  "schedules(id, schedule_date, start_time, end_time, location, notes, status_id, schedule_status:schedule_statuses!schedules_status_id_fkey(id, status_name, code))",
].join(",");

router.use(
  requireAuth,
  requireRole("farm_worker"),
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
);
router.use((req, res, next) => {
  if (req.profile.worker_category === "driver") return res.status(403).json({ error: "Drivers receive delivery orders, not farm tasks" });
  return next();
});

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

async function statusByCode(table, code, errorStatus = 400) {
  const { data, error } = await getSupabase().from(table).select("id, code")
    .eq("code", String(code || "").trim()).eq("status", true).single();
  if (error || !data) throw httpError(errorStatus, `Status '${code}' is not configured`);
  return data;
}

async function getStatusIds() {
  const { data, error } = await getSupabase().from("task_statuses").select("id, code")
    .in("code", [...statuses]);
  if (error) throw error;
  const ids = Object.fromEntries((data || []).map((status) => [status.code, status.id]));
  for (const status of statuses) {
    if (!ids[status]) throw httpError(500, `Task status '${status}' is not configured`);
  }
  return ids;
}

function serializeTask(task) {
  const schedule = Array.isArray(task.schedules) ? task.schedules[0] : task.schedules;
  return {
    ...task,
    schedules: undefined,
    category: task.category?.category_name || "Uncategorized",
    field: task.field?.field_name || "Unassigned field",
    priority: task.priority?.code || "medium",
    priority_label: task.priority?.priority_name || "",
    status: task.task_status?.code || "pending",
    status_label: task.task_status?.status_name || "",
    description: task.description || task.task_name || null,
    schedule,
    schedule_start: schedule
      ? `${schedule.schedule_date}T${String(schedule.start_time).slice(0, 8)}+08:00`
      : task.created_at,
  };
}

async function syncScheduleStatus(taskId, taskStatus) {
  const scheduleCode = taskStatus === "pending" ? "scheduled" : taskStatus;
  const scheduleStatus = await statusByCode("schedule_statuses", scheduleCode, 500);
  const { error } = await getSupabase().from("schedules")
    .update({ status_id: scheduleStatus.id }).eq("task_id", taskId);
  if (error) throw error;
}

router.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status || "").trim();
    if (status && !statuses.has(status)) throw httpError(400, "Invalid task status");
    const statusIds = await getStatusIds();
    const supabase = getSupabase();
    let query = supabase.from("tasks").select(taskSelect)
      .eq("assigned_worker_id", req.user.id).order("created_at", { ascending: false });
    if (status) query = query.eq("status_id", statusIds[status]);

    const [taskResult, pendingResult, activeResult, completedResult] = await Promise.all([
      query,
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).eq("status_id", statusIds.pending),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).eq("status_id", statusIds.in_progress),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).eq("status_id", statusIds.completed),
    ]);
    for (const result of [taskResult, pendingResult, activeResult, completedResult]) {
      if (result.error) throw result.error;
    }
    const pending = pendingResult.count || 0;
    const active = activeResult.count || 0;
    const completed = completedResult.count || 0;
    return res.json({
      tasks: (taskResult.data || []).map(serializeTask),
      summary: { pending, active, completed, total: pending + active + completed },
    });
  } catch (error) { return next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("tasks").select(taskSelect)
      .eq("id", readTaskId(req.params.id)).eq("assigned_worker_id", req.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(404, "Assigned task was not found");
    return res.json({ task: serializeTask(data) });
  } catch (error) { return next(error); }
});

router.post("/:id/complete", async (req, res, next) => {
  try {
    const taskId = readTaskId(req.params.id);
    const completedAt = new Date(req.body.completed_at);
    if (Number.isNaN(completedAt.getTime())) throw httpError(400, "A valid finish time is required");
    if (completedAt.getTime() > Date.now() + 5 * 60 * 1000) throw httpError(400, "Finish time cannot be in the future");
    const completionNotes = String(req.body.completion_notes || "").trim();
    if (completionNotes.length > 2000) throw httpError(400, "Insights must not exceed 2000 characters");

    const statusIds = await getStatusIds();
    const { data, error } = await getSupabase().from("tasks").update({
      status_id: statusIds.completed,
      completed_at: completedAt.toISOString(),
      completion_notes: completionNotes || null,
    }).eq("id", taskId).eq("assigned_worker_id", req.user.id)
      .eq("status_id", statusIds.in_progress).select(taskSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Only an active assigned task can be completed");
    await syncScheduleStatus(taskId, "completed");
    return res.json({ task: serializeTask(data) });
  } catch (error) { return next(error); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!statuses.has(status)) throw httpError(400, "Invalid task status");
    const taskId = readTaskId(req.params.id);
    const statusIds = await getStatusIds();
    const { data: currentTask, error: readError } = await getSupabase().from("tasks")
      .select("id, status_id, task_status:task_statuses(code)").eq("id", taskId)
      .eq("assigned_worker_id", req.user.id).maybeSingle();
    if (readError) throw readError;
    if (!currentTask) throw httpError(404, "Assigned task was not found");

    const currentStatus = currentTask.task_status?.code;
    const expectedStatus = currentStatus === "pending" ? "in_progress"
      : currentStatus === "in_progress" ? "completed" : null;
    if (status !== expectedStatus) throw httpError(409, `Task cannot move from ${currentStatus} to ${status}`);

    const { data, error } = await getSupabase().from("tasks")
      .update({ status_id: statusIds[status] }).eq("id", taskId)
      .eq("assigned_worker_id", req.user.id).eq("status_id", currentTask.status_id)
      .select(taskSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Task status changed before this request completed");
    await syncScheduleStatus(taskId, status);
    return res.json({ task: serializeTask(data) });
  } catch (error) { return next(error); }
});

module.exports = router;
