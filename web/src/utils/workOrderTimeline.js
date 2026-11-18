// Build the history shown in an existing work order from stored task/order dates
// and the overdue incidents recorded for that same assignment.
export function workOrderTimeline(record, incidents, kind, formatDate, workerName = () => null) {
  const events = []
  const add = (key, at, title, detail) => {
    if (at && !Number.isNaN(new Date(at).getTime())) events.push({ key, at, title, detail })
  }

  if (kind === 'task') {
    add('created', record.created_at, 'Scheduled')
    add('started', record.started_at, 'Work started')
    add('submitted', record.completed_at, 'Work completed')
    add('approved', record.approved_at, 'Work approved')
    add('cancelled', record.cancelled_at,
      record.stopped_work_notes ? 'Task stopped by admin' : 'Task cancelled by admin',
      record.stopped_work_notes || null)
  } else {
    add('assigned', record.driver_assigned_at, 'Driver assigned')
    add('accepted', record.delivery_accepted_at, 'Delivery accepted')
    add('picked-up', record.delivery_picked_up_at, 'Order picked up')
    add('delivered', record.delivered_at || record.delivery_proof_submitted_at, 'Delivered')
  }

  for (const incident of incidents) {
    add(`overdue-${incident.id}`, incident.detected_at, 'Marked overdue',
      incident.scheduled_at ? `Original schedule: ${formatDate(incident.scheduled_at)}` : null)
    add(`reason-${incident.id}`, incident.reason_submitted_at, 'Delay reason submitted',
      incident.reason_notes || null)
    if (['reschedule', 'reassign'].includes(incident.recovery_action)) {
      const assignee = incident.recovery_action === 'reassign' ? workerName(incident.new_assignee_id) : null
      add(`recovery-${incident.id}`, incident.recovered_at,
        incident.recovery_action === 'reassign' ? 'Reassigned and rescheduled' : 'New schedule confirmed',
        [incident.new_scheduled_at ? `New schedule: ${formatDate(incident.new_scheduled_at)}` : null,
          assignee ? `Assigned to: ${assignee}` : null].filter(Boolean).join(' · '))
    } else if (kind === 'delivery' && incident.recovery_action === 'cancelled') {
      add(`cancelled-${incident.id}`, incident.recovered_at, 'Driver assignment cancelled')
    }
  }

  return events.sort((a, b) => new Date(a.at) - new Date(b.at))
}
