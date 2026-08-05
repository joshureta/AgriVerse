const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const categories = ["Planting", "Irrigation", "Fertilizer", "Crop Inspection", "Harvesting"];
const fields = ["Field A", "Field B", "Field C", "Field D"];
const priorities = new Set(["high", "medium", "low"]);
const statuses = new Set(["pending", "in_progress", "completed"]);
const taskSelect = "id, category, field, priority, status, schedule_start, estimated_duration_minutes, description, created_at, updated_at, assigned_worker_id, assigned_worker:profiles!tasks_assigned_worker_id_fkey(id, full_name, worker_category)";

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readText(value, label, maxLength) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) {
    throw httpError(400, `${label} is required and must not exceed ${maxLength} characters`);
  }
  return text;
}

function readChoice(value, choices, label) {
  const choice = String(value || "").trim();
  if (!choices.has(choice)) throw httpError(400, `Invalid ${label.toLowerCase()}`);
  return choice;
}

function readWorkerId(value) {
  const id = String(value || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw httpError(400, "A valid farm worker is required");
  }
  return id;
}

function readSchedule(value) {
  const schedule = new Date(value);
  if (Number.isNaN(schedule.getTime())) throw httpError(400, "A valid start date and time is required");
  return schedule.toISOString();
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

async function ensureFarmWorker(workerId) {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id")
    .eq("id", workerId)
    .eq("role", "farm_worker")
    .single();
  if (error || !data) throw httpError(400, "The selected user is not an available farm worker");
}

async function readTaskBody(body, { partial = false } = {}) {
  const workerId = readWorkerId(body.assigned_worker_id);
  await ensureFarmWorker(workerId);
  const category = readText(body.category, "Category", 80);
  const field = readText(body.field, "Field", 80);
  if (!categories.includes(category)) throw httpError(400, "Invalid task category");
  if (!fields.includes(field)) throw httpError(400, "Invalid farm field");

  return {
    assigned_worker_id: workerId,
    category,
    field,
    priority: readChoice(body.priority, priorities, "Priority"),
    status: readChoice(partial ? body.status : (body.status || "pending"), statuses, "Status"),
    schedule_start: readSchedule(body.schedule_start),
    estimated_duration_minutes: readDuration(body.estimated_duration_minutes),
    description: readDescription(body.description),
  };
}

function readTaskId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid task ID");
  return id;
}

function throwDatabaseError(error) {
  if (error?.code === "PGRST116") throw httpError(404, "Task was not found");
  throw error;
}

router.get("/options", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("profiles")
      .select("id, full_name, worker_category")
      .eq("role", "farm_worker")
      .order("full_name", { ascending: true });
    if (error) throw error;
    return res.json({ workers: data || [], categories, fields });
  } catch (error) {
    return next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 4, 1), 50);
    const status = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const from = (page - 1) * pageSize;
    const supabase = getSupabase();

    let query = supabase.from("tasks").select(taskSelect, { count: "exact" })
      .order("schedule_start", { ascending: true }).range(from, from + pageSize - 1);
    if (status) query = query.eq("status", readChoice(status, statuses, "Status"));
    if (search) query = query.or(`category.ilike.%${search}%,field.ilike.%${search}%,description.ilike.%${search}%`);

    const [taskResult, totalResult, progressResult, completedResult, workersResult] = await Promise.all([
      query,
      supabase.from("tasks").select("id", { count: "exact", head: true }),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "farm_worker"),
    ]);
    for (const result of [taskResult, totalResult, progressResult, completedResult, workersResult]) {
      if (result.error) throw result.error;
    }

    const total = taskResult.count || 0;
    return res.json({
      tasks: taskResult.data || [],
      summary: {
        total: totalResult.count || 0,
        inProgress: progressResult.count || 0,
        completed: completedResult.count || 0,
        availableWorkers: workersResult.count || 0,
      },
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("tasks").select(taskSelect)
      .eq("id", readTaskId(req.params.id)).single();
    if (error) throwDatabaseError(error);
    return res.json({ task: data });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = await readTaskBody(req.body);
    const { data, error } = await getSupabase().from("tasks")
      .insert({ ...payload, created_by: req.user.id }).select(taskSelect).single();
    if (error) throwDatabaseError(error);
    return res.status(201).json({ task: data });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = await readTaskBody(req.body, { partial: true });
    const { data, error } = await getSupabase().from("tasks").update(payload)
      .eq("id", readTaskId(req.params.id)).select(taskSelect).single();
    if (error) throwDatabaseError(error);
    return res.json({ task: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
