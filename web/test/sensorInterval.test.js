import assert from 'node:assert/strict'
import test from 'node:test'
import { formatInterval, isValidInterval, joinInterval, onlineWindowMs, splitInterval } from '../src/lib/sensorInterval.js'
import { countConnectedSensors } from '../src/lib/sensorStatus.js'

test('splits and joins day, hour, minute, and second inputs', () => {
  assert.deepEqual(splitInterval(5430), { days: 0, hours: 1, minutes: 30, seconds: 30 })
  assert.equal(joinInterval({ days: '', hours: '1', minutes: '30', seconds: '30' }), 5430)
  assert.equal(joinInterval({ days: '1' }), 86400)
  assert.equal(joinInterval({ minutes: '-5', seconds: 'abc' }), 0)
})

test('accepts 10 seconds to 1 day only', () => {
  assert.equal(isValidInterval(10), true)
  assert.equal(isValidInterval(86400), true)
  assert.equal(isValidInterval(9), false)
  assert.equal(isValidInterval(86401), false)
})

test('formats intervals in plain words', () => {
  assert.equal(formatInterval(10), '10 seconds')
  assert.equal(formatInterval(60), '1 minute')
  assert.equal(formatInterval(5400), '1 hour 30 minutes')
  assert.equal(formatInterval(86400), '1 day')
})

test('offline window keeps 2 minutes for fast devices and grows for slow ones', () => {
  assert.equal(onlineWindowMs(10), 120_000)
  assert.equal(onlineWindowMs(900), (1800 + 60) * 1000)
  assert.equal(onlineWindowMs(5), 120_000)
})

test('a 15-minute device stays connected 10 minutes after its last reading', () => {
  const now = Date.parse('2026-10-10T08:00:00Z')
  const readings = [{ device_id: 'esp32-01', measuredAt: now - 10 * 60_000 }]
  assert.equal(countConnectedSensors([readings], now), 0)
  assert.equal(countConnectedSensors([readings], now, onlineWindowMs(900)), 1)
})
