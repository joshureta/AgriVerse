const assert = require("node:assert/strict");
const test = require("node:test");

const {
  DRIVER_CONFLICT_MESSAGE,
  WORKER_CONFLICT_MESSAGE,
  assertDriverScheduleAvailable,
  assertWorkerScheduleAvailable,
  mapScheduleConflictDatabaseError,
  rangesOverlap,
} = require("../lib/schedule-conflicts");

function clientReturning(data, error = null) {
  return {
    from() {
      const query = {
        select() { return this; },
        eq() { return this; },
        neq() { return this; },
        in() { return this; },
        lt() { return this; },
        gt() { return this; },
        async limit() { return { data, error }; },
      };
      return query;
    },
  };
}

test("schedule windows conflict only when they overlap", () => {
  assert.equal(rangesOverlap("09:00", "10:00", "09:30", "10:30"), true);
  assert.equal(rangesOverlap("09:00", "10:00", "10:00", "11:00"), false);
  assert.equal(rangesOverlap("10:00", "11:00", "09:00", "10:00"), false);
});

test("worker assignments reject an existing overlapping task", async () => {
  await assert.rejects(
    assertWorkerScheduleAvailable(clientReturning([{ id: 1 }]), {
      workerId: "worker-1", scheduleDate: "2026-11-10", startTime: "09:00:00", endTime: "10:00:00",
    }),
    (error) => error.status === 409 && error.code === "SCHEDULE_CONFLICT" && error.message === WORKER_CONFLICT_MESSAGE,
  );
});

test("driver assignments reject an existing overlapping delivery", async () => {
  await assert.rejects(
    assertDriverScheduleAvailable(clientReturning([{ id: 2 }]), {
      driverId: "driver-1", start: "2026-11-10T09:00:00+08:00", end: "2026-11-10T10:00:00+08:00",
    }),
    (error) => error.status === 409 && error.code === "SCHEDULE_CONFLICT" && error.message === DRIVER_CONFLICT_MESSAGE,
  );
});

test("availability checks allow a free schedule", async () => {
  await assert.doesNotReject(assertWorkerScheduleAvailable(clientReturning([]), {
    workerId: "worker-1", scheduleDate: "2026-11-10", startTime: "10:00:00", endTime: "11:00:00",
  }));
  await assert.doesNotReject(assertDriverScheduleAvailable(clientReturning([]), {
    driverId: "driver-1", start: "2026-11-10T10:00:00+08:00", end: "2026-11-10T11:00:00+08:00",
  }));
});

test("database trigger conflicts become client-safe HTTP conflicts", () => {
  const workerError = mapScheduleConflictDatabaseError({ code: "P0001", message: "worker_schedule_conflict" });
  const driverError = mapScheduleConflictDatabaseError({ code: "P0001", message: "driver_schedule_conflict" });
  assert.equal(workerError.status, 409);
  assert.equal(workerError.message, WORKER_CONFLICT_MESSAGE);
  assert.equal(driverError.status, 409);
  assert.equal(driverError.message, DRIVER_CONFLICT_MESSAGE);
});
