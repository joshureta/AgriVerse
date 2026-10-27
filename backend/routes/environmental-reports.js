const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { computeFieldReport, getSavedReport, generateAndSave } = require("../lib/environmental-report-service");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", async (req, res, next) => {
  try {
    const report = await computeFieldReport(req.query.field, req.query.date);
    const stored = await getSavedReport(report.field, report.date);
    res.json({ report, ...stored });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const result = await generateAndSave(req.body.field, req.body.date, { allowPartial: true });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
