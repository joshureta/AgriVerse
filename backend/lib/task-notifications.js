const { insertNotifications } = require('./push-notifications');

function scheduleLabel(task) {
  if (!task.schedule_start) return '';
  const date = new Date(task.schedule_start);
  if (Number.isNaN(date.getTime())) return '';
  return ` Scheduled for ${new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Manila',
  }).format(date)}.`;
}

async function notifyTaskAssignment(task, previousWorkerId = null) {
  if (!task?.id || !task.assigned_worker_id) return;

  const reassigned = previousWorkerId && previousWorkerId !== task.assigned_worker_id;
  const rows = [{
    recipient_id: task.assigned_worker_id,
    type: reassigned ? 'task_reassigned' : 'task_assigned',
    title: reassigned ? 'Task assigned to you' : 'New task assigned',
    body: `${task.task_name || `Task #${task.id}`} has been assigned to you.${scheduleLabel(task)}`,
    entity_type: 'task',
    entity_id: task.id,
  }];

  if (reassigned) {
    rows.push({
      recipient_id: previousWorkerId,
      type: 'task_reassigned',
      title: 'Task reassigned',
      body: `${task.task_name || `Task #${task.id}`} is no longer assigned to you.`,
      entity_type: 'task',
      entity_id: task.id,
    });
  }

  await insertNotifications(rows);
}

async function notifyTaskUpdate(task) {
  if (!task?.id || !task.assigned_worker_id) return;
  await insertNotifications({
    recipient_id: task.assigned_worker_id,
    type: 'task_reassigned',
    title: 'Task details updated',
    body: `${task.task_name || `Task #${task.id}`} was updated.${scheduleLabel(task)}`,
    entity_type: 'task',
    entity_id: task.id,
  });
}

async function notifyTaskCancellation(task) {
  if (!task?.id || !task.assigned_worker_id) return;
  await insertNotifications({
    recipient_id: task.assigned_worker_id,
    type: 'task_cancelled',
    title: 'Task cancelled',
    body: `${task.task_name || `Task #${task.id}`} was cancelled by an administrator.`,
    entity_type: 'task',
    entity_id: task.id,
  });
}

module.exports = { notifyTaskAssignment, notifyTaskCancellation, notifyTaskUpdate, scheduleLabel };
