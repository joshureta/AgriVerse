// ESP32 sketches publish every 30 seconds. Allow four missed updates before
// marking a device offline.
export const SENSOR_ONLINE_WINDOW_MS = 2 * 60 * 1000

export function countConnectedSensors(readingGroups, now = Date.now()) {
  const recentDeviceIds = new Set()

  for (const readings of readingGroups) {
    for (const reading of readings) {
      if (
        typeof reading.device_id === 'string' &&
        reading.device_id.trim() &&
        Number.isFinite(reading.measuredAt) &&
        reading.measuredAt >= now - SENSOR_ONLINE_WINDOW_MS &&
        reading.measuredAt <= now + 30_000
      ) {
        recentDeviceIds.add(reading.device_id)
      }
    }
  }

  return recentDeviceIds.size
}
