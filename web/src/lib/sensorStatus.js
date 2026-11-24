import { onlineWindowMs } from './sensorInterval.js'

// Allow short network interruptions before marking a device offline. Pages
// that know the device's send interval pass a wider window from onlineWindowMs.
export const SENSOR_ONLINE_WINDOW_MS = onlineWindowMs()

export function latestCurrentReading(readings, field, now = Date.now(), windowMs = SENSOR_ONLINE_WINDOW_MS) {
  return readings.reduce((latest, reading) => {
    const value = reading[field]
    if (
      value == null || !Number.isFinite(Number(value)) ||
      !Number.isFinite(reading.measuredAt) ||
      reading.measuredAt < now - windowMs ||
      reading.measuredAt > now + 30_000
    ) return latest
    return !latest || reading.measuredAt > latest.measuredAt ? reading : latest
  }, null)
}

// Older ESP32 firmware stores moisture alongside climate values; newer firmware
// writes it to soil_readings. Both can coexist while devices are upgraded.
export function latestMoistureReading(climateReadings, soilReadings, now = Date.now(), windowMs = SENSOR_ONLINE_WINDOW_MS) {
  const soil = latestCurrentReading(soilReadings, 'moisture_percent', now, windowMs)
  const climate = latestCurrentReading(climateReadings, 'soil_moisture', now, windowMs)
  if (!climate || (soil && soil.measuredAt >= climate.measuredAt)) return soil
  return { ...climate, moisture_percent: climate.soil_moisture }
}

export function countConnectedSensors(readingGroups, now = Date.now(), windowMs = SENSOR_ONLINE_WINDOW_MS) {
  const recentDeviceIds = new Set()

  for (const readings of readingGroups) {
    for (const reading of readings) {
      if (
        typeof reading.device_id === 'string' &&
        reading.device_id.trim() &&
        Number.isFinite(reading.measuredAt) &&
        reading.measuredAt >= now - windowMs &&
        reading.measuredAt <= now + 30_000
      ) {
        recentDeviceIds.add(reading.device_id)
      }
    }
  }

  return recentDeviceIds.size
}
