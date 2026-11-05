const assert = require("node:assert/strict");
const test = require("node:test");
const { reportWindow, buildEnvironmentalReport } = require("../lib/environmental-report");
const { buildFallbackSummary } = require("../lib/environmental-report-service");
const { buildEnvironmentalSummary } = require("../lib/environmental-summary");

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
  const fallback = buildFallbackSummary(report);
  assert.match(fallback.summary, /first valid reading at 4:00 PM/);
  assert.match(fallback.summary, /latest valid reading at 4:08 PM/);
  assert.match(fallback.summary, /soil temperature went from 32°C to 33°C/);
  assert.match(fallback.summary, /Humidity went from 77% to 77%/);
  assert.match(fallback.summary, /Soil moisture went from 12% to 12%/);
  assert.match(fallback.suggestedCheck, /Check the sensors in Field A before acting/);
});

test("a single available reading produces a factual summary without a trend claim", () => {
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [reading(window.start + 60 * 60 * 1000, { temperature_c: 27, humidity_percent: null })],
    soilRows: [],
    now: window.start + 2 * 60 * 60 * 1000,
  });
  const fallback = buildFallbackSummary(report);
  assert.match(fallback.summary, /soil temperature went from 27°C to 27°C \(one reading\)/);
  assert.match(fallback.summary, /No valid humidity readings were available/);
  assert.match(fallback.summary, /No valid soil moisture readings were available/);
  assert.match(fallback.suggestedCheck, /Check the sensors in Field A before acting/);
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

test("report window begins with the first valid reading and ends at generation time", () => {
  const start = window.start + 8 * 60 * 60 * 1000;
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [
      reading(start - 60 * 1000, { temperature_c: null, humidity_percent: null }),
      reading(start, { temperature_c: 25, humidity_percent: 80 }),
      reading(start + 10 * 60 * 1000, { temperature_c: 30, humidity_percent: 67 }),
      reading(start + 20 * 60 * 1000, { temperature_c: 99, humidity_percent: 1 }),
    ],
    soilRows: [
      reading(start, { moisture_percent: 42 }),
      reading(start + 10 * 60 * 1000, { moisture_percent: 31 }),
    ],
    now: start + 15 * 60 * 1000,
  });
  assert.equal(report.firstAt, new Date(start).toISOString());
  assert.equal(report.lastAt, new Date(start + 10 * 60 * 1000).toISOString());
  assert.equal(report.generatedAt, new Date(start + 15 * 60 * 1000).toISOString());
  assert.equal(report.metrics.soilTemperature.count, 2);
  assert.equal(report.metrics.soilTemperature.last, 30);
  const generated = buildEnvironmentalSummary(report, { target: { min: 35, max: 45 } });
  assert.match(generated.summary, /As of generation at 8:15 AM/);
  assert.match(generated.summary, /latest valid reading at 8:10 AM/);
  assert.match(generated.summary, /warming and drying pattern/);
  assert.equal(generated.suggestedCheck,
    "Water Field A because its latest soil moisture reading is below the farm's target. After watering, watch the next few readings to see whether moisture rises. If it stays low, check the soil and sensor before watering again.");
  assert.ok(`${generated.summary} ${generated.suggestedCheck}`.split(/\s+/).length <= 140);
});

test("recent recorded irrigation changes the direct watering action", () => {
  const at = window.start + 8 * 60 * 60 * 1000;
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [reading(at, { temperature_c: 25, humidity_percent: 80 }), reading(at + 60 * 1000, { temperature_c: 30, humidity_percent: 67 })],
    soilRows: [reading(at, { moisture_percent: 42 }), reading(at + 60 * 1000, { moisture_percent: 31 })],
    now: at + 2 * 60 * 1000,
  });
  const generated = buildEnvironmentalSummary(report, {
    target: { min: 35, max: 45 }, activities: [{ type: "irrigation", at: new Date(at).toISOString() }],
  });
  assert.match(generated.suggestedCheck, /before watering again/);
  assert.doesNotMatch(generated.suggestedCheck, /^Water/);
});

test("a long sensor gap takes priority over a below-target moisture suggestion", () => {
  const at = window.start + 8 * 60 * 60 * 1000;
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [reading(at, { temperature_c: 25, humidity_percent: 80 }), reading(at + 20 * 60 * 1000, { temperature_c: 30, humidity_percent: 67 })],
    soilRows: [reading(at, { moisture_percent: 42 }), reading(at + 20 * 60 * 1000, { moisture_percent: 31 })],
    now: at + 21 * 60 * 1000,
  });
  assert.ok(report.qualityIssues.length);
  const generated = buildEnvironmentalSummary(report, { target: { min: 35, max: 45 } });
  assert.match(generated.suggestedCheck, /Check the sensors in Field A before acting/);
  assert.doesNotMatch(generated.suggestedCheck, /Water Field A/);
});

test("an older report does not recommend watering from historical moisture", () => {
  const at = window.start + 8 * 60 * 60 * 1000;
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [reading(at, { temperature_c: 25, humidity_percent: 80 }), reading(at + 60 * 1000, { temperature_c: 30, humidity_percent: 67 })],
    soilRows: [reading(at, { moisture_percent: 42 }), reading(at + 60 * 1000, { moisture_percent: 31 })],
    now: window.end + 60 * 1000,
  });
  const generated = buildEnvironmentalSummary(report, { target: { min: 35, max: 45 } });
  assert.match(generated.suggestedCheck, /Check the current soil moisture/);
  assert.doesNotMatch(generated.suggestedCheck, /^Water/);
  assert.doesNotMatch(generated.summary, /generation at/);
});

test("without a validated target a stable report does not recommend watering", () => {
  const at = window.start + 8 * 60 * 60 * 1000;
  const report = buildEnvironmentalReport({
    field: "Field A", date,
    climateRows: [
      reading(at, { temperature_c: 27, humidity_percent: 75 }),
      reading(at + 60 * 1000, { temperature_c: 27.2, humidity_percent: 76 }),
      reading(at + 2 * 60 * 1000, { temperature_c: 27, humidity_percent: 75 }),
    ],
    soilRows: [
      reading(at, { moisture_percent: 38 }),
      reading(at + 60 * 1000, { moisture_percent: 39 }),
      reading(at + 2 * 60 * 1000, { moisture_percent: 38 }),
    ],
    now: at + 3 * 60 * 1000,
  });
  const generated = buildEnvironmentalSummary(report);
  assert.match(generated.summary, /stable first-to-last pattern/);
  assert.match(generated.suggestedCheck, /does not call for a change in watering or shading/);
});
