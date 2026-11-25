const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { httpError } = require("../lib/http-error");

// Settings > Monitoring Rules: admins turn rules on/off and change thresholds.
// Creating, deleting and re-targeting rules stays in Supabase for now.
const router = express.Router();
router.use(requireAuth, requireRole("admin"));

const ruleSelect = [
  "id, rule_name, kind, field_name, reading, comparison, threshold",
  "also_reading, also_comparison, also_threshold",
  "category_name, priority_code, activity_type, task_description",
  "enabled, needs_review, updated_at",
].join(", ");

// Allowed threshold range for each reading, matching what the sensors can report.
const readingRanges = {
  soil_moisture: [0, 100],
  humidity_percent: [0, 100],
  temperature_c: [-10, 60],
  soil_temperature_c: [-10, 70],
};

function readThreshold(value, reading, label) {
  const number = typeof value === "number" ? value : Number(String(value ?? "").trim());
  const [min, max] = readingRanges[reading] || [-1000, 1000];
  if (value === null || value === "" || !Number.isFinite(number) || number < min || number > max) {
    throw httpError(400, `${label} must be a number from ${min} to ${max}`);
  }
  return Math.round(number * 10) / 10;
}

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("monitoring_task_rules")
      .select(ruleSelect).order("rule_name").order("field_name", { nullsFirst: true });
    if (error) throw error;
    return res.json({ rules: data || [] });
  } catch (error) { return next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid rule ID");
    const body = req.body || {};
    const db = getSupabase();
    const { data: rule, error: readError } = await db.from("monitoring_task_rules")
      .select("id, reading, also_reading").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!rule) throw httpError(404, "Monitoring rule was not found");

    const changes = {};
    if ("enabled" in body) {
      if (typeof body.enabled !== "boolean") throw httpError(400, "Enabled must be true or false");
      changes.enabled = body.enabled;
    }
    if ("threshold" in body) changes.threshold = readThreshold(body.threshold, rule.reading, "Threshold");
    if ("also_threshold" in body) {
      if (!rule.also_reading) throw httpError(400, "This rule has no second condition");
      changes.also_threshold = readThreshold(body.also_threshold, rule.also_reading, "Second threshold");
    }
    if (!Object.keys(changes).length) throw httpError(400, "No rule changes were supplied");
    // Saving a threshold is the admin confirming it for this farm.
    if ("threshold" in changes || "also_threshold" in changes) changes.needs_review = false;

    const { data, error } = await db.from("monitoring_task_rules")
      .update(changes).eq("id", id).select(ruleSelect).single();
    if (error) throw error;
    return res.json({ rule: data });
  } catch (error) { return next(error); }
});

module.exports = router;
