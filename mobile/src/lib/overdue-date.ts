const manilaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function isScheduledDateOverdue(scheduledAt?: string | null, now = new Date()) {
  if (!scheduledAt) return false;
  const scheduled = new Date(scheduledAt);
  return !Number.isNaN(scheduled.getTime()) && manilaDay.format(scheduled) < manilaDay.format(now);
}
