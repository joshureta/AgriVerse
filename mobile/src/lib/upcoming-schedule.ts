const MS_PER_DAY = 86400000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function describeUpcoming(scheduledAt: string) {
  const date = new Date(scheduledAt);
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
  return {
    month: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date).toUpperCase(),
    day: String(date.getDate()),
    weekday: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date),
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
    countdown: days <= 0 ? 'Today' : days === 1 ? '1 day left' : `${days} days left`,
  };
}
