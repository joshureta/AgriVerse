function recommendationsFor(assessment, now = Date.now()) {
  const factor = Object.fromEntries(assessment.factors.map((item) => [item.key, item]));
  const actions = [];
  const add = (condition, message) => { if (condition) actions.push(message); };

  add(factor.disease?.score != null && factor.disease.score < 100,
    "Inspect the affected tissue in the field and confirm the cause before treatment.");
  add(factor.pest?.score != null && factor.pest.score < 100,
    "Check leaf bases and undersides for pests and map where signs occur.");
  add(factor.nutrient?.score != null && factor.nutrient.score < 100,
    "Check the leaf pattern and field conditions before changing fertilizer use.");
  add(factor.cropCondition?.score != null && factor.cropCondition.score < 100,
    "Compare affected and unaffected plants and record how far visible stress extends.");
  add(factor.moisture?.score != null && factor.moisture.score < 100,
    "Check soil moisture in the affected area and confirm irrigation or drainage conditions.");
  add(factor.temperature?.score != null && factor.temperature.score < 100,
    "Review air temperature readings and inspect plants for heat or cold stress.");
  add(factor.soilTemperature?.score != null && factor.soilTemperature.score < 100,
    "Review root-zone temperature readings and inspect plants for temperature-related stress.");
  add(factor.humidity?.score != null && factor.humidity.score < 100,
    "Review humidity readings and check for visible moisture-related stress.");
  const missing = assessment.factors.filter((item) => item.score == null).map((item) => item.label.toLowerCase());
  add(missing.length > 0, `Record or inspect missing factors: ${missing.join(", ")}.`);
  if (!actions.length) actions.push("Continue routine field checks and record any new visible signs.");
  const historical = assessment.date && assessment.date < new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (historical) actions.unshift("These findings are historical. Inspect current conditions before taking action.");
  return actions.slice(0, 3);
}

module.exports = { recommendationsFor };
