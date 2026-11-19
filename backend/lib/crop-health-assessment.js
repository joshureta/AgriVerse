const FACTORS = [
  { key: "cropCondition", label: "Crop condition", weight: 0.15, source: "image" },
  { key: "disease", label: "Disease status", weight: 0.20, source: "image" },
  { key: "pest", label: "Pest status", weight: 0.15, source: "image" },
  { key: "nutrient", label: "Nutrient status", weight: 0.15, source: "image" },
  { key: "temperature", label: "Air temperature", weight: 0.05, source: "sensor" },
  { key: "humidity", label: "Relative humidity", weight: 0.10, source: "sensor" },
  { key: "moisture", label: "Soil moisture", weight: 0.15, source: "sensor" },
  { key: "soilTemperature", label: "Soil temperature", weight: 0.05, source: "sensor" },
];
const DEFAULT_SOIL_BANDS = Object.freeze({ dryBelow: 25, min: 30, max: 70 });

const roundOne = (value) => Math.round(value * 10) / 10;
const validScore = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

function readingTime(row) {
  for (const value of [row.recorded_at, row.created_at, row.received_at]) {
    const time = Date.parse(value);
    if (Number.isFinite(time)) return time;
  }
  return null;
}

function scoreTemperature(value) {
  if (value >= 22 && value <= 32) return 100;
  if (value >= 18 && value < 22) return 75;
  if (value > 32 && value <= 35) return 70;
  if (value >= 15 && value < 18) return 40;
  if (value > 35 && value <= 38) return 35;
  return 10;
}

function scoreHumidity(value) {
  if (value >= 65 && value <= 80) return 100;
  if ((value >= 50 && value < 65) || (value > 80 && value <= 90)) return 80;
  return 50;
}

function scoreSoilTemperature(value) {
  if (value >= 24 && value <= 30) return 100;
  if ((value >= 20 && value < 24) || (value > 30 && value <= 33)) return 75;
  if ((value >= 17 && value < 20) || (value > 33 && value <= 36)) return 40;
  return 10;
}

function soilBandsFor(field, raw = process.env.ENVIRONMENTAL_SOIL_MOISTURE_TARGETS) {
  if (!raw) return DEFAULT_SOIL_BANDS;
  try {
    const config = JSON.parse(raw)[field];
    if (config?.dryBelow == null || config?.min == null || config?.max == null) return DEFAULT_SOIL_BANDS;
    const dryBelow = Number(config?.dryBelow);
    const min = Number(config?.min);
    const max = Number(config?.max);
    return Number.isFinite(dryBelow) && Number.isFinite(min) && Number.isFinite(max)
      && dryBelow >= 0 && dryBelow < min && min < max && max <= 100
      ? { dryBelow, min, max } : DEFAULT_SOIL_BANDS;
  } catch {
    return DEFAULT_SOIL_BANDS;
  }
}

function scoreMoisture(value, bands) {
  if (!bands) return null;
  if (value < bands.dryBelow) return 35;
  if (value < bands.min) return 70;
  if (value <= bands.max) return 100;
  return 30;
}

