// Generic week/date helpers for the mobile Calendar screens.
// No task/driver business logic lives here — screens map their own
// existing data (worker tasks, driver orders) into ScheduleEvent objects.

const weekdayFormatter = new Intl.DateTimeFormat('en-PH', { weekday: 'short' });
const monthFormatter = new Intl.DateTimeFormat('en-PH', { month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' });

/** Returns 00:00 of the Monday that starts the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay(); // 0 (Sun) .. 6 (Sat)
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Monday-first list of the 7 days in the week that starts on `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export function formatWeekdayLabel(date: Date): string {
  return weekdayFormatter.format(date).toUpperCase().slice(0, 3);
}

export function formatClockTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth() && weekStart.getFullYear() === weekEnd.getFullYear();
  const startLabel = `${monthFormatter.format(weekStart)} ${weekStart.getDate()}`;
  const endLabel = sameMonth ? `${weekEnd.getDate()}` : `${monthFormatter.format(weekEnd)} ${weekEnd.getDate()}`;
  return `${startLabel} – ${endLabel}, ${weekEnd.getFullYear()}`;
}
