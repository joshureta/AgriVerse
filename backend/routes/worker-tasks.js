const express = require("express");
const {
  requireAuth,
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
  requireRole,
} = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { assertCropWorkerCanWork } = require("../lib/crop-work-hours");

const router = express.Router();
const statuses = new Set(["pending", "in_progress", "awaiting_approval", "completed"]);
const taskSelect = [
  "id, task_name, assigned_worker_id, description, estimated_duration_minutes, started_at, completed_at, completion_notes, created_at, updated_at",
  "harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count",
  "harvest_rejection_reason, harvest_rejected_at, approved_at, harvest_proof_image_url",
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

function readHarvestCount(value, label) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) throw httpError(400, `${label} must be a whole number 0 or greater`);
  return count;
}

function readHarvestCounts(body) {
  return {
    harvest_small_count: readHarvestCount(body.harvest_small_count, "Small count"),
    harvest_medium_count: readHarvestCount(body.harvest_medium_count, "Medium count"),
    harvest_large_count: readHarvestCount(body.harvest_large_count, "Large count"),
    harvest_damaged_count: readHarvestCount(body.harvest_damaged_count, "Damaged/rejected count"),
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
    // Tasks awaiting admin approval have nothing left for the worker to do, so they're
    // folded into the "completed" bucket here (the UI badges them differently by status code).
    const completedStatusIds = [statusIds.completed, statusIds.awaiting_approval];
    const supabase = getSupabase();
    let query = supabase.from("tasks").select(taskSelect)
      .eq("assigned_worker_id", req.user.id).order("created_at", { ascending: false });
    if (status === "completed") query = query.in("status_id", completedStatusIds);
    else if (status) query = query.eq("status_id", statusIds[status]);

    const [taskResult, pendingResult, activeResult, completedResult] = await Promise.all([
      query,
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).eq("status_id", statusIds.pending),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).eq("status_id", statusIds.in_progress),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_worker_id", req.user.id).in("status_id", completedStatusIds),
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

async function uploadCropImage(base64Data, mimeType, fieldName) {
  try {
    const supabase = getSupabase();
    const buffer = Buffer.from(base64Data, "base64");
    const ext = (mimeType || "image/png").split("/")[1] || "png";
    const cleanField = (fieldName || "field").toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filePath = `${cleanField}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("crop-inspections")
      .upload(filePath, buffer, {
        contentType: mimeType || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.warn("Supabase storage upload error:", uploadError.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from("crop-inspections")
      .getPublicUrl(filePath);

    return {
      imageUrl: publicData?.publicUrl || null,
      storagePath: filePath,
    };
  } catch (err) {
    console.warn("Storage upload exception:", err.message);
    return null;
  }
}

router.post("/:id/complete", async (req, res, next) => {
  try {
    assertCropWorkerCanWork(req.profile);
    const taskId = readTaskId(req.params.id);
    const completedAt = new Date(req.body.completed_at);
    if (Number.isNaN(completedAt.getTime())) throw httpError(400, "A valid finish time is required");
    if (completedAt.getTime() > Date.now() + 5 * 60 * 1000) throw httpError(400, "Finish time cannot be in the future");
    const completionNotes = String(req.body.completion_notes || "").trim();
    if (completionNotes.length > 2000) throw httpError(400, "Insights must not exceed 2000 characters");

    const { data: existingTask, error: existingTaskError } = await getSupabase().from("tasks")
      .select("id, field_id, category:task_categories!tasks_category_id_fkey(category_name), field:farm_fields!tasks_field_id_fkey(field_name)")
      .eq("id", taskId).eq("assigned_worker_id", req.user.id).maybeSingle();
    if (existingTaskError) throw existingTaskError;
    if (!existingTask) throw httpError(404, "Assigned task was not found");
    const categoryName = existingTask.category?.category_name || "Crop";
    const fieldName = existingTask.field?.field_name || "Field A";
    const isHarvestingTask = categoryName === "Harvesting";
    const harvestCounts = isHarvestingTask ? readHarvestCounts(req.body) : {};

    const rawImage = req.body.image || req.body.photo;
    const hasPhoto = Boolean(rawImage && typeof rawImage === "string");
    if (isHarvestingTask && !hasPhoto) {
      throw httpError(400, "A photo of the completed harvest is required to submit for approval");
    }

    let uploadResult = null;
    let mimeType = "image/jpeg";
    let imageName = `Task ${taskId} Proof Photo`;
    if (hasPhoto) {
      mimeType = String(req.body.image_mime || req.body.imageMime || "image/jpeg");
      imageName = String(req.body.image_name || req.body.imageName || imageName);
      const base64Data = rawImage.replace(/^data:[^;]+;base64,/, "").trim();
      uploadResult = await uploadCropImage(base64Data, mimeType, fieldName);
    }

    const statusIds = await getStatusIds();
    const updatePayload = {
      status_id: isHarvestingTask ? statusIds.awaiting_approval : statusIds.completed,
      completed_at: completedAt.toISOString(),
      completion_notes: completionNotes || null,
      ...harvestCounts,
    };
    if (isHarvestingTask) {
      updatePayload.harvest_proof_image_url = uploadResult?.imageUrl || null;
      updatePayload.harvest_proof_image_storage_path = uploadResult?.storagePath || null;
      updatePayload.harvest_proof_image_name = imageName;
      updatePayload.harvest_proof_image_mime = mimeType;
      updatePayload.harvest_rejection_reason = null;
      updatePayload.harvest_rejected_at = null;
    }

    const { data, error } = await getSupabase().from("tasks").update(updatePayload)
      .eq("id", taskId).eq("assigned_worker_id", req.user.id)
      .eq("status_id", statusIds.in_progress).select(taskSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Only an active assigned task can be completed");
    await syncScheduleStatus(taskId, isHarvestingTask ? "in_progress" : "completed");

    // Harvesting tasks aren't really done until admin approves, so the crop-health
    // record (and its "Completed" status) is created at approval time instead.
    let inspectionRecord = null;
    if (!isHarvestingTask && hasPhoto) {
      const { data: insData, error: insErr } = await getSupabase()
        .from("crop_health_inspections")
        .insert({
          field_name: fieldName,
          field_id: existingTask.field_id || null,
          crop_type: "Pineapple",
          health_score: 85,
          health_status: "Completed",
          disease_or_issue_name: `${categoryName} Task Completed`,
          visual_summary: completionNotes || `Task ${taskId} (${categoryName}) completed with photo proof.`,
          identified_symptoms: [],
          action_recommendations: [],
          image_url: uploadResult?.imageUrl || null,
          image_storage_path: uploadResult?.storagePath || null,
          image_name: imageName,
          image_mime_type: mimeType,
          status: "COMPLETED",
          analyzed_by: req.user.id,
        })
        .select()
        .maybeSingle();

      if (!insErr && insData) {
        inspectionRecord = insData;
      }
    }

    return res.json({ task: serializeTask(data), inspection: inspectionRecord });
  } catch (error) { return next(error); }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const status = String(req.body.status || "").trim();
    if (!statuses.has(status)) throw httpError(400, "Invalid task status");
    const taskId = readTaskId(req.params.id);
    const statusIds = await getStatusIds();
    const { data: currentTask, error: readError } = await getSupabase().from("tasks")
      .select("id, status_id, task_status:task_statuses(code), category:task_categories!tasks_category_id_fkey(category_name)")
      .eq("id", taskId).eq("assigned_worker_id", req.user.id).maybeSingle();
    if (readError) throw readError;
    if (!currentTask) throw httpError(404, "Assigned task was not found");

    const currentStatus = currentTask.task_status?.code;
    const expectedStatus = currentStatus === "pending" ? "in_progress"
      : currentStatus === "in_progress" ? "completed" : null;
    if (status !== expectedStatus) throw httpError(409, `Task cannot move from ${currentStatus} to ${status}`);
    if (status === "completed" && currentTask.category?.category_name === "Harvesting") {
      throw httpError(409, "Harvesting tasks must be submitted with harvest counts and a photo for admin approval");
    }
    assertCropWorkerCanWork(req.profile);

    const updatePayload = { status_id: statusIds[status] };
    if (status === "in_progress") {
      updatePayload.started_at = new Date().toISOString();
    }

    const { data, error } = await getSupabase().from("tasks")
      .update(updatePayload).eq("id", taskId)
      .eq("assigned_worker_id", req.user.id).eq("status_id", currentTask.status_id)
      .select(taskSelect).maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Task status changed before this request completed");
    await syncScheduleStatus(taskId, status);
    return res.json({ task: serializeTask(data) });
  } catch (error) { return next(error); }
});

module.exports = router;
