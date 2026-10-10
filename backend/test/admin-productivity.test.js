const assert = require("node:assert/strict");
const { test } = require("node:test");
const { productivityPeriod, summarizeProductivity } = require("../routes/admin-dashboard");

test("productivity periods use Manila dates across UTC and compare the same month-to-date span", () => {
  const period = productivityPeriod(new Date("2026-10-09T16:30:00.000Z"));
  assert.equal(period.date, "2026-10-10");
  assert.equal(period.current_start, "2026-09-30T16:00:00.000Z");
  assert.equal(period.current_end, "2026-10-10T16:00:00.000Z");
  assert.equal(period.previous_start, "2026-08-31T16:00:00.000Z");
  assert.equal(period.previous_end, "2026-09-10T16:00:00.000Z");

  const shortPreviousMonth = productivityPeriod(new Date("2026-03-30T16:30:00.000Z"));
  assert.equal(shortPreviousMonth.date, "2026-03-31");
  assert.equal(shortPreviousMonth.previous_end, "2026-02-28T16:00:00.000Z");
});

test("productivity counts approved scheduled work and distinct assigned workers", () => {
  const schedules = [
    { task: { assigned_worker_id: "a", task_status: { code: "completed" } } },
    { task: { assigned_worker_id: "a", task_status: { code: "awaiting_approval" } } },
    { task: { assigned_worker_id: "b", task_status: { code: "pending" } } },
  ];
  assert.deepEqual(summarizeProductivity(schedules, 4, 9, 6), {
    tasks: { scheduled: 3, completed: 1, awaiting_review: 1, completion_percent: 33 },
    workers: { total: 4, scheduled: 2, utilization_percent: 50 },
    comparison: { current_approved: 9, previous_approved: 6, change_percent: 50 },
  });
  assert.deepEqual(summarizeProductivity([], 0, 0, 0), {
    tasks: { scheduled: 0, completed: 0, awaiting_review: 0, completion_percent: 0 },
    workers: { total: 0, scheduled: 0, utilization_percent: 0 },
    comparison: { current_approved: 0, previous_approved: 0, change_percent: null },
  });
});
