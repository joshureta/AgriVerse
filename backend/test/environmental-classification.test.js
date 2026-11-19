const assert = require("node:assert/strict");
const test = require("node:test");
const { classifyEnvironment, soilMoistureBands, STATUS } = require("../lib/environmental-classification");
const { buildEnvironmentalAssessment, generateEnvironmentalAssessment, RULES_MODEL } = require("../lib/environmental-ai-report");

const now = Date.parse("2026-11-20T04:00:00Z");
const bands = { criticalLow: 25, min: 30, max: 70, saturated: 85, calibrated: true };

function metric(last, { count = 5, first = last, min = last, max = last, ageMs = 60 * 1000, flatLine = false } = {}) {
  return {
    count, first, last, min, max, average: last, flatLine,
    firstAt: new Date(now - 3600 * 1000).toISOString(),
    lastAt: new Date(now - ageMs).toISOString(),
  };
}

function report(metrics, { isToday = true } = {}) {
  return {
    field: "Field A", date: "2026-11-20", isToday,
    cutoffAt: new Date(now).toISOString(), generatedAt: new Date(now).toISOString(),
    metrics: {
      airTemperature: { count: 0 }, soilTemperature: { count: 0 }, humidity: { count: 0 }, soilMoisture: { count: 0 },
      ...metrics,
    },
  };
}

const statusOf = (result, key) => result.parameters.find((item) => item.key === key).status;

test("air temperature bands follow the AgriVerse rules", () => {
  const cases = [[14.9, STATUS.CRITICAL_LOW], [15, STATUS.LOW], [19.9, STATUS.LOW], [20, STATUS.NORMAL], [30, STATUS.NORMAL], [31, STATUS.HIGH], [32, STATUS.HIGH], [32.1, STATUS.CRITICAL_HIGH]];
  for (const [value, expected] of cases) {
    assert.equal(statusOf(classifyEnvironment(report({ airTemperature: metric(value) }), { bands }), "airTemperature"), expected, `${value}°C`);
  }
});

test("soil temperature, humidity, and soil moisture bands follow the rules", () => {
  const soil = [[19, STATUS.LOW], [24.9, STATUS.LOW], [25, STATUS.NORMAL], [32, STATUS.NORMAL], [35, STATUS.HIGH], [35.1, STATUS.CRITICAL]];
  for (const [value, expected] of soil) {
    assert.equal(statusOf(classifyEnvironment(report({ soilTemperature: metric(value) }), { bands }), "soilTemperature"), expected);
  }
  const humidity = [[40, STATUS.LOW], [69.9, STATUS.LOW], [70, STATUS.NORMAL], [85, STATUS.NORMAL], [88, STATUS.HIGH], [97, STATUS.HIGH]];
  for (const [value, expected] of humidity) {
    assert.equal(statusOf(classifyEnvironment(report({ humidity: metric(value) }), { bands }), "humidity"), expected);
  }
  const moisture = [[25, STATUS.CRITICAL_LOW], [29, STATUS.LOW], [50, STATUS.NORMAL], [84, STATUS.HIGH], [85, STATUS.CRITICAL_HIGH]];
  for (const [value, expected] of moisture) {
    assert.equal(statusOf(classifyEnvironment(report({ soilMoisture: metric(value) }), { bands }), "soilMoisture"), expected);
  }
});

test("data quality: missing, implausible, and stale readings are not classified", () => {
  const result = classifyEnvironment(report({
    airTemperature: metric(120),
    humidity: metric(80, { ageMs: 20 * 60 * 1000 }),
  }), { bands });
  assert.equal(statusOf(result, "airTemperature"), STATUS.SENSOR_ERROR);
  assert.equal(statusOf(result, "humidity"), STATUS.STALE);
  assert.equal(statusOf(result, "soilMoisture"), STATUS.NO_DATA);
  assert.equal(result.summaryPriority, 4);
  assert.equal(result.allNormal, false);
});

test("soil moisture falls back to default, uncalibrated bands", () => {
  assert.equal(soilMoistureBands("Field A", undefined).calibrated, false);
  assert.equal(soilMoistureBands("Field A", '{"Field A":{"min":35,"max":45}}').calibrated, false);
  const calibrated = soilMoistureBands("Field A", '{"Field A":{"criticalLow":20,"min":35,"max":45,"saturated":60}}');
  assert.deepEqual(calibrated, { criticalLow: 20, min: 35, max: 45, saturated: 60, calibrated: true });
});

test("combined interpretations need valid readings for both parameters", () => {
  const result = classifyEnvironment(report({ airTemperature: metric(31), soilMoisture: metric(28) }), { bands });
  assert.deepEqual(result.combinations.map((item) => item.id), ["heat-dry"]);
  const stale = classifyEnvironment(report({ airTemperature: metric(31), soilMoisture: metric(28, { ageMs: 30 * 60 * 1000 }) }), { bands });
  assert.equal(stale.combinations.length, 0);
});

test("AI text cannot override backend statuses or rule actions", () => {
  const data = report({ airTemperature: metric(33), soilTemperature: metric(28), humidity: metric(75), soilMoisture: metric(50) });
  const classification = classifyEnvironment(data, { bands });
  const assessment = buildEnvironmentalAssessment(classification, data, {
    summary: "Overall health score is 72%.",
    parameters: [{ parameter: "Air Temperature", status: "NORMAL", description: "Air temperature reads 33°C, above the range.", possibleImplication: "May contribute to heat stress." }],
    priorityConcerns: [],
    generalRecommendations: ["Only one"],
  });
  const air = assessment.parameters.find((item) => item.key === "airTemperature");
  assert.equal(air.status, STATUS.CRITICAL_HIGH);
  assert.equal(air.description, "Air temperature reads 33°C, above the range.");
  assert.deepEqual(air.recommendedActions.slice(0, 1), ["Verify the sensor reading."]);
  assert.doesNotMatch(assessment.summary, /health score/i);
  assert.equal(assessment.priorityConcerns[0].parameter, "Air Temperature");
  assert.ok(assessment.generalRecommendations.length >= 3);
});

test("all-normal readings produce no priority concerns", async () => {
  const data = report({ airTemperature: metric(26), soilTemperature: metric(28), humidity: metric(78), soilMoisture: metric(50) });
  const classification = classifyEnvironment(data, { bands });
  const { assessment, model } = await generateEnvironmentalAssessment(classification, data, {
    getClient: () => { throw new Error("no key"); },
  });
  assert.equal(model, RULES_MODEL);
  assert.equal(assessment.source, "rules");
  assert.equal(assessment.priorityConcerns.length, 0);
  assert.match(assessment.noConcernMessage, /No environmental parameter currently requires corrective attention/);
  assert.match(assessment.summary, /within the configured monitoring ranges/);
});
