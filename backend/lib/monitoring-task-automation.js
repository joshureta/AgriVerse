const { getSupabase } = require("../supabase");
const { notifyTaskAssignment } = require("./task-notifications");

// Sensor readings are checked by the database rules in monitoring_task_rules
// (migration 073). This module handles crop assessments, queued retries, and
// the assignment notifications for every automatic task.
const RECENT_MS = 10 * 60 * 1000;

function cropFinding(record) {
  const ratings = record?.factor_scores?.ratings;
  if (!ratings || typeof ratings !== "object") return null;
  const hasIssue = (rating) => {
    if (typeof rating === "string") return !["none", "unknown"].includes(rating.toLowerCase());
    const status = String(rating?.status || "").toUpperCase();
    if (["ISSUE SUSPECTED", "ISSUE DETECTED"].includes(status)) return true;
    const severity = String(rating?.severity || "").toLowerCase();
    return ["mild", "moderate", "severe", "extensive", "low", "high"].includes(severity);
  };
  const pest = hasIssue(ratings.pest);
  const disease = hasIssue(ratings.disease);
  const nutrient = hasIssue(ratings.nutrient);
  const condition = hasIssue(ratings.cropCondition);
  if (pest || disease) {
    const concerns = [pest && "possible pests", disease && "possible disease", nutrient && "possible nutrient stress"]
      .filter(Boolean).join(", ");
    return { kind: "pest_disease",
      evidence: `Crop Health Monitoring found ${concerns}. Inspect affected and nearby pineapple plants, record observations and photos, and confirm the cause before treatment.` };
  }
  if (nutrient || condition) {
    return { kind: "crop_check",
      evidence: `Crop Health Monitoring found ${nutrient ? "possible nutrient-related symptoms" : "a crop condition concern"}. Inspect the field and record symptoms and photos before changing fertilizer use.` };
  }
  return null;
}

async function notifyNewTask(taskId) {
  const { data: task, error } = await getSupabase().from("tasks")
    .select("id, assigned_worker_id, task_name, schedules(schedule_date,start_time)")
    .eq("id", taskId).single();
  if (error) throw error;
  const schedule = Array.isArray(task.schedules) ? task.schedules[0] : task.schedules;
  await notifyTaskAssignment({ ...task,
    schedule_start: schedule ? `${schedule.schedule_date}T${String(schedule.start_time).slice(0, 8)}+08:00` : null });
}

// Claims the finding first, so the request path and the minute loop never notify twice.
async function notifyFinding(findingId, taskId) {
  const { data, error } = await getSupabase().from("monitoring_task_findings")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", findingId).eq("status", "assigned").is("notified_at", null).select("id");
  if (error) throw error;
  if (!data?.length) return;
  try { await notifyNewTask(taskId); }
  catch (notificationError) { console.error("Automatic task notification failed:", notificationError); }
}

async function recordFinding({ eventKey, field, source, kind, evidence, observedAt }) {
  const { data: result, error } = await getSupabase().rpc("record_monitoring_task_finding", {
    p_event_key: eventKey, p_field_name: field, p_source: source, p_kind: kind,
    p_evidence: evidence, p_observed_at: observedAt,
  });
  if (error) throw error;
  if (result?.status === "assigned" && result.finding_id && result.task_id) {
    await notifyFinding(result.finding_id, result.task_id);
  }
  return result;
}

async function fromCropInspection(record, now = Date.now()) {
  const field = record?.field_name;
  const observed = Date.parse(record?.created_at);
  if (!field || !Number.isFinite(observed) || observed < now - RECENT_MS || observed > now + 60_000) return null;
  const finding = cropFinding(record);
  if (!finding) return null;
  return recordFinding({ eventKey: `crop:${record.id || `${field}:${record.created_at}`}:${finding.kind}`,
    field, source: "crop_health", ...finding, observedAt: record.created_at });
}

// Announces tasks created by the database reading rules (and any missed earlier).
async function notifyAssignedFindings() {
  const { data, error } = await getSupabase().from("monitoring_task_findings")
    .select("id, task_id").eq("status", "assigned").is("notified_at", null)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at").limit(100);
  if (error) throw error;
  for (const finding of data || []) {
    try { await notifyFinding(finding.id, finding.task_id); }
    catch (notifyError) { console.error("Automatic task notification failed:", notifyError); }
  }
}

async function retryQueuedFindings() {
  const db = getSupabase();
  const { data: findings, error } = await db.from("monitoring_task_findings")
    .select("event_key, source, kind, evidence, observed_at, field:farm_fields!monitoring_task_findings_field_id_fkey(field_name)")
    .eq("status", "queued").order("created_at").limit(100);
  if (error) throw error;
  for (const finding of findings || []) {
    try {
      await recordFinding({ eventKey: finding.event_key, field: finding.field?.field_name,
        source: finding.source, kind: finding.kind, evidence: finding.evidence, observedAt: finding.observed_at });
    } catch (retryError) { console.error("Queued monitoring task retry failed:", retryError); }
  }
}

module.exports = { cropFinding, fromCropInspection, notifyAssignedFindings, retryQueuedFindings };