function summarize(rows, key, from, to, valid, scoreValue) {
  const readings = rows.map((row) => ({ value: Number(row[key]), time: readingTime(row) }))
    .filter((reading, index) => rows[index][key] != null && Number.isFinite(reading.time)
      && reading.time >= from && reading.time < to && valid(reading.value))
    .sort((left, right) => left.time - right.time);
  if (!readings.length) return { score: null, average: null, count: 0, latestAt: null };
  const values = readings.map((reading) => reading.value);
  const scores = values.map(scoreValue);
  return {
    score: scores.every(validScore) ? roundOne(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
    average: roundOne(values.reduce((sum, value) => sum + value, 0) / values.length),
    count: values.length,
    latestAt: new Date(readings.at(-1).time).toISOString(),
  };
}

function classify(score) {
  if (score >= 85) return "Healthy";
  if (score >= 70) return "Moderately Healthy";
  if (score >= 50) return "Needs Attention";
  if (score >= 30) return "Unhealthy";
  return "Critical";
}

function buildAssessment({ field, from, to, climateRows = [], soilRows = [], inspection = null, inspections = [], soilBands = null }) {
  const temperature = summarize(climateRows, "temperature_c", from, to,
    (value) => value >= -50 && value <= 80, scoreTemperature);
  const soilTemperature = summarize(climateRows, "soil_temperature_c", from, to,
    (value) => value >= -50 && value <= 80, scoreSoilTemperature);
  const humidity = summarize(climateRows, "humidity_percent", from, to,
    (value) => value >= 0 && value <= 100, scoreHumidity);
  const moistureRows = soilRows.some((row) => row.moisture_percent != null) ? soilRows : climateRows;
  const moistureKey = moistureRows === soilRows ? "moisture_percent" : "soil_moisture";
  const moisture = summarize(moistureRows, moistureKey, from, to,
    (value) => value >= 0 && value <= 100, (value) => scoreMoisture(value, soilBands));
  const imageHistory = (inspections.length
    ? inspections.filter((row) => {
      const time = Date.parse(row?.created_at);
      return Number.isFinite(time) && time >= from && time < to;
    })
    : inspection ? [inspection] : [])
    .filter((row) => row?.factor_scores && typeof row.factor_scores === "object")
    .sort((left, right) => (Date.parse(right.created_at) || 0) - (Date.parse(left.created_at) || 0));
  const latestInspection = imageHistory[0] || null;
  const imageSources = Object.fromEntries(["cropCondition", "disease", "pest", "nutrient"]
    .map((key) => [key, imageHistory.filter((row) => validScore(row.factor_scores[key]))]));
  const imageScores = Object.fromEntries(Object.entries(imageSources)
    .map(([key, sources]) => [key, sources.length
      ? roundOne(sources.reduce((sum, row) => sum + row.factor_scores[key], 0) / sources.length)
      : null]));
  const sensorScores = { temperature: temperature.score, humidity: humidity.score, moisture: moisture.score,
    soilTemperature: soilTemperature.score };
  const scores = { ...imageScores, ...sensorScores };
  const factors = FACTORS.map((factor) => ({
    ...factor,
    score: scores[factor.key],
    rating: factor.source === "image"
      ? (imageSources[factor.key][0] || latestInspection)?.factor_scores?.ratings?.[factor.key] || null
      : null,
    analyzedAt: factor.source === "image" ? imageSources[factor.key][0]?.created_at || null : null,
    average: factor.key === "temperature" ? temperature.average
      : factor.key === "soilTemperature" ? soilTemperature.average
      : factor.key === "humidity" ? humidity.average
        : factor.key === "moisture" ? moisture.average : null,
    count: factor.source === "image" ? imageSources[factor.key].length
      : factor.key === "temperature" ? temperature.count
      : factor.key === "soilTemperature" ? soilTemperature.count
      : factor.key === "humidity" ? humidity.count
        : factor.key === "moisture" ? moisture.count : null,
  }));
  const environmentalScore = ["temperature", "humidity", "moisture", "soilTemperature"].every((key) => validScore(scores[key]))
    ? roundOne((0.05 * scores.temperature + 0.10 * scores.humidity + 0.15 * scores.moisture
      + 0.05 * scores.soilTemperature) / 0.35)
    : null;
  const visualFactors = factors.filter((factor) => factor.source === "image" && validScore(factor.score));
  const visualWeight = visualFactors.reduce((sum, factor) => sum + factor.weight, 0);
  const visualScore = visualWeight > 0
    ? roundOne(visualFactors.reduce((sum, factor) => sum + factor.weight * factor.score, 0) / visualWeight)
    : null;
  const scoredFactors = factors.filter((factor) => validScore(factor.score));
  const scoreWeight = scoredFactors.reduce((total, factor) => total + factor.weight, 0);
  const hasImageScore = scoredFactors.some((factor) => factor.source === "image");
  const hasSensorScore = scoredFactors.some((factor) => factor.source === "sensor");
  const cropHealthScore = hasImageScore && hasSensorScore
    ? roundOne(scoredFactors.reduce((total, factor) => total + factor.weight * factor.score, 0) / scoreWeight)
    : null;
  const scoreCoverage = roundOne(scoreWeight * 100);
  const latestSensorAt = [temperature, soilTemperature, humidity, moisture]
    .map((item) => item.latestAt).filter(Boolean).sort().at(-1) || null;
  return {
    field,
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    factors,
    context: { soilTemperature: { average: soilTemperature.average, count: soilTemperature.count, latestAt: soilTemperature.latestAt } },
    environmentalScore,
    visualScore,
    cropHealthScore,
    scoreCoverage,
    isPartial: cropHealthScore != null && scoreCoverage < 100,
    classification: cropHealthScore == null ? null : classify(cropHealthScore),
    latestSensorAt,
    image: latestInspection ? {
      id: latestInspection.id,
      analyzedAt: latestInspection.created_at,
      healthScore: latestInspection.health_score,
      scoringMethod: latestInspection.factor_scores?.method || null,
      regions: latestInspection.factor_scores?.regions || [],
      issue: latestInspection.disease_or_issue_name,
      summary: latestInspection.visual_summary,
      symptoms: latestInspection.identified_symptoms,
      pestRating: imageSources.pest[0]?.factor_scores?.ratings?.pest || null,
      nutrientRating: imageSources.nutrient[0]?.factor_scores?.ratings?.nutrient
        || latestInspection.factor_scores?.ratings?.nutrient || null,
      recommendations: Array.isArray(latestInspection.action_recommendations)
        ? latestInspection.action_recommendations.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
        : [],
      analysisCount: imageHistory.length,
    } : null,
    missing: factors.filter((factor) => factor.score == null).map((factor) => factor.label),
  };
}

module.exports = { FACTORS, DEFAULT_SOIL_BANDS, buildAssessment, classify, scoreTemperature, scoreSoilTemperature,
  scoreHumidity, scoreMoisture, soilBandsFor };
