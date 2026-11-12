const { httpError } = require("./http-error");

const ACTIVE_DELIVERY_ASSIGNMENT_STATUSES = ["assigned", "accepted", "picked_up", "out_for_delivery"];
const ACTIVE_DELIVERY_ORDER_STATUSES = ["ready_for_delivery", "out_for_delivery"];
const WORKER_CONFLICT_MESSAGE = "The selected worker already has a task during this time. Choose a different worker or schedule.";
const DRIVER_CONFLICT_MESSAGE = "The selected driver already has a delivery during this time. Choose a different driver or schedule.";

function scheduleConflict(message) {
  const error = httpError(409, message);
  error.code = "SCHEDULE_CONFLICT";
  return error;
}

// Schedule windows are half-open: a window ending at 10:00 does not conflict
// with another one beginning at 10:00.
function rangesOverlap(firstStart, firstEnd, secondStart, secondEnd) {
  return firstStart < secondEnd && firstEnd > secondStart;
}

async function assertWorkerScheduleAvailable(supabase, {
  workerId,
  scheduleDate,
  startTime,
  endTime,
  excludeTaskId = null,
}) {
  let query = supabase.from("schedules")
    .select([
      "id, task_id, start_time, end_time",
      "task:tasks!inner(assigned_worker_id)",
      "schedule_status:schedule_statuses!inner(code)",
    ].join(","))
    .eq("schedule_date", scheduleDate)
    .eq("task.assigned_worker_id", workerId)
    .neq("schedule_status.code", "cancelled")
    .lt("start_time", endTime)
    .gt("end_time", startTime);

  if (excludeTaskId !== null && excludeTaskId !== undefined) {
    query = query.neq("task_id", excludeTaskId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (data?.length) throw scheduleConflict(WORKER_CONFLICT_MESSAGE);
}

async function assertDriverScheduleAvailable(supabase, {
  driverId,
  start,
  end,
  excludeOrderId = null,
}) {
  let query = supabase.from("buyer_orders")
    .select("id, order_number, delivery_scheduled_at, delivery_window_end_at")
    .eq("assigned_driver_id", driverId)
    .in("delivery_assignment_status", ACTIVE_DELIVERY_ASSIGNMENT_STATUSES)
    .in("order_status", ACTIVE_DELIVERY_ORDER_STATUSES)
    .lt("delivery_scheduled_at", end)
    .gt("delivery_window_end_at", start);

  if (excludeOrderId !== null && excludeOrderId !== undefined) {
    query = query.neq("id", excludeOrderId);
  }

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (data?.length) throw scheduleConflict(DRIVER_CONFLICT_MESSAGE);
}

function mapScheduleConflictDatabaseError(error) {
  const message = String(error?.message || "");
  if (error?.code !== "P0001") return error;
  if (message.includes("worker_schedule_conflict")) return scheduleConflict(WORKER_CONFLICT_MESSAGE);
  if (message.includes("driver_schedule_conflict")) return scheduleConflict(DRIVER_CONFLICT_MESSAGE);
  return error;
}

module.exports = {
  ACTIVE_DELIVERY_ASSIGNMENT_STATUSES,
  ACTIVE_DELIVERY_ORDER_STATUSES,
  DRIVER_CONFLICT_MESSAGE,
  WORKER_CONFLICT_MESSAGE,
  assertDriverScheduleAvailable,
  assertWorkerScheduleAvailable,
  mapScheduleConflictDatabaseError,
  rangesOverlap,
};
