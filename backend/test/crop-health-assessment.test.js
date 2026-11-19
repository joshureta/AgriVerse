const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildAssessment, scoreTemperature, scoreSoilTemperature, scoreHumidity, scoreMoisture,
  soilBandsFor, DEFAULT_SOIL_BANDS,
} = require("../lib/crop-health-assessment");
const { assessmentWindow, loadScoredInspections } = require("../lib/crop-health-assessment-service");

const now = Date.parse("2026-11-19T08:00:00Z");
const at = new Date(now - 60_000).toISOString();
const bands = { dryBelow: 25, min: 35, max: 45 };

test("saved photo analyses fill the assessment until rule-based inspections exist", async () => {
  const oldPhoto = { id: "photo", factor_scores: { cropCondition: 60 } };
  const newChecklist = { id: "checklist", factor_scores: { cropCondition: 85 } };
  const requested = [];
  const load = async (_field, _from, _to, source) => {
    requested.push(source);
    return source === "rule-inspection" ? [] : [oldPhoto];
  };
  assert.deepEqual(await loadScoredInspections("Field A", 0, 1, load),
    { inspections: [oldPhoto], inspectionSource: "gemini-diagnosis" });
  assert.deepEqual(requested, ["rule-inspection", "gemini-diagnosis"]);
  requested.length = 0;
  const preferred = await loadScoredInspections("Field A", 0, 1, async (_field, _from, _to, source) => {
    requested.push(source);
    return source === "rule-inspection" ? [newChecklist] : [oldPhoto];
  });
  assert.deepEqual(preferred, { inspections: [newChecklist], inspectionSource: "rule-inspection" });
  assert.deepEqual(requested, ["rule-inspection"]);
});

test("environmental threshold boundaries use the configured bands", () => {
  assert.equal(scoreTemperature(22), 100);
  assert.equal(scoreTemperature(32), 100);
  assert.equal(scoreTemperature(35), 70);
  assert.equal(scoreTemperature(35.1), 35);
  assert.equal(scoreSoilTemperature(24), 100);
  assert.equal(scoreSoilTemperature(30), 100);
  assert.equal(scoreSoilTemperature(23.9), 75);
  assert.equal(scoreSoilTemperature(33.1), 40);
  assert.equal(scoreSoilTemperature(16.9), 10);
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

test("soil temperature scores every valid reading before averaging and contributes five percent", () => {
  const assessment = buildAssessment({
    field: "Field A", from: now - 86_400_000, to: now, soilBands: DEFAULT_SOIL_BANDS,
    climateRows: [
      { created_at: new Date(now - 3_000).toISOString(), temperature_c: 27, humidity_percent: 70, soil_temperature_c: 20 },
      { created_at: new Date(now - 2_000).toISOString(), soil_temperature_c: 24.3 },
      { created_at: at, soil_temperature_c: 31 },
    ],
    soilRows: [{ created_at: at, moisture_percent: 40 }],
    inspection: { factor_scores: { cropCondition: 100, disease: 100, pest: 100, nutrient: 100 } },
  });
  const soil = assessment.factors.find((factor) => factor.key === "soilTemperature");
  assert.equal(soil.count, 3);
  assert.equal(soil.average, 25.1);
  assert.equal(soil.score, 83.3);
  assert.equal(soil.weight, 0.05);
  assert.equal(assessment.cropHealthScore, 99.2);
  assert.equal(assessment.scoreCoverage, 100);
});

test("soil scoring uses app boundaries when field-specific limits are unavailable", () => {
  assert.deepEqual(soilBandsFor("Field A", ""), DEFAULT_SOIL_BANDS);
  assert.deepEqual(soilBandsFor("Field A", JSON.stringify({ "Field A": { min: 35, max: 45 } })), DEFAULT_SOIL_BANDS);
  assert.deepEqual(soilBandsFor("Field A", JSON.stringify({ "Field A": bands })), bands);
});

test("default moisture scoring matches existing monitoring boundaries", () => {
  assert.deepEqual(DEFAULT_SOIL_BANDS, { dryBelow: 25, min: 30, max: 70 });
  assert.equal(scoreMoisture(34.3, DEFAULT_SOIL_BANDS), 100);
  assert.equal(scoreMoisture(24.9, DEFAULT_SOIL_BANDS), 35);
  assert.equal(scoreMoisture(70.1, DEFAULT_SOIL_BANDS), 30);
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
  assert.equal(assessment.scoreCoverage, 100);
  assert.equal(assessment.isPartial, false);
  assert.equal(assessment.classification, "Moderately Healthy");
  assert.equal(assessment.context.soilTemperature.average, 27.5);
  assert.equal(assessment.context.soilTemperature.count, 1);
  assert.equal(assessment.missing.length, 0);
});

test("a combined score requires image and sensor evidence, and reports missing weight", () => {
  const common = {
    field: "Field A", from: now - 86_400_000, to: now,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 27, humidity_percent: 70 }],
    soilRows: [{ created_at: at, moisture_percent: 40 }],
  };
  const noImage = buildAssessment({ ...common, soilBands: bands });
  assert.equal(noImage.cropHealthScore, null);
  assert.equal(noImage.scoreCoverage, 35);
  assert.equal(noImage.environmentalScore, 100);
  const noCalibration = buildAssessment({ ...common, inspection: { factor_scores: { cropCondition: 100, disease: 100, pest: 100, nutrient: 100 } } });
  assert.equal(noCalibration.cropHealthScore, 100);
  assert.equal(noCalibration.scoreCoverage, 85);
  assert.equal(noCalibration.isPartial, true);
  assert.equal(noCalibration.environmentalScore, null);
  assert.equal(noCalibration.factors.find((factor) => factor.key === "moisture").average, 40);
});

