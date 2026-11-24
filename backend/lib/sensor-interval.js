// Limits for how often an ESP32 reads and sends data. Keep in sync with
// migration 067 and web/src/lib/sensorInterval.js.
const MIN_INTERVAL_SECONDS = 10;
const MAX_INTERVAL_SECONDS = 86400;
const DEFAULT_INTERVAL_SECONDS = 10;

// Returns the interval in whole seconds, or null when it is out of range.
function parseIntervalSeconds(value) {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < MIN_INTERVAL_SECONDS || value > MAX_INTERVAL_SECONDS) return null;
  return value;
}

module.exports = {
  DEFAULT_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  parseIntervalSeconds,
};
