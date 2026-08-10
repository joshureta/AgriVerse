const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const taskSelect = [
  "id, task_name, description, estimated_duration_minutes, created_at, updated_at",
  "assigned_worker_id, category_id, field_id, priority_id, status_id",
  "assigned_worker:profiles!tasks_assigned_worker_id_fkey(id, full_name, worker_category)",
  "category:task_categories!tasks_category_id_fkey(id, category_name, status)",
  "field:farm_fields!tasks_field_id_fkey(id, field_name, status)",
  "priority:task_priorities!tasks_priority_id_fkey(id, priority_name, code, status)",
  "task_status:task_statuses!tasks_status_id_fkey(id, status_name, code, status)",
  "schedules(id, schedule_date, start_time, end_time, location, notes, status_id, schedule_status:schedule_statuses!schedules_status_id_fkey(id, status_name, code, status))",
].join(",");

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readId(value, label) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, `A valid ${label.toLowerCase()} is required`);
  return id;
}

function readText(value, label, maxLength) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) {
    throw httpError(400, `${label} is required and must not exceed ${maxLength} characters`);
  }
  return text;
}

function readWorkerId(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw httpError(400, "A valid farm worker is required");
  }
  return id;
}

function readDuration(value) {
  const duration = Number(value);
  if (!Number.isSafeInteger(duration) || duration < 15 || duration > 1440) {
    throw httpError(400, "Estimated duration must be between 15 and 1440 minutes");
  }
  return duration;
}

function readDescription(value) {
  const description = String(value || "").trim();
  if (description.length > 2000) throw httpError(400, "Description must not exceed 2000 characters");
  return description || null;
}

