const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { assertCropTaskSchedule } = require("../lib/crop-work-hours");
const { ACTIVITY_TYPES, readActivityType } = require("../lib/task-details");
const { httpError } = require("../lib/http-error");

const router = express.Router();
const taskSelect = [
  "id, task_name, description, estimated_duration_minutes, created_at, updated_at",
  "assigned_worker_id, category_id, field_id, priority_id, status_id",
  "started_at, completed_at, completion_notes, activity_type",
  "harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count",
  "harvest_proof_image_url, harvest_proof_image_name",
  "harvest_rejection_reason, harvest_rejected_at, approved_at",
  "completion_proof_image_url, details, inventory_quantity",
  "inventory_item:inventory_items!tasks_inventory_item_id_fkey(id, item_name, unit:measurement_units!inventory_items_unit_id_fkey(abbreviation))",
  "assigned_worker:profiles!tasks_assigned_worker_id_fkey(id, full_name, worker_category)",
  "category:task_categories!tasks_category_id_fkey(id, category_name, status)",
  "field:farm_fields!tasks_field_id_fkey(id, field_name, status)",
  "priority:task_priorities!tasks_priority_id_fkey(id, priority_name, code, status)",
  "task_status:task_statuses!tasks_status_id_fkey(id, status_name, code, status)",
  "schedules(id, schedule_date, start_time, end_time, location, notes, status_id, schedule_status:schedule_statuses!schedules_status_id_fkey(id, status_name, code, status))",
].join(",");

router.use(requireAuth, requireRole("admin"));

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
  const { data, error } = await getSupabase().from("profiles").select("id, worker_category")
    .eq("id", workerId).eq("role", "farm_worker").single();
  if (error || !data) throw httpError(400, "The selected user is not an available farm worker");
  if (["driver", "seller"].includes(data.worker_category)) throw httpError(400, "Drivers and sellers cannot be assigned farm tasks");
  return data;
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
  if (category.category_name === "Harvesting" && ["completed", "awaiting_approval"].includes(taskStatus.code)) {
    throw httpError(400, "Harvesting tasks can only be completed through the harvest review flow (Approve/Reject), not edited directly.");
  }
  const worker = await ensureFarmWorker(assignedWorkerId);

  const scheduleDate = readDate(body.schedule_date);
  const startTime = readTime(body.start_time, "Start time");
  const endTime = body.end_time ? readTime(body.end_time, "End time") : addMinutes(startTime, duration);
  if (endTime <= startTime) throw httpError(400, "Schedule end time must be after start time");
  if (startTime < "07:00:00" || endTime > "18:00:00") throw httpError(400, "Tasks must be scheduled between 7:00 AM and 6:00 PM");
  assertCropTaskSchedule(worker.worker_category, startTime, endTime);

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
      activity_type: readActivityType(category.category_name, body.activity_type),
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
      supabase.from("profiles").select("id, full_name, worker_category").eq("role", "farm_worker").neq("worker_category", "seller").order("full_name"),
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
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 10, 1), 50);
    const statusCode = String(req.query.status || "").trim();
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const from = (page - 1) * pageSize;
    const supabase = getSupabase();
    let statusId = null;
    if (statusCode) statusId = await lookupIdByCode("task_statuses", statusCode);

    // Latest schedule first. The schedule lives on a related table, so sort the
    // full (small) result set here and page it afterwards.
    let query = supabase.from("tasks").select(taskSelect, { count: "exact" })
      .order("created_at", { ascending: false });
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
    const scheduleTime = (task) => (task.schedule_start ? new Date(task.schedule_start).getTime() : Number.NEGATIVE_INFINITY);
    const sortedTasks = (taskResult.data || []).map(serializeTask)
      .sort((a, b) => scheduleTime(b) - scheduleTime(a))
      .slice(from, from + pageSize);
    return res.json({
      tasks: sortedTasks,
      summary: { total: totalResult.count || 0, inProgress: progressResult.count || 0, completed: completedResult.count || 0, availableWorkers: workersResult.count || 0 },
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) {
    return next(error);
  }
});

