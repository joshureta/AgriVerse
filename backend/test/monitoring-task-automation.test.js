const assert = require("node:assert/strict");
const { test } = require("node:test");
const { cropFinding } = require("../lib/monitoring-task-automation");

// Sensor reading rules run in the database; see monitoring-task-rules-db.test.js.

test("crop concerns create field checks rather than automatic treatment", () => {
  const pest = cropFinding({ factor_scores: { ratings: {
    pest: { status: "ISSUE SUSPECTED", severity: "MODERATE" },
    disease: { status: "NO ISSUE DETECTED", severity: "NOT APPLICABLE" },
  } } });
  assert.equal(pest.kind, "pest_disease");
  assert.match(pest.evidence, /before treatment/);
  assert.equal(cropFinding({ factor_scores: { ratings: { nutrient: { severity: "mild" } } } }).kind, "crop_check");
  assert.equal(cropFinding({ factor_scores: { ratings: { pest: { severity: "none" } } } }), null);
});
