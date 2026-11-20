const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { manilaToday } = require("../lib/environmental-report");
const { loadMonitoringReport } = require("../lib/monitoring-report-service");
const { generateMonitoringSummary } = require("../lib/monitoring-ai-summary");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// Unified crop health + environmental monitoring report (rule-based).
router.get("/", async (req, res, next) => {
  try {
    res.json(await loadMonitoringReport(req.query.field, req.query.period || "daily", req.query.date || manilaToday()));
  } catch (error) {
    next(error);
  }
});

// AI wording of the overall summary and combined findings, built on the same rule-based report.
router.post("/summary", async (req, res, next) => {
  try {
    const report = await loadMonitoringReport(req.body?.field, req.body?.period || "daily", req.body?.date || manilaToday());
    if (!report.info.cropRecords && !report.info.environmentalReadings) {
      return res.status(422).json({ error: "No crop health or environmental records are available for this period" });
    }
    res.json({ ...(await generateMonitoringSummary(report)), generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
