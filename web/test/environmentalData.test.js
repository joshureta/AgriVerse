import assert from 'node:assert/strict'
import test from 'node:test'
import { loadDailySensorRows, manilaDayBounds, readingsForField } from '../src/lib/environmentalData.js'

test('uses midnight-to-midnight Manila time for the report day', () => {
  const bounds = manilaDayBounds(Date.parse('2026-10-26T16:30:00Z'))
  assert.equal(bounds.day, '2026-10-27')
  assert.equal(new Date(bounds.start).toISOString(), '2026-10-26T16:00:00.000Z')
  assert.equal(new Date(bounds.end).toISOString(), '2026-10-27T16:00:00.000Z')
})

test('loads every page of a full day even when the database caps each response', async () => {
  const rows = Array.from({ length: 2050 }, (_, index) => ({ id: String(index), created_at: '2026-10-27T01:00:00Z' }))
  const ranges = []
  const client = {
    from(table) {
      assert.equal(table, 'sensor_readings')
      const query = {
        select() { return query },
        gte(column, value) { assert.equal(column, 'created_at'); assert.equal(value, '2026-10-26T16:00:00.000Z'); return query },
        lt(column, value) { assert.equal(column, 'created_at'); assert.equal(value, '2026-10-27T16:00:00.000Z'); return query },
        order() { return query },
        range(start, end) {
          ranges.push(start)
          return Promise.resolve({ data: rows.slice(start, Math.min(end + 1, start + 500)), error: null })
        },
      }
      return query
    },
  }
  const result = await loadDailySensorRows(client, 'sensor_readings', '*', manilaDayBounds(Date.parse('2026-10-27T00:00:00Z')))
  assert.equal(result.length, 2050)
  assert.deepEqual(ranges, [0, 500, 1000, 1500, 2000, 2050])
})

test('field tabs show only readings from devices assigned to that field', () => {
  const readings = [{ device_id: 'esp32-01', field_name: 'Field A' }, { device_id: 'esp32-02', field_name: 'Field B' }, { device_id: 'esp32-01', field_name: null }]
  assert.deepEqual(readingsForField(readings, 'Field A'), [readings[0]])
  assert.deepEqual(readingsForField(readings, 'Field B'), [readings[1]])
  assert.deepEqual(readingsForField(readings, 'Field C'), [])
})