// Completed tasks for the Records page, filtered, sorted, and paged in the database.
router.get("/records", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 10, 1), 200);
    const from = (page - 1) * pageSize;
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const activityType = String(req.query.activity_type || "").trim();
    if (activityType && !ACTIVITY_TYPES.includes(activityType)) throw httpError(400, "Invalid activity type");
    const supabase = getSupabase();
    const completedId = await lookupIdByCode("task_statuses", "completed");
    const categoryId = req.query.category_id ? readId(req.query.category_id, "Category") : null;
    let matchFilter = null;

    if (search) {
      // Field, worker, and category names live on other tables, so resolve matching ids first.
      const pattern = `%${search}%`;
      const [fields, workers, categories] = await Promise.all([
        supabase.from("farm_fields").select("id").ilike("field_name", pattern),
        supabase.from("profiles").select("id").eq("role", "farm_worker").ilike("full_name", pattern),
        supabase.from("task_categories").select("id").ilike("category_name", pattern),
      ]);
      for (const result of [fields, workers, categories]) if (result.error) throw result.error;
      const clauses = [["field_id", fields.data], ["assigned_worker_id", workers.data], ["category_id", categories.data]]
        .filter(([, rows]) => rows.length)
        .map(([column, rows]) => `${column}.in.(${rows.map((row) => row.id).join(",")})`);
      if (!clauses.length) return res.json({ tasks: [], pagination: { page, pageSize, total: 0, totalPages: 1 } });
      matchFilter = clauses.join(",");
    }

    const buildQuery = () => {
      let query = supabase.from("tasks").select(taskSelect, { count: "exact" }).eq("status_id", completedId);
      if (categoryId) query = query.eq("category_id", categoryId);
      if (activityType) query = query.eq("activity_type", activityType);
      if (matchFilter) query = query.or(matchFilter);
      return query;
    };
    let { data, count, error } = await buildQuery()
      .order("completed_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);
    // A page past the end is not an error. Report the total so the caller can step back.
    if (error?.code === "PGRST103") {
      ({ count, error } = await buildQuery().range(0, 0));
      data = [];
    }
    if (error) throw error;
    const total = count || 0;
    return res.json({
      tasks: (data || []).map(serializeTask),
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) { return next(error); }
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
    const { data: current, error: currentError } = await getSupabase().from("tasks")
      .select("category_id, activity_type, inventory_item_id, task_status:task_statuses!tasks_status_id_fkey(code)")
      .eq("id", id).maybeSingle();
    if (currentError) throwDatabaseError(currentError);
    if (!current) throw httpError(404, "Task was not found");
    if (current.task_status?.code !== "pending" && current.activity_type !== payload.task.activity_type) {
      throw httpError(400, "The activity cannot be changed after the task has started.");
    }
    if (current.inventory_item_id && current.category_id !== payload.task.category_id) {
      throw httpError(400, "The category cannot be changed after supplies were taken for this task.");
    }
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

async function syncScheduleStatus(taskId, code) {
  const statusId = await lookupIdByCode("schedule_statuses", code);
  const { error } = await getSupabase().from("schedules").update({ status_id: statusId }).eq("task_id", taskId);
  if (error) throw error;
}

function readHarvestCount(value, label) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) throw httpError(400, `${label} must be a whole number 0 or greater`);
  return count;
}

function readHarvestCounts(body) {
  return {
    small: readHarvestCount(body.harvest_small_count, "Small count"),
    medium: readHarvestCount(body.harvest_medium_count, "Medium count"),
    large: readHarvestCount(body.harvest_large_count, "Large count"),
    damaged: readHarvestCount(body.harvest_damaged_count, "Damaged/rejected count"),
  };
}

function readRejectionReason(value) {
  const reason = String(value || "").trim();
  if (!reason || reason.length > 1000) throw httpError(400, "A rejection reason is required and must not exceed 1000 characters");
  return reason;
}

router.get("/harvest-approvals/count", async (req, res, next) => {
  try {
    const awaitingId = await lookupIdByCode("task_statuses", "awaiting_approval");
    const { count, error } = await getSupabase().from("tasks")
      .select("id", { count: "exact", head: true }).eq("status_id", awaitingId);
    if (error) throw error;
    return res.json({ count: count || 0 });
  } catch (error) { return next(error); }
});

