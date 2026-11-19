const { scoreImageDiagnosis, classifyScore } = require("./crop-image-score");

const VISUAL_WEIGHTS = Object.freeze({ cropCondition: 15, disease: 20, pest: 15, nutrient: 15 });

const DESCRIPTIONS = Object.freeze({
  cropCondition: {
    label: "Crop condition",
    options: {
      none: "Visible plant or canopy has normal color and vigor throughout the assessable area.",
      mild: "Yellowing, wilting, or damage affects more than 0% and up to 10% of the assessable visible plant.",
      moderate: "Yellowing, wilting, or damage affects more than 10% and up to 30% of the assessable visible plant.",
      severe: "Yellowing, wilting, or damage affects more than 30% and up to 60% of the assessable visible plant.",
      extensive: "Yellowing, wilting, or damage affects more than 60% of the assessable visible plant.",
      unknown: "The plant or canopy is not clear enough to assess overall condition.",
    },
  },
  disease: {
    label: "Disease signs",
    options: {
      none: "The relevant plant surfaces were inspected and show no visible lesions, rot, or other disease-like signs.",
      mild: "Lesions, rot, or other disease-like signs affect more than 0% and up to 10% of assessable visible tissue.",
      moderate: "Disease-like signs affect more than 10% and up to 30% of assessable visible tissue.",
      severe: "Disease-like signs affect more than 30% and up to 60% of assessable visible tissue.",
      extensive: "Disease-like signs affect more than 60% of assessable visible tissue.",
      unknown: "The relevant tissue is not visible or the cause of damage cannot be assessed.",
    },
  },
  pest: {
    label: "Pest signs",
    options: {
      none: "Relevant surfaces were inspected and show no visible pests or pest-specific feeding signs.",
      mild: "Pests or pest-specific feeding signs affect more than 0% and up to 10% of assessable visible tissue.",
      moderate: "Pests or pest-specific feeding signs affect more than 10% and up to 30% of assessable visible tissue.",
      severe: "Pests or pest-specific feeding signs affect more than 30% and up to 60% of assessable visible tissue.",
      extensive: "Pests or pest-specific feeding signs affect more than 60% of assessable visible tissue.",
      unknown: "Relevant surfaces are not clear enough to assess pests or their feeding signs.",
    },
  },
  nutrient: {
    label: "Nutrient-related signs",
    options: {
      none: "Enough leaf tissue is visible and shows uniform normal color without a nutrient-like pattern.",
      mild: "A nutrient-like color or margin pattern affects more than 0% and up to 10% of assessable visible leaves.",
      moderate: "A nutrient-like pattern affects more than 10% and up to 30% of assessable visible leaves.",
      severe: "A nutrient-like pattern affects more than 30% and up to 60% of assessable visible leaves.",
      extensive: "A nutrient-like pattern affects more than 60% of assessable visible leaves.",
      unknown: "Not enough unaffected leaf tissue is visible to assess a nutrient-like pattern.",
    },
  },
});

const FACTOR_KEYS = Object.keys(DESCRIPTIONS);

function publicRules() {
  return FACTOR_KEYS.map((key) => ({
    key,
    label: DESCRIPTIONS[key].label,
    options: Object.entries(DESCRIPTIONS[key].options).map(([value, description]) => ({ value, description })),
  }));
}

function scoreInspection(selections) {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) {
    throw new TypeError("Choose one description for each inspection factor.");
  }
  const ratings = {};
  for (const key of FACTOR_KEYS) {
    const severity = selections[key];
    const evidence = DESCRIPTIONS[key].options[severity];
    if (!evidence) throw new TypeError(`Choose a valid description for ${DESCRIPTIONS[key].label}.`);
    ratings[key] = { severity, evidence };
  }
  if (FACTOR_KEYS.every((key) => ratings[key].severity === "unknown")) {
    throw new TypeError("At least one inspection factor must be assessable.");
  }
  const result = scoreImageDiagnosis(ratings);
  const availableWeight = FACTOR_KEYS.reduce((sum, key) => sum + (result.factorScores[key] == null ? 0 : VISUAL_WEIGHTS[key]), 0);
  const score = Math.round(FACTOR_KEYS.reduce((sum, key) =>
    sum + (result.factorScores[key] == null ? 0 : result.factorScores[key] * VISUAL_WEIGHTS[key]), 0) / availableWeight);
  const findings = FACTOR_KEYS.filter((key) => !["none", "unknown"].includes(ratings[key].severity))
    .map((key) => `${DESCRIPTIONS[key].label}: ${ratings[key].evidence}`);
  const unknown = FACTOR_KEYS.filter((key) => ratings[key].severity === "unknown");
  const recommendations = [];
  if (unknown.length) recommendations.push(`Inspect ${unknown.map((key) => DESCRIPTIONS[key].label.toLowerCase()).join(", ")} with a clearer view.`);
  if (ratings.disease.severity !== "none" && ratings.disease.severity !== "unknown") recommendations.push("Check affected tissue in the field to identify the cause before treatment.");
  if (ratings.pest.severity !== "none" && ratings.pest.severity !== "unknown") recommendations.push("Inspect leaf bases and undersides for pests and confirm the affected area.");
  if (ratings.nutrient.severity !== "none" && ratings.nutrient.severity !== "unknown") recommendations.push("Check the leaf pattern and field conditions before changing fertilizer use.");
  if (!recommendations.length) recommendations.push("Continue routine field inspection and record any new visible signs.");
  return {
    ...result,
    score,
    coverage: Math.round(availableWeight / 65 * 100),
    isPartial: availableWeight < 65,
    healthStatus: classifyScore(score),
    ratings,
    findings,
    recommendations,
    summary: findings.length ? `${findings.length} factor${findings.length === 1 ? "" : "s"} with recorded visible signs. Confirm the cause in the field.`
      : "No concerning signs were recorded in the assessable inspection factors.",
  };
}

module.exports = { publicRules, scoreInspection };
