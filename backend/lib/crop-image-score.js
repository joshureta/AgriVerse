const FACTORS = [
  { key: "cropCondition", label: "Crop condition", weight: 0.30 },
  { key: "disease", label: "Disease severity", weight: 0.40 },
  { key: "pest", label: "Pest infestation", weight: 0.20 },
  { key: "nutrient", label: "Nutrient status", weight: 0.10 },
];

const SEVERITY_POINTS = Object.freeze({
  none: 100,
  mild: 85,
  moderate: 60,
  severe: 30,
  extensive: 10,
});

function classifyScore(score) {
  if (score === null) return "Insufficient visual evidence";
  if (score >= 81) return "Excellent";
  if (score >= 61) return "Good";
  if (score >= 41) return "Fair";
  if (score >= 21) return "Poor";
  return "Critical";
}

function scoreImageDiagnosis(ratings) {
  const factorRatings = {};
  const factorScores = {};

  for (const { key } of FACTORS) {
    const factor = ratings?.[key];
    const rawSeverity = typeof factor?.severity === "string" ? factor.severity.trim().toLowerCase() : "unknown";
    const severity = rawSeverity === "healthy" ? "none" : rawSeverity;
    const evidence = typeof factor?.evidence === "string" ? factor.evidence.trim() : "";
    const assessable = Object.hasOwn(SEVERITY_POINTS, severity) && evidence.length > 0;
    factorRatings[key] = { severity: assessable ? severity : "unknown", evidence };
    factorScores[key] = assessable ? SEVERITY_POINTS[severity] : null;
  }

  const available = FACTORS.filter(({ key }) => factorScores[key] !== null);
  const availableWeight = available.reduce((total, factor) => total + factor.weight, 0);
  const weightedTotal = available.reduce((total, factor) => total + factor.weight * factorScores[factor.key], 0);
  const score = availableWeight > 0 ? Math.round(weightedTotal / availableWeight) : null;
  const coverage = Math.round(availableWeight * 100);
  const healthStatus = classifyScore(score);

  return {
    score,
    factorScores,
    factorRatings,
    coverage,
    isPartial: coverage > 0 && coverage < 100,
    healthStatus,
  };
}

module.exports = { FACTORS, SEVERITY_POINTS, classifyScore, scoreImageDiagnosis };
