import assert from 'node:assert/strict'
import test from 'node:test'
import { countConnectedSensors, SENSOR_ONLINE_WINDOW_MS } from '../src/lib/sensorStatus.js'

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
