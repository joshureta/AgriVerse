const assert = require("node:assert/strict");
const test = require("node:test");
const { publicRules, scoreInspection } = require("../lib/crop-rule-inspection");
const { recommendationsFor } = require("../lib/crop-rule-guidance");
const { buildAssessment, DEFAULT_SOIL_BANDS } = require("../lib/crop-health-assessment");

test("each visual description is fixed and mapped to a deterministic score", () => {
  const rules = publicRules();
  assert.equal(rules.length, 4);
  assert.deepEqual(rules[0].options.map((item) => item.value),
    ["none", "mild", "moderate", "severe", "extensive", "unknown"]);
  const result = scoreInspection({ cropCondition: "moderate", disease: "mild", pest: "none", nutrient: "unknown" });
  assert.deepEqual(result.factorScores, { cropCondition: 60, disease: 85, pest: 100, nutrient: null });
  assert.equal(result.score, 82);
  assert.equal(result.coverage, 77);
  assert.equal(result.isPartial, true);
  assert.match(result.ratings.nutrient.evidence, /not enough/i);
  assert.throws(() => scoreInspection({ cropCondition: "none", disease: "none", pest: "none", nutrient: "healthy" }), /valid description/);
  assert.throws(() => scoreInspection({ cropCondition: "unknown", disease: "unknown", pest: "unknown", nutrient: "unknown" }), /at least one/i);
});

test("manual visual findings combine with sensor rules and produce fixed guidance", () => {
  const selected = { cropCondition: "moderate", disease: "mild", pest: "none", nutrient: "unknown" };
  const result = scoreInspection(selected);
  const at = "2026-11-19T07:00:00.000Z";
  const assessment = buildAssessment({
    field: "Field A", from: Date.parse("2026-11-18T16:00:00Z"), to: Date.parse("2026-11-19T08:00:00Z"),
    soilBands: DEFAULT_SOIL_BANDS,
    climateRows: [{ created_at: at, temperature_c: 27, soil_temperature_c: 27, humidity_percent: 70 }],
    soilRows: [{ created_at: at, moisture_percent: 40 }],
    inspection: { id: "manual", created_at: at, health_score: result.score,
      factor_scores: { ...result.factorScores, ratings: result.ratings, method: "manual-description-rules-v1" } },
  });
  assert.equal(assessment.cropHealthScore, 89.4);
  assert.equal(assessment.scoreCoverage, 85);
  assert.equal(assessment.isPartial, true);
  const guidance = recommendationsFor({ ...assessment, date: "2026-11-19" }, Date.parse("2026-11-19T08:00:00Z"));
  assert.match(guidance[0], /affected tissue/i);
  assert.equal(guidance.length, 3);
  assert.deepEqual(guidance, recommendationsFor({ ...assessment, date: "2026-11-19" }, Date.parse("2026-11-19T08:00:00Z")));
});
