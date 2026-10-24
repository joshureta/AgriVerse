import assert from 'node:assert/strict'
import test from 'node:test'
import { countConnectedSensors, latestCurrentReading, latestMoistureReading, SENSOR_ONLINE_WINDOW_MS } from '../src/lib/sensorStatus.js'

const now = Date.parse('2026-10-10T08:00:00Z')

test('counts a device once when climate and soil readings are both recent', () => {
  const climate = [{ device_id: 'esp32-01', measuredAt: now - 30_000 }]
  const soil = [{ device_id: 'esp32-01', measuredAt: now - 45_000 }]
  assert.equal(countConnectedSensors([climate, soil], now), 1)
})

test('counts a soil-only sensor and excludes stale or invalid timestamps', () => {
  const soil = [
    { device_id: 'soil-01', measuredAt: now - 60_000 },
    { device_id: 'old-device', measuredAt: now - SENSOR_ONLINE_WINDOW_MS - 1 },
    { device_id: 'invalid-device', measuredAt: NaN },
  ]
  assert.equal(countConnectedSensors([[], soil], now), 1)
  assert.equal(countConnectedSensors([[], soil], now + SENSOR_ONLINE_WINDOW_MS), 0)
})

test('tracks each sensor independently and ignores null or stale readings', () => {
  const climate = [
    { measuredAt: now - 20_000, temperature_c: null, humidity_percent: 65 },
    { measuredAt: now - SENSOR_ONLINE_WINDOW_MS - 1, temperature_c: 28, humidity_percent: 60 },
  ]
  const soil = [{ measuredAt: now - 30_000, moisture_percent: 42 }]

  assert.equal(latestCurrentReading(climate, 'temperature_c', now), null)
  assert.equal(latestCurrentReading(climate, 'humidity_percent', now), climate[0])
  assert.equal(latestCurrentReading(soil, 'moisture_percent', now), soil[0])
  assert.equal(latestCurrentReading(soil, 'moisture_percent', now + SENSOR_ONLINE_WINDOW_MS), null)
})

test('uses embedded soil moisture when the dedicated soil table has no current reading', () => {
  const climate = [{ measuredAt: now - 30_000, soil_moisture: 43 }]
  const staleSoil = [{ measuredAt: now - SENSOR_ONLINE_WINDOW_MS - 1, moisture_percent: 80 }]
  assert.equal(latestMoistureReading(climate, staleSoil, now)?.moisture_percent, 43)
})

test('chooses the newest valid moisture reading across both firmware formats', () => {
  const climate = [{ measuredAt: now - 20_000, soil_moisture: 0 }]
  const soil = [{ measuredAt: now - 10_000, moisture_percent: 58 }]
  assert.equal(latestMoistureReading(climate, soil, now), soil[0])
  assert.equal(latestMoistureReading(climate, [], now)?.moisture_percent, 0)
})
