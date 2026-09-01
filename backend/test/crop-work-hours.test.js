const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  assertCropWorkerCanWork,
  assertCropTaskSchedule,
  isCropWorkTime,
} = require("../lib/crop-work-hours");

function atPhilippineTime(hour, minute) {
  return new Date(Date.UTC(2026, 8, 1, hour - 8, minute));
}

test("crop work hours allow morning and afternoon work windows", () => {
  assert.equal(isCropWorkTime(atPhilippineTime(8, 0)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(11, 49)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(13, 0)), true);
  assert.equal(isCropWorkTime(atPhilippineTime(15, 59)), true);
});

test("crop work hours block lunch and after-hours work", () => {
  for (const [hour, minute] of [[7, 59], [11, 50], [12, 30], [12, 59], [16, 0]]) {
    assert.equal(isCropWorkTime(atPhilippineTime(hour, minute)), false);
    assert.throws(
      () => assertCropWorkerCanWork({ worker_category: "crop_management_worker" }, atPhilippineTime(hour, minute)),
      { code: "CROP_WORK_HOURS_CLOSED" },
    );
  }
});

test("non-crop workers are not restricted by crop work hours", () => {
  assert.doesNotThrow(() => assertCropWorkerCanWork({ worker_category: "seller" }, atPhilippineTime(12, 30)));
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
