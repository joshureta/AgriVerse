const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyScore, scoreImageDiagnosis, scoreVisibleRegions } = require("../lib/crop-image-score");

test("visible crop score counts each region once, regardless of its diagnosis", () => {
  const result = scoreVisibleRegions([
    { sharePercent: 70, severity: "none", evidence: "Healthy visible canopy" },
    { sharePercent: 30, severity: "severe", evidence: "Wilted patch with disease signs" },
  ]);
  assert.equal(result.score, 79);
  assert.equal(result.healthStatus, "Good");
});

test("unreliable region shares produce no score", () => {
  assert.equal(scoreVisibleRegions([]).score, null);
  assert.equal(scoreVisibleRegions([{ sharePercent: 70, severity: "none", evidence: "Healthy canopy" }]).score, null);
  assert.equal(scoreVisibleRegions([{ sharePercent: 100, severity: "unknown", evidence: "Blurred crop" }]).score, null);
});

test("the index is the rounded weighted score of four visible factors", () => {
  const result = scoreImageDiagnosis({
    cropCondition: { severity: "mild", evidence: "Slight yellowing on visible leaves" },
    disease: { severity: "moderate", evidence: "Several visible leaf lesions" },
    pest: { severity: "none", evidence: "No visible pests or pest damage" },
    nutrient: { severity: "mild", evidence: "Limited pale areas on visible leaves" },
  });

  assert.deepEqual(result.factorScores, { cropCondition: 85, disease: 60, pest: 100, nutrient: 85 });
  assert.equal(result.score, 78); // .30*85 + .40*60 + .20*100 + .10*85 = 78
  assert.equal(result.coverage, 100);
  assert.equal(result.isPartial, false);
  assert.equal(result.healthStatus, "Good");
});

test("unknown factors are excluded from both weighted terms and coverage", () => {
  const result = scoreImageDiagnosis({
    cropCondition: { severity: "extensive", evidence: "Fruit is mostly necrotic" },
    disease: { severity: "extensive", evidence: "Visible fruit rot" },
    pest: { severity: "unknown", evidence: "Pest signs cannot be checked in this view" },
    nutrient: { severity: "unknown", evidence: "Canopy is not visible" },
  });

  assert.equal(result.factorScores.pest, null);
  assert.equal(result.factorScores.nutrient, null);
  assert.equal(result.score, 10); // (.30*10 + .40*10) / .70
  assert.equal(result.coverage, 70);
  assert.equal(result.isPartial, true);
  assert.equal(result.healthStatus, "Critical");
  assert.equal(scoreImageDiagnosis({ disease: { severity: "severe" } }).factorScores.disease, null);
});

test("no assessable factor has no score and never divides by zero", () => {
  const result = scoreImageDiagnosis({});
  assert.equal(result.score, null);
  assert.equal(result.coverage, 0);
  assert.equal(result.isPartial, false);
  assert.equal(result.healthStatus, "Insufficient visual evidence");
});

test("whole-number classification boundaries have no gaps", () => {
  assert.deepEqual([0, 20, 21, 40, 41, 60, 61, 80, 81, 100].map(classifyScore), [
    "Critical", "Critical", "Poor", "Poor", "Fair", "Fair", "Good", "Good", "Excellent", "Excellent",
  ]);
});