function readDate(value) {
  const date = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00+08:00`).getTime())) {
    throw httpError(400, "A valid schedule date is required");
  }
  return date;
}

function readTime(value, label) {
  const time = String(value || "").trim().slice(0, 8);
  if (!/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time)) throw httpError(400, `A valid ${label.toLowerCase()} is required`);
  return time.length === 5 ? `${time}:00` : time;
}

function addMinutes(time, minutes) {
  const [hours, minute] = time.split(":").map(Number);
  const total = hours * 60 + minute + minutes;
  if (total >= 24 * 60) throw httpError(400, "The task duration must end on the same day");
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

async function ensureFarmWorker(workerId) {
  const { data, error } = await getSupabase().from("profiles").select("id")
    .eq("id", workerId).eq("role", "farm_worker").single();
  if (error || !data) throw httpError(400, "The selected user is not an available farm worker");
}

async function ensureActive(table, id, label, select = "id") {
  const { data, error } = await getSupabase().from(table).select(select)
    .eq("id", readId(id, label)).eq("status", true).single();
  if (error || !data) throw httpError(400, `The selected ${label.toLowerCase()} is unavailable`);
  return data;
}

function serializeTask(task) {
  const schedule = Array.isArray(task.schedules) ? task.schedules[0] : task.schedules;
  const scheduleStart = schedule
    ? `${schedule.schedule_date}T${String(schedule.start_time).slice(0, 8)}+08:00`
    : null;
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
    schedule_start: scheduleStart,
  };
}

async function readTaskBody(body) {
  const assignedWorkerId = readWorkerId(body.assigned_worker_id);
  const duration = readDuration(body.estimated_duration_minutes);
  const category = await ensureActive("task_categories", body.category_id, "Category", "id, category_name");
  const field = await ensureActive("farm_fields", body.field_id, "Field", "id, field_name");
  const priority = await ensureActive("task_priorities", body.priority_id, "Priority", "id, code");
  const taskStatus = await ensureActive("task_statuses", body.status_id, "Status", "id, code");
  await ensureFarmWorker(assignedWorkerId);

  const scheduleDate = readDate(body.schedule_date);
  const startTime = readTime(body.start_time, "Start time");
  const endTime = body.end_time ? readTime(body.end_time, "End time") : addMinutes(startTime, duration);
  if (endTime <= startTime) throw httpError(400, "Schedule end time must be after start time");

  const scheduleCode = taskStatus.code === "pending" ? "scheduled" : taskStatus.code;
  const scheduleStatus = await ensureActive("schedule_statuses", body.schedule_status_id || body.schedule_status?.id || await lookupIdByCode("schedule_statuses", scheduleCode), "Schedule status", "id, code");
  const description = readDescription(body.description);

  return {
    task: {
      assigned_worker_id: assignedWorkerId,
      category_id: category.id,
      field_id: field.id,
      priority_id: priority.id,
      status_id: taskStatus.id,
      task_name: String(body.task_name || description || `${category.category_name} - ${field.field_name}`).trim().slice(0, 160),
      estimated_duration_minutes: duration,
      description,
    },
    schedule: {
      schedule_date: scheduleDate,
      start_time: startTime,
      end_time: endTime,
      location: readText(body.location || field.field_name, "Location", 160),
      status_id: scheduleStatus.id,
      notes: readDescription(body.notes ?? body.description),
    },
  };
}

async function lookupIdByCode(table, code) {
  const { data, error } = await getSupabase().from(table).select("id").eq("code", code).single();
  if (error || !data) throw httpError(400, `No configured value exists for ${code}`);
  return data.id;
}

function readTaskId(value) {
  return readId(value, "Task ID");
}

function throwDatabaseError(error) {
  if (error?.code === "PGRST116") throw httpError(404, "Task was not found");
  if (error?.code === "23503") throw httpError(400, "A referenced task option is invalid");
  throw error;
}

async function fetchTask(id) {
  const { data, error } = await getSupabase().from("tasks").select(taskSelect).eq("id", id).single();
  if (error) throwDatabaseError(error);
  return serializeTask(data);
}

router.get("/options", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const [workers, categories, fields, priorities, statuses, scheduleStatuses] = await Promise.all([
      supabase.from("profiles").select("id, full_name, worker_category").eq("role", "farm_worker").order("full_name"),
      supabase.from("task_categories").select("id, category_name").eq("status", true).order("category_name"),
      supabase.from("farm_fields").select("id, field_name").eq("status", true).order("field_name"),
      supabase.from("task_priorities").select("id, priority_name, code").eq("status", true).order("sort_order"),
      supabase.from("task_statuses").select("id, status_name, code").eq("status", true).order("sort_order"),
      supabase.from("schedule_statuses").select("id, status_name, code").eq("status", true).order("sort_order"),
    ]);
    for (const result of [workers, categories, fields, priorities, statuses, scheduleStatuses]) {
      if (result.error) throw result.error;
    }
    return res.json({
      workers: workers.data || [], categories: categories.data || [], fields: fields.data || [],
      priorities: priorities.data || [], statuses: statuses.data || [], scheduleStatuses: scheduleStatuses.data || [],
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 4, 1), 50);
    const statusCode = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const from = (page - 1) * pageSize;
    const supabase = getSupabase();
    let statusId = null;
    if (statusCode) statusId = await lookupIdByCode("task_statuses", statusCode);

    let query = supabase.from("tasks").select(taskSelect, { count: "exact" })
      .order("created_at", { ascending: false }).range(from, from + pageSize - 1);
    if (statusId) query = query.eq("status_id", statusId);
    if (search) query = query.or(`task_name.ilike.%${search}%,description.ilike.%${search}%`);

    const inProgressId = await lookupIdByCode("task_statuses", "in_progress");
    const completedId = await lookupIdByCode("task_statuses", "completed");
    const [taskResult, totalResult, progressResult, completedResult, workersResult] = await Promise.all([
      query,
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status_id", inProgressId),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status_id", completedId),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farm_worker"),
    ]);
    for (const result of [taskResult, totalResult, progressResult, completedResult, workersResult]) {
      if (result.error) throw result.error;
    }
    const total = taskResult.count || 0;
    return res.json({
      tasks: (taskResult.data || []).map(serializeTask),
      summary: { total: totalResult.count || 0, inProgress: progressResult.count || 0, completed: completedResult.count || 0, availableWorkers: workersResult.count || 0 },
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try { return res.json({ task: await fetchTask(readTaskId(req.params.id)) }); }
  catch (error) { return next(error); }
});

router.post("/", async (req, res, next) => {
  let createdTaskId = null;
  try {
    const payload = await readTaskBody(req.body);
    const { data: task, error: taskError } = await getSupabase().from("tasks")
      .insert({ ...payload.task, created_by: req.user.id }).select("id").single();
    if (taskError) throwDatabaseError(taskError);
    createdTaskId = task.id;
    const { error: scheduleError } = await getSupabase().from("schedules")
      .insert({ ...payload.schedule, task_id: task.id });
    if (scheduleError) throwDatabaseError(scheduleError);
    return res.status(201).json({ task: await fetchTask(task.id) });
  } catch (error) {
    if (createdTaskId) await getSupabase().from("tasks").delete().eq("id", createdTaskId);
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = readTaskId(req.params.id);
    const payload = await readTaskBody(req.body);
    const { error: taskError } = await getSupabase().from("tasks").update(payload.task).eq("id", id);
    if (taskError) throwDatabaseError(taskError);
    const { error: scheduleError } = await getSupabase().from("schedules")
      .upsert({ ...payload.schedule, task_id: id }, { onConflict: "task_id" });
    if (scheduleError) throwDatabaseError(scheduleError);
    return res.json({ task: await fetchTask(id) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
