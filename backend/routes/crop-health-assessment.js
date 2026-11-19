const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { loadAssessment } = require("../lib/crop-health-assessment-service");
const { manilaToday } = require("../lib/environmental-report");
const { recommendationsFor } = require("../lib/crop-rule-guidance");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    res.json(await loadAssessment(req.query.field, req.query.date || manilaToday()));
  } catch (error) {
    next(error);
  }
});

router.post("/recommendations", async (req, res, next) => {
  try {
    const assessment = await loadAssessment(req.body?.field, req.body?.date || manilaToday());
    const available = assessment.factors.some((factor) => factor.score != null || factor.count > 0)
      || assessment.context.soilTemperature.count > 0 || assessment.image;
    if (!available) return res.status(422).json({ error: "No assessment data is available for this field and date" });

    res.json({ recommendations: recommendationsFor(assessment), generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
