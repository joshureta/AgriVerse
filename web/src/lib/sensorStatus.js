// ESP32 sketches publish every 30 seconds. Allow four missed updates before
// marking a device offline.
export const SENSOR_ONLINE_WINDOW_MS = 2 * 60 * 1000

export function latestCurrentReading(readings, field, now = Date.now()) {
  return readings.reduce((latest, reading) => {
    const value = reading[field]
    if (
      value == null || !Number.isFinite(Number(value)) ||
      !Number.isFinite(reading.measuredAt) ||
      reading.measuredAt < now - SENSOR_ONLINE_WINDOW_MS ||
      reading.measuredAt > now + 30_000
    ) return latest
    return !latest || reading.measuredAt > latest.measuredAt ? reading : latest
  }, null)
}

// Older ESP32 firmware stores moisture alongside climate values; newer firmware
// writes it to soil_readings. Both can coexist while devices are upgraded.
export function latestMoistureReading(climateReadings, soilReadings, now = Date.now()) {
  const soil = latestCurrentReading(soilReadings, 'moisture_percent', now)
  const climate = latestCurrentReading(climateReadings, 'soil_moisture', now)
  if (!climate || (soil && soil.measuredAt >= climate.measuredAt)) return soil
  return { ...climate, moisture_percent: climate.soil_moisture }
}

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
