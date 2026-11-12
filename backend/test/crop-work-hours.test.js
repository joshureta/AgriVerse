const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertCropWorkerCanWork,
  assertCropTaskSchedule,
  isCropWorkTime,
  isTaskStartLocked,
  taskStartTimeRestrictionsEnabled,
} = require("../lib/crop-work-hours");

const restrictionsEnabled = { WORKER_TASK_TIME_RESTRICTIONS_ENABLED: "true" };

function atPhilippineTime(hour, minute) {
  return new Date(Date.UTC(2026, 8, 1, hour - 8, minute));
}

test("crop work hours allow morning and afternoon work windows", () => {
  assert.equal(isCropWorkTime(atPhilippineTime(8, 0)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(11, 49)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(13, 0)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(15, 59)), true);
});

test("work-hour classification does not prevent execution at lunch or after hours", () => {
  for (const [hour, minute] of [[7, 59], [11, 50], [12, 30], [12, 59], [16, 0]]) {
    assert.equal(isCropWorkTime(atPhilippineTime(hour, minute)), false);
    assert.doesNotThrow(
      () => assertCropWorkerCanWork(
        { worker_category: "crop_management_worker" },
        atPhilippineTime(hour, minute),
        restrictionsEnabled,
      ),
    );
  }
});

test("non-crop workers are not restricted by crop work hours", () => {
  assert.doesNotThrow(() => assertCropWorkerCanWork(
    { worker_category: "seller" },
    atPhilippineTime(12, 30),
    restrictionsEnabled,
  ));
});

test("legacy time restriction flag does not block same-day tasks or execution hours", () => {
  const noon = atPhilippineTime(12, 30);
  const futureStart = atPhilippineTime(13, 0).toISOString();

  assert.equal(taskStartTimeRestrictionsEnabled({}), false);
  assert.doesNotThrow(() => assertCropWorkerCanWork({ worker_category: "crop_management_worker" }, noon, {}));
  assert.equal(isTaskStartLocked(futureStart, noon, {}), false);

  assert.equal(taskStartTimeRestrictionsEnabled(restrictionsEnabled), true);
  assert.doesNotThrow(
    () => assertCropWorkerCanWork({ worker_category: "crop_management_worker" }, noon, restrictionsEnabled),
  );
  assert.equal(isTaskStartLocked(futureStart, noon, restrictionsEnabled), false);
});

test('scheduled dates unlock at Philippine midnight, regardless of scheduled hour or flag', () => {
  const scheduled = '2026-11-13T15:00:00+08:00';
  assert.equal(isTaskStartLocked(scheduled, new Date('2026-11-12T15:59:59Z')), true);
  assert.equal(isTaskStartLocked(scheduled, new Date('2026-11-12T16:00:00Z')), false);
  assert.equal(isTaskStartLocked(scheduled, new Date('2026-11-14T00:00:00+08:00')), false);
  assert.equal(isTaskStartLocked(null), false);
  assert.equal(isTaskStartLocked('invalid'), false);
});

test("crop task schedules must stay within a single work window", () => {
  assert.doesNotThrow(() => assertCropTaskSchedule("crop_management_worker", "08:00", "11:50"));
  assert.doesNotThrow(() => assertCropTaskSchedule("crop_management_worker", "13:00", "16:00"));
  for (const [start, end] of [["07:59", "08:30"], ["11:30", "13:30"], ["12:30", "13:30"], ["15:30", "16:01"]]) {
    assert.throws(
      () => assertCropTaskSchedule("crop_management_worker", start, end),
      { code: "CROP_TASK_SCHEDULE_OUTSIDE_WORK_HOURS" },
    );
  }
});
