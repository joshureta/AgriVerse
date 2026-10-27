const assert = require("node:assert/strict");
const test = require("node:test");
const { reportWindow, buildEnvironmentalReport } = require("../lib/environmental-report");

const date = "2026-10-27";
const window = reportWindow(date);
const reading = (time, values) => ({ created_at: new Date(time).toISOString(), ...values });

test("Manila date boundaries cover exactly one local day", () => {
  assert.equal(new Date(window.start).toISOString(), "2026-10-26T16:00:00.000Z");
  assert.equal(new Date(window.end).toISOString(), "2026-10-27T16:00:00.000Z");
  assert.equal(reportWindow("2026-02-30"), null);
});

test("short partial data remains available for an on-demand partial summary", () => {
  const climateRows = [
    reading(window.start + 16 * 60 * 60 * 1000, { temperature_c: 32, humidity_percent: 77 }),
    reading(window.start + 16 * 60 * 60 * 1000 + 8 * 60 * 1000, { temperature_c: 33, humidity_percent: null }),
  ];
  const soilRows = [reading(window.start + 16 * 60 * 60 * 1000, { moisture_percent: 12 })];
  const report = buildEnvironmentalReport({ field: "Field A", date, climateRows, soilRows, now: window.start + 17 * 60 * 60 * 1000 });
  assert.equal(report.status, "insufficient");
  assert.equal(report.hasReadings, true);
  assert.equal(report.metrics.soilTemperature.average, 32.5);
  assert.equal(report.metrics.humidity.count, 1);
  assert.equal(report.metrics.soilMoisture.average, 12);
});

test("a field with no readings shows an empty report without AI eligibility", () => {
  const report = buildEnvironmentalReport({
    field: "Field B", date, climateRows: [], soilRows: [], now: window.start + 12 * 60 * 60 * 1000,
  });
  assert.equal(report.status, "insufficient");
  assert.equal(report.hasReadings, false);
  assert.equal(report.firstAt, null);
  assert.equal(report.metrics.soilMoisture.count, 0);
});

test("a full day with adequate readings becomes eligible for a final summary", () => {
  const climateRows = [];
  const soilRows = [];
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    const at = window.start + minute * 60 * 1000;
    climateRows.push(reading(at, { temperature_c: 28, humidity_percent: 70 }));
    soilRows.push(reading(at, { moisture_percent: 40 }));
  }
  const report = buildEnvironmentalReport({ field: "Field A", date, climateRows, soilRows, now: window.end + 60 * 1000 });
  assert.equal(report.status, "final");
  assert.equal(report.metrics.soilTemperature.coveragePercent, 50);
  assert.equal(report.metrics.humidity.coveragePercent, 50);
  assert.equal(report.metrics.soilMoisture.coveragePercent, 50);
});
