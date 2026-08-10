const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const scheduleSelect = [
  "id, task_id, schedule_date, start_time, end_time, location, status_id, notes, created_at, updated_at",
  "schedule_status:schedule_statuses!schedules_status_id_fkey(id, status_name, code, status)",
  "task:tasks!schedules_task_id_fkey(id, task_name, description, category_id, category:task_categories!tasks_category_id_fkey(id, category_name), assigned_worker_id, assigned_worker:profiles!tasks_assigned_worker_id_fkey(id, full_name))",
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

function readText(value, label, maxLength, optional = false) {
  const text = String(value || "").trim();
  if ((!optional && !text) || text.length > maxLength) {
    throw httpError(400, `${label}${optional ? "" : " is required and"} must not exceed ${maxLength} characters`);
  }
  return text || null;
}

async function readScheduleBody(body) {
  const taskId = readId(body.task_id, "Task");
  const statusId = readId(body.status_id, "Schedule status");
  const startTime = readTime(body.start_time, "Start time");
  const endTime = readTime(body.end_time, "End time");
  if (endTime <= startTime) throw httpError(400, "Schedule end time must be after start time");

  const supabase = getSupabase();
  const [taskResult, statusResult] = await Promise.all([
    supabase.from("tasks").select("id").eq("id", taskId).single(),
    supabase.from("schedule_statuses").select("id").eq("id", statusId).eq("status", true).single(),
  ]);
  if (taskResult.error || !taskResult.data) throw httpError(400, "The selected task is unavailable");
  if (statusResult.error || !statusResult.data) throw httpError(400, "The selected schedule status is unavailable");

  return {
    task_id: taskId,
    schedule_date: readDate(body.schedule_date),
    start_time: startTime,
    end_time: endTime,
    location: readText(body.location, "Location", 160),
    status_id: statusId,
    notes: readText(body.notes, "Notes", 2000, true),
  };
}

function databaseError(error) {
  if (error?.code === "23505") return httpError(409, "This task already has a schedule");
  if (error?.code === "PGRST116") return httpError(404, "Schedule was not found");
  return error;
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("schedules").select(scheduleSelect)
      .order("schedule_date", { ascending: true }).order("start_time", { ascending: true });
    if (error) throw error;
    return res.json({ schedules: data || [] });
  } catch (error) { return next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const payload = await readScheduleBody(req.body);
    const { data, error } = await getSupabase().from("schedules").insert(payload)
      .select(scheduleSelect).single();
    if (error) throw databaseError(error);
    return res.status(201).json({ schedule: data });
  } catch (error) { return next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = await readScheduleBody(req.body);
    const { data, error } = await getSupabase().from("schedules").update(payload)
      .eq("id", readId(req.params.id, "Schedule ID")).select(scheduleSelect).single();
    if (error) throw databaseError(error);
    return res.json({ schedule: data });
  } catch (error) { return next(error); }
});

module.exports = router;
