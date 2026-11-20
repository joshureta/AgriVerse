const assert = require("node:assert/strict");
const test = require("node:test");
const { buildMonitoringReport } = require("../lib/monitoring-report");

const bands = { criticalLow: 25, min: 30, max: 70, saturated: 85, calibrated: true };
const date = "2026-11-19";
const dayStart = Date.parse(`${date}T00:00:00+08:00`);
const now = Date.parse("2026-11-20T10:00:00+08:00");
const at = (hours) => new Date(dayStart + hours * 3600 * 1000).toISOString();

const dim = (status, severity, condition = "Observed", symptoms = ["leaf spots"]) => ({ status, severity, condition, symptoms });
const healthy = () => dim("NO ISSUE DETECTED", "NOT APPLICABLE", "No significant visible symptoms", []);

function inspection(hours, ratings, overall) {
  return {
    id: hours, created_at: at(hours), assessment_source: "gemini-diagnosis",
    factor_scores: { ratings: { cropCondition: healthy(), pest: healthy(), nutrient: healthy(), disease: healthy(), ...ratings }, ...(overall ? { overall: { status: overall } } : {}) },
  };
}

function climate(hours, values) {
  return { id: hours, created_at: at(hours), temperature_c: 26, soil_temperature_c: 28, humidity_percent: 78, soil_moisture: 50, ...values };
}

const fullDay = (values = {}) => Array.from({ length: 48 }, (_, index) => climate(index / 2, values));
const build = (input) => buildMonitoringReport({ field: "Field B", period: "daily", date, bands, now, climateRows: [], soilRows: [], inspections: [], ...input });

test("healthy crop and normal environment gives scenario A without any numeric score", () => {
  const report = build({ inspections: [inspection(8, {})], climateRows: fullDay() });
  assert.equal(report.crop.status, "HEALTHY");
  assert.equal(report.combined.scenario, "A");
  assert.equal(report.environment.parameters.find((item) => item.key === "airTemperature").descriptor, "NORMAL");
  assert.ok(report.recommendations.length >= 3 && report.recommendations.length <= 5);
  assert.ok(!JSON.stringify(report).includes("cropHealthScore"));
});

test("a reliable HIGH finding makes the period CRITICAL and an URGENT action first", () => {
  const report = build({
    inspections: [inspection(8, { disease: dim("ISSUE DETECTED", "HIGH", "Heart rot at the plant center") }), inspection(9, {})],
    climateRows: fullDay(),
  });
  assert.equal(report.crop.status, "CRITICAL");
  assert.equal(report.combined.scenario, "E");
  assert.equal(report.recommendations[0].priority, "URGENT");
  assert.equal(report.recommendations[0].related, "Plant Diseases");
});

test("a LOW issue gives NEEDS ATTENTION at the period level and severities are not averaged", () => {
  const report = build({
    inspections: [inspection(8, { pest: dim("ISSUE DETECTED", "LOW", "Few mealybugs on one leaf base") }), inspection(9, {})],
    climateRows: fullDay(),
  });
  assert.equal(report.crop.status, "NEEDS ATTENTION");
  const pest = report.crop.dimensions.find((item) => item.key === "pest");
  assert.equal(pest.highestSeverity, "LOW");
  assert.equal(report.combined.scenario, "C");
});

test("a single critical sensor reading is scenario F and does not change the crop status", () => {
  const rows = fullDay();
  rows[10] = climate(5, { temperature_c: 34 });
  const report = build({ inspections: [inspection(8, {})], climateRows: rows });
  assert.equal(report.crop.status, "HEALTHY");
  assert.equal(report.combined.scenario, "F");
  const air = report.environment.parameters.find((item) => item.key === "airTemperature");
  assert.equal(air.descriptor, "CRITICAL READING RECORDED");
  assert.equal(air.criticalCount, 1);
  assert.equal(report.recommendations[0].priority, "URGENT");
});

test("missing crop records and sensors give scenario G, never healthy", () => {
  const report = build({});
  assert.equal(report.crop.status, "INCONCLUSIVE");
  assert.equal(report.combined.scenario, "G");
  assert.ok(report.limitations.some((item) => item.includes("not evidence of a healthy crop")));
});

test("weekly humidity deviations on several days are FREQUENTLY HIGH and linked to disease only on overlapping days", () => {
  const rows = [];
  for (let day = -6; day <= 0; day += 1) {
    for (let hour = 0; hour < 24; hour += 2) rows.push(climate(day * 24 + hour, { humidity_percent: day >= -2 ? 92 : 78 }));
  }
  const report = buildMonitoringReport({
    field: "Field C", period: "weekly", date, bands, now, soilRows: [], climateRows: rows,
    inspections: [inspection(-12, { disease: dim("ISSUE SUSPECTED", "MODERATE", "Leaf lesions on lower leaves") })],
  });
  const humidity = report.environment.parameters.find((item) => item.key === "humidity");
  assert.equal(humidity.descriptor, "FREQUENTLY HIGH");
  assert.equal(report.combined.scenario, "D");
  assert.equal(report.combined.relationships.length, 1);
  assert.equal(report.info.startDate, "2026-11-13");
});

test("rule checklist severities map to the validated labels", () => {
  const row = {
    id: 1, created_at: at(8), assessment_source: "rule-inspection",
    factor_scores: { ratings: { cropCondition: { severity: "none" }, pest: { severity: "severe", evidence: "Colonies on many leaf bases" }, nutrient: { severity: "none" }, disease: { severity: "none" } } },
  };
  const report = build({ inspections: [row], climateRows: fullDay() });
  assert.equal(report.crop.status, "CRITICAL");
  assert.ok(report.limitations.some((item) => item.includes("checklist")));
});
