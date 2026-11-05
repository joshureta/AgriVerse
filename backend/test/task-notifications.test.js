const assert = require('node:assert/strict');
const { test } = require('node:test');

const { scheduleLabel } = require('../lib/task-notifications');

test('task push copy formats schedule times in Manila', () => {
  assert.match(
    scheduleLabel({ schedule_start: '2026-11-03T00:30:00.000Z' }),
    /Nov 3, 2026, 8:30 AM/,
  );
  assert.equal(scheduleLabel({ schedule_start: null }), '');
});
