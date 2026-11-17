const test = require("node:test");
const assert = require("node:assert/strict");
const { reportRange, weightedAverage } = require("../routes/admin-reports");

test("report ranges start on Manila calendar boundaries and end at generation time", () => {
  const now = new Date("2026-11-16T17:30:00.000Z"); // Tuesday, Nov 17 in Manila.
  assert.deepEqual(reportRange("week", now), {
    start: "2026-11-15T16:00:00.000Z",
    end: now.toISOString(),
    startDate: "2026-11-16",
    endDate: "2026-11-17",
    label: "This week",
  });
  assert.equal(reportRange("month", now).startDate, "2026-11-01");
  assert.equal(reportRange("year", now).startDate, "2026-01-01");
});

test("environmental averages weight daily readings by valid sample count", () => {
  const reports = [
    { metrics: { metrics: { soilMoisture: { average: 20, count: 10 } } } },
    { metrics: { metrics: { soilMoisture: { average: 40, count: 30 } } } },
    { metrics: { metrics: { soilMoisture: { average: null, count: 0 } } } },
  ];
  assert.equal(weightedAverage(reports, "soilMoisture"), "35.0");
  assert.equal(weightedAverage([], "soilMoisture"), "-");
});
