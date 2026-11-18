export type OperationIncident = {
  id: number;
  detected_at: string;
  scheduled_at: string | null;
  reason_submitted_at: string | null;
  recovered_at: string | null;
  recovery_action: string | null;
  new_scheduled_at: string | null;
};

export function overdueTimelineEvents(incidents: OperationIncident[], formatDate: (value?: string | null) => string | null) {
  return incidents.flatMap((incident) => {
    const events = [{
      key: `overdue-${incident.id}`,
      at: incident.detected_at,
      title: 'Marked overdue',
      detail: incident.scheduled_at ? `Original schedule: ${formatDate(incident.scheduled_at)}` : null,
    }];
    if (incident.reason_submitted_at) {
      events.push({ key: `reason-${incident.id}`, at: incident.reason_submitted_at, title: 'Delay reason submitted', detail: null });
    }
    if (incident.recovered_at && ['reschedule', 'reassign'].includes(incident.recovery_action || '')) {
      events.push({
        key: `recovery-${incident.id}`,
        at: incident.recovered_at,
        title: incident.recovery_action === 'reassign' ? 'Reassigned and rescheduled' : 'New schedule confirmed',
        detail: incident.new_scheduled_at ? `New schedule: ${formatDate(incident.new_scheduled_at)}` : null,
      });
    } else if (incident.recovered_at && incident.recovery_action === 'cancelled') {
      events.push({ key: `cancelled-${incident.id}`, at: incident.recovered_at, title: 'Assignment cancelled', detail: null });
    }
    return events;
  });
}
