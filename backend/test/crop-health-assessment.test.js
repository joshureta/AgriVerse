const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildAssessment, scoreTemperature, scoreHumidity, scoreMoisture, soilBandsFor,
} = require("../lib/crop-health-assessment");
const { assessmentWindow } = require("../lib/crop-health-assessment-service");

const now = Date.parse("2026-11-19T08:00:00Z");
const at = new Date(now - 60_000).toISOString();
const bands = { dryBelow: 25, min: 35, max: 45 };

test("environmental threshold boundaries use the configured bands", () => {
  assert.equal(scoreTemperature(22), 100);
  assert.equal(scoreTemperature(32), 100);
  assert.equal(scoreTemperature(35), 70);
  assert.equal(scoreTemperature(35.1), 35);
  assert.equal(scoreHumidity(65), 100);
  assert.equal(scoreHumidity(80), 100);
  assert.equal(scoreHumidity(90), 80);
  assert.equal(scoreHumidity(90.1), 50);
  assert.equal(scoreMoisture(24.9, bands), 35);
  assert.equal(scoreMoisture(25, bands), 70);
  assert.equal(scoreMoisture(35, bands), 100);
  assert.equal(scoreMoisture(45.1, bands), 30);
  assert.equal(scoreMoisture(20, null), null);
});

test("soil bands require a field-specific dry boundary", () => {
  assert.equal(soilBandsFor("Field A", JSON.stringify({ "Field A": { min: 35, max: 45 } })), null);
  assert.deepEqual(soilBandsFor("Field A", JSON.stringify({ "Field A": bands })), bands);
});

test("weighted crop score and environmental suitability use separate inputs", () => {
  const assessment = buildAssessment({
    field: "Field A", from: now - 86_400_000, to: now, soilBands: bands,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 27.5, humidity_percent: 60 }],
    soilRows: [{ created_at: at, moisture_percent: 20 }],
    inspection: {
      id: "image-1", created_at: at, factor_scores: { cropCondition: 55, disease: 100, pest: 85, nutrient: 55 },
    },
  });
  assert.equal(assessment.environmentalScore, 66.4);
  assert.equal(assessment.cropHealthScore, 72.5);
  assert.equal(assessment.classification, "Moderately Healthy");
  assert.equal(assessment.context.soilTemperature.average, 27.5);
  assert.equal(assessment.context.soilTemperature.count, 1);
  assert.equal(assessment.missing.length, 0);
});

test("missing image or uncalibrated soil never becomes a complete score", () => {
  const common = {
    field: "Field A", from: now - 86_400_000, to: now,
    climateRows: [{ created_at: at, temperature_c: 28, humidity_percent: 70 }],
    soilRows: [{ created_at: at, moisture_percent: 40 }],
  };
  const noImage = buildAssessment({ ...common, soilBands: bands });
  assert.equal(noImage.cropHealthScore, null);
  assert.equal(noImage.environmentalScore, 100);
  const noCalibration = buildAssessment({ ...common, inspection: { factor_scores: { cropCondition: 100, disease: 100, pest: 100, nutrient: 100 } } });
  assert.equal(noCalibration.cropHealthScore, null);
  assert.equal(noCalibration.environmentalScore, null);
  assert.equal(noCalibration.factors.find((factor) => factor.key === "moisture").average, 40);
});

test("invalid and out-of-window readings are excluded", () => {
  const assessment = buildAssessment({
    field: "Field B", from: now - 86_400_000, to: now, soilBands: bands,
    climateRows: [
      { created_at: at, temperature_c: 28, humidity_percent: 70 },
      { created_at: at, temperature_c: 1000, humidity_percent: 200 },
      { created_at: new Date(now - 2 * 86_400_000).toISOString(), temperature_c: 30, humidity_percent: 65 },
    ],
  });
  assert.equal(assessment.factors.find((factor) => factor.key === "temperature").count, 1);
  assert.equal(assessment.factors.find((factor) => factor.key === "humidity").count, 1);
  assert.equal(assessment.cropHealthScore, null);
});

test("assessment accepts only supported fields and periods", () => {
  assert.equal(assessmentWindow("Field A", 24, now).from, now - 86_400_000);
  assert.throws(() => assessmentWindow("Field Z", 24, now));
  assert.throws(() => assessmentWindow("Field A", 1, now));
});