router.post("/:id/approve-harvest", async (req, res, next) => {
  try {
    const id = readTaskId(req.params.id);
    const counts = readHarvestCounts(req.body);
    const { error } = await getSupabase().rpc("approve_harvest_task", {
      p_task_id: id,
      p_admin_id: req.user.id,
      p_small_count: counts.small,
      p_medium_count: counts.medium,
      p_large_count: counts.large,
      p_damaged_count: counts.damaged,
    });
    if (error) {
      if (/not awaiting approval|not a harvesting task|not found/i.test(error.message || "")) {
        throw httpError(409, error.message);
      }
      throw error;
    }
    await syncScheduleStatus(id, "completed");
    return res.json({ task: await fetchTask(id) });
  } catch (error) { return next(error); }
});

// Approves any task except Harvesting, which has its own route because the admin can correct the
// counts and approving adds them to inventory. Approving completes the task, so it now appears in Records.
router.post("/:id/approve", async (req, res, next) => {
  try {
    const id = readTaskId(req.params.id);
    const { data: task, error: readError } = await getSupabase().from("tasks")
      .select("id, field_id, assigned_worker_id, completion_notes, completion_proof_image_url, completion_proof_image_storage_path, category:task_categories!tasks_category_id_fkey(category_name), field:farm_fields!tasks_field_id_fkey(field_name), task_status:task_statuses!tasks_status_id_fkey(code)")
      .eq("id", id).maybeSingle();
    if (readError) throwDatabaseError(readError);
    if (!task) throw httpError(404, "Task was not found");
    if (task.task_status?.code !== "awaiting_approval") throw httpError(409, "Task is not awaiting approval");
    if (task.category?.category_name === "Harvesting") {
      throw httpError(400, "Harvesting tasks are approved from the harvest report, where the counts can be checked");
    }
    const awaitingId = await lookupIdByCode("task_statuses", "awaiting_approval");
    const completedId = await lookupIdByCode("task_statuses", "completed");
    const { data, error } = await getSupabase().from("tasks").update({
      status_id: completedId,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    }).eq("id", id).eq("status_id", awaitingId).select("id").maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) throw httpError(409, "Task is not awaiting approval");
    await syncScheduleStatus(id, "completed");
    await recordApprovedTaskPhoto(task);
    return res.json({ task: await fetchTask(id) });
  } catch (error) { return next(error); }
});

// The photo of an approved task feeds the crop-health page. Failing here must not undo the approval.
async function recordApprovedTaskPhoto(task) {
  if (!task.completion_proof_image_url) return;
  const categoryName = task.category?.category_name || "Crop";
  const { error } = await getSupabase().from("crop_health_inspections").insert({
    field_name: task.field?.field_name || "Field A",
    field_id: task.field_id || null,
    crop_type: "Pineapple",
    health_score: 85,
    health_status: "Completed",
    disease_or_issue_name: `${categoryName} Task Completed`,
    visual_summary: task.completion_notes || `Task ${task.id} (${categoryName}) completed with photo proof.`,
    identified_symptoms: [],
    action_recommendations: [],
    image_url: task.completion_proof_image_url,
    image_storage_path: task.completion_proof_image_storage_path || null,
    image_name: `Task ${task.id} Proof Photo`,
    image_mime_type: /\.png(\?|$)/i.test(task.completion_proof_image_url) ? "image/png" : "image/jpeg",
    status: "COMPLETED",
    analyzed_by: task.assigned_worker_id,
  });
  if (error) console.warn("Could not record the approved task in crop health:", error.message);
}

// Sends any task awaiting approval back to the worker with a reason. Works for every category.
async function rejectTask(req, res, next) {
  try {
    const id = readTaskId(req.params.id);
    const reason = readRejectionReason(req.body.reason);
    const awaitingId = await lookupIdByCode("task_statuses", "awaiting_approval");
    const inProgressId = await lookupIdByCode("task_statuses", "in_progress");
    const { data, error } = await getSupabase().from("tasks").update({
      status_id: inProgressId,
      harvest_rejection_reason: reason,
      harvest_rejected_at: new Date().toISOString(),
    }).eq("id", id).eq("status_id", awaitingId).select("id").maybeSingle();
    if (error) throwDatabaseError(error);
    if (!data) throw httpError(409, "Task is not awaiting approval");
    return res.json({ task: await fetchTask(id) });
  } catch (error) { return next(error); }
}

router.post("/:id/reject", rejectTask);
router.post("/:id/reject-harvest", rejectTask);

module.exports = router;
