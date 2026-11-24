// Limits for how often an ESP32 reads and sends data. Keep in sync with
// backend/lib/sensor-interval.js and migration 067.
export const MIN_INTERVAL_SECONDS = 10
export const MAX_INTERVAL_SECONDS = 86400
export const DEFAULT_INTERVAL_SECONDS = 10

export const INTERVAL_PRESETS = [
  { label: '10 sec', seconds: 10 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
  { label: '30 min', seconds: 1800 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
]

const UNITS = [
  { key: 'days', name: 'day', seconds: 86400 },
  { key: 'hours', name: 'hour', seconds: 3600 },
  { key: 'minutes', name: 'minute', seconds: 60 },
  { key: 'seconds', name: 'second', seconds: 1 },
]

// Splits seconds into { days, hours, minutes, seconds }.
export function splitInterval(totalSeconds) {
  let rest = Math.max(0, Math.floor(totalSeconds))
  return Object.fromEntries(UNITS.map(({ key, seconds }) => {
    const value = Math.floor(rest / seconds)
    rest -= value * seconds
    return [key, value]
  }))
}

// Combines day/hour/minute/second inputs; blank boxes count as zero.
export function joinInterval(parts) {
  return UNITS.reduce((total, { key, seconds }) => {
    const value = Number(parts[key] || 0)
    return total + (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0) * seconds
  }, 0)
}

export function isValidInterval(seconds) {
  return Number.isInteger(seconds) && seconds >= MIN_INTERVAL_SECONDS && seconds <= MAX_INTERVAL_SECONDS
}

// "1 hour 30 minutes", "10 seconds".
export function formatInterval(totalSeconds) {
  const parts = splitInterval(totalSeconds)
  const words = UNITS.filter(({ key }) => parts[key])
    .map(({ key, name }) => `${parts[key]} ${name}${parts[key] === 1 ? '' : 's'}`)
  return words.join(' ') || '0 seconds'
}

// How long a device may go quiet before it counts as offline: two missed
// readings plus a minute of network slack, and never less than 2 minutes.
export function onlineWindowMs(intervalSeconds = DEFAULT_INTERVAL_SECONDS) {
  const interval = isValidInterval(intervalSeconds) ? intervalSeconds : DEFAULT_INTERVAL_SECONDS
  return Math.max(2 * 60 * 1000, (2 * interval + 60) * 1000)
}
