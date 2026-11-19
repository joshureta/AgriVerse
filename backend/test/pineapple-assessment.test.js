const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAssessment, normalizeDimension, OVERALL } = require("../lib/pineapple-assessment");

const none = { status: "NO ISSUE DETECTED", condition: "Uniform green leaves", symptoms: [], severity: "NOT APPLICABLE" };
const unclear = { status: "INCONCLUSIVE", condition: "Leaf bases not visible", symptoms: [], severity: "UNDETERMINED" };
const issue = (status, severity) => ({ status, condition: "Leaf tip browning", symptoms: ["Brown tips on outer leaves"], severity });

function assess(dimensions) {
  return buildAssessment({ dimensions: { cropCondition: none, pest: none, nutrient: none, disease: none, ...dimensions } });
}

test("all dimensions clear is HEALTHY", () => {
  assert.equal(assess({}).overall.status, OVERALL.HEALTHY);
});

test("a LOW detected issue alone stays HEALTHY", () => {
  assert.equal(assess({ cropCondition: issue("ISSUE DETECTED", "LOW") }).overall.status, OVERALL.HEALTHY);
});

test("a single HIGH issue is CRITICAL even when other dimensions are inconclusive", () => {
  const result = assess({ disease: issue("ISSUE DETECTED", "HIGH"), pest: unclear, nutrient: unclear });
  assert.equal(result.overall.status, OVERALL.CRITICAL);
  assert.match(result.overall.decisionPath, /Step 2/);
  assert.deepEqual(result.overall.mainFindings, [
    { dimension: "Plant Diseases", condition: "Leaf tip browning", status: "ISSUE DETECTED", severity: "HIGH" },
  ]);
});

test("a MODERATE or any SUSPECTED issue is NEEDS ATTENTION", () => {
  assert.equal(assess({ pest: issue("ISSUE DETECTED", "MODERATE") }).overall.status, OVERALL.NEEDS_ATTENTION);
  assert.equal(assess({ nutrient: issue("ISSUE SUSPECTED", "LOW") }).overall.status, OVERALL.NEEDS_ATTENTION);
});

test("an unassessed dimension prevents HEALTHY", () => {
  assert.equal(assess({ pest: unclear }).overall.status, OVERALL.INCONCLUSIVE);
});

test("all dimensions inconclusive stops at step 1", () => {
  const result = assess({ cropCondition: unclear, pest: unclear, nutrient: unclear, disease: unclear });
  assert.equal(result.overall.status, OVERALL.INCONCLUSIVE);
  assert.match(result.overall.decisionPath, /^Step 1/);
});

test("status forces a consistent severity", () => {
  assert.equal(normalizeDimension({ status: "NO ISSUE DETECTED", severity: "HIGH" }).severity, "NOT APPLICABLE");
  assert.equal(normalizeDimension({ status: "INCONCLUSIVE", severity: "LOW" }).severity, "UNDETERMINED");
  assert.equal(normalizeDimension({ status: "issue_detected", severity: "high", symptoms: ["Rotting heart"] }).severity, "HIGH");
});

test("a reported issue without observed symptoms is treated as inconclusive", () => {
  const dimension = normalizeDimension({ status: "ISSUE DETECTED", severity: "HIGH", symptoms: [] });
  assert.equal(dimension.status, "INCONCLUSIVE");
  assert.equal(assess({ disease: { status: "ISSUE DETECTED", severity: "HIGH" } }).overall.status, OVERALL.INCONCLUSIVE);
});

test("the server status wins over a disagreeing AI status", () => {
  const result = buildAssessment({
    dimensions: { cropCondition: none, pest: none, nutrient: none, disease: issue("ISSUE DETECTED", "HIGH") },
    overall: { status: "HEALTHY", summary: "Looks fine." },
  });
  assert.equal(result.overall.status, OVERALL.CRITICAL);
  assert.equal(result.overall.aiStatusDisagreed, true);
  assert.doesNotMatch(result.overall.summary, /Looks fine/);
});

test("model-added numbering is removed from recommendations", () => {
  const result = buildAssessment({ dimensions: {}, recommendations: ["1. Scout the field", "2) Retake the photo"] });
  assert.deepEqual(result.recommendations, ["Scout the field", "Retake the photo"]);
});

test("no overall score; per-dimension points come from fixed severity rules", () => {
  const result = assess({ disease: issue("ISSUE DETECTED", "MODERATE"), pest: unclear });
  assert.deepEqual(result.factorScores, { cropCondition: 100, pest: null, nutrient: 100, disease: 60 });
  assert.ok(result.limitations.some((item) => /initial visual evaluation/.test(item)));
});