test("missing nutrient and moisture scores do not erase available image and sensor scores", () => {
  const assessment = buildAssessment({
    field: "Field A", from: now - 86_400_000, to: now,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 27, humidity_percent: 60 }],
    soilRows: [{ created_at: at, moisture_percent: 34.3 }],
    inspection: { factor_scores: { cropCondition: 60, disease: 60, pest: 100 } },
  });
  assert.equal(assessment.cropHealthScore, 77.1);
  assert.equal(assessment.scoreCoverage, 70);
  assert.equal(assessment.isPartial, true);
  assert.deepEqual(assessment.missing, ["Nutrient status", "Soil moisture"]);
});

test("available moisture reading receives a score with the app boundaries", () => {
  const assessment = buildAssessment({
    field: "Field A", from: now - 86_400_000, to: now, soilBands: DEFAULT_SOIL_BANDS,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 27, humidity_percent: 60 }],
    soilRows: [{ created_at: at, moisture_percent: 34.3 }],
    inspection: { factor_scores: { cropCondition: 60, disease: 60, pest: 100 } },
  });
  assert.equal(assessment.factors.find((factor) => factor.key === "moisture").score, 100);
  assert.equal(assessment.scoreCoverage, 85);
  assert.equal(assessment.cropHealthScore, 81.2);
  assert.deepEqual(assessment.missing, ["Nutrient status"]);
});

test("visual factors average all valid inspections from the selected day only", () => {
  const earlier = new Date(now - 3_600_000).toISOString();
  const previousDay = new Date(now - 2 * 86_400_000).toISOString();
  const assessment = buildAssessment({
    field: "Field A", from: now - 86_400_000, to: now, soilBands: DEFAULT_SOIL_BANDS,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 27, humidity_percent: 60 }],
    soilRows: [{ created_at: at, moisture_percent: 34.3 }],
    inspections: [
      { id: "latest", created_at: at, health_score: 60,
        factor_scores: { cropCondition: 60, disease: 60, pest: 100, nutrient: null } },
      { id: "earlier", created_at: earlier, health_score: 85,
        factor_scores: { cropCondition: 85, disease: 85, pest: 85, nutrient: 85,
          ratings: { nutrient: { severity: "mild", evidence: "Visible leaf color change" } } } },
      { id: "previous-day", created_at: previousDay, factor_scores: { nutrient: 10 } },
    ],
  });
  assert.equal(assessment.image.id, "latest");
  assert.equal(assessment.image.analysisCount, 2);
  assert.equal(assessment.factors.find((factor) => factor.key === "cropCondition").score, 72.5);
  assert.equal(assessment.factors.find((factor) => factor.key === "cropCondition").count, 2);
  assert.equal(assessment.factors.find((factor) => factor.key === "disease").score, 72.5);
  assert.equal(assessment.factors.find((factor) => factor.key === "pest").score, 92.5);
  assert.equal(assessment.factors.find((factor) => factor.key === "nutrient").score, 85);
  assert.equal(assessment.factors.find((factor) => factor.key === "nutrient").count, 1);
  assert.equal(assessment.factors.find((factor) => factor.key === "nutrient").analyzedAt, earlier);
  assert.deepEqual(assessment.factors.find((factor) => factor.key === "nutrient").rating,
    { severity: "mild", evidence: "Visible leaf color change" });
  assert.equal(assessment.scoreCoverage, 100);
  assert.equal(assessment.visualScore, 80);
  assert.equal(assessment.cropHealthScore, 85);
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

test("selected dates use Manila calendar boundaries and reject future dates", () => {
  const historical = assessmentWindow("Field B", "2026-11-18", now);
  assert.equal(new Date(historical.from).toISOString(), "2026-11-17T16:00:00.000Z");
  assert.equal(new Date(historical.to).toISOString(), "2026-11-18T16:00:00.000Z");
  assert.equal(historical.date, "2026-11-18");
  const today = assessmentWindow("Field B", "2026-11-19", now);
  assert.equal(today.to, now + 1);
  assert.throws(() => assessmentWindow("Field B", "2026-11-20", now));
  assert.throws(() => assessmentWindow("Field B", "2026-02-30", now));
});

test("pest score uses the saved image rating, and missing image remains incomplete", () => {
  const data = {
    field: "Field C", from: now - 86_400_000, to: now, soilBands: bands,
    climateRows: [{ created_at: at, temperature_c: 28, soil_temperature_c: 26, humidity_percent: 70 }],
    soilRows: [{ created_at: at, moisture_percent: 40 }],
  };
  const withoutImage = buildAssessment(data);
  assert.equal(withoutImage.factors.find((factor) => factor.key === "pest").score, null);
  assert.equal(withoutImage.cropHealthScore, null);
  const withImage = buildAssessment({ ...data, inspection: {
    id: "saved-image", created_at: at,
    action_recommendations: ["Inspect affected plants", "Check leaf undersides"],
    factor_scores: {
      cropCondition: 100, disease: 100, pest: 60, nutrient: 100,
      ratings: {
        pest: { severity: "moderate", evidence: "Visible pest damage" },
        nutrient: { severity: "none", evidence: "Uniform green leaves" },
      },
    },
  } });
  assert.equal(withImage.factors.find((factor) => factor.key === "pest").score, 60);
  assert.equal(withImage.image.pestRating.evidence, "Visible pest damage");
  assert.equal(withImage.image.nutrientRating.evidence, "Uniform green leaves");
  assert.deepEqual(withImage.image.recommendations, ["Inspect affected plants", "Check leaf undersides"]);
  assert.equal(withImage.cropHealthScore, 94);
});
