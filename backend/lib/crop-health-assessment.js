const FACTORS = [
  { key: "cropCondition", label: "Crop condition", weight: 0.15, source: "image" },
  { key: "disease", label: "Disease status", weight: 0.20, source: "image" },
  { key: "pest", label: "Pest status", weight: 0.15, source: "image" },
  { key: "nutrient", label: "Nutrient status", weight: 0.15, source: "image" },
  { key: "temperature", label: "Air temperature", weight: 0.10, source: "sensor" },
  { key: "humidity", label: "Relative humidity", weight: 0.10, source: "sensor" },
  { key: "moisture", label: "Soil moisture", weight: 0.15, source: "sensor" },
];

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

function soilBandsFor(field, raw = process.env.ENVIRONMENTAL_SOIL_MOISTURE_TARGETS) {
  if (!raw) return null;
  try {
    const config = JSON.parse(raw)[field];
    if (config?.dryBelow == null || config?.min == null || config?.max == null) return null;
    const dryBelow = Number(config?.dryBelow);
    const min = Number(config?.min);
    const max = Number(config?.max);
    return Number.isFinite(dryBelow) && Number.isFinite(min) && Number.isFinite(max)
      && dryBelow >= 0 && dryBelow < min && min < max && max <= 100
      ? { dryBelow, min, max } : null;
  } catch {
    return null;
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

function buildAssessment({ field, from, to, climateRows = [], soilRows = [], inspection = null, soilBands = null }) {
  const temperature = summarize(climateRows, "temperature_c", from, to,
    (value) => value >= -50 && value <= 80, scoreTemperature);
  const soilTemperature = summarize(climateRows, "soil_temperature_c", from, to,
    (value) => value >= -50 && value <= 80, () => null);
  const humidity = summarize(climateRows, "humidity_percent", from, to,
    (value) => value >= 0 && value <= 100, scoreHumidity);
  const moistureRows = soilRows.some((row) => row.moisture_percent != null) ? soilRows : climateRows;
  const moistureKey = moistureRows === soilRows ? "moisture_percent" : "soil_moisture";
  const moisture = summarize(moistureRows, moistureKey, from, to,
    (value) => value >= 0 && value <= 100, (value) => scoreMoisture(value, soilBands));
  const image = inspection?.factor_scores || {};
  const imageScores = {
    cropCondition: validScore(image.cropCondition) ? image.cropCondition : null,
    disease: validScore(image.disease) ? image.disease : null,
    pest: validScore(image.pest) ? image.pest : null,
    nutrient: validScore(image.nutrient) ? image.nutrient : null,
  };
  const sensorScores = { temperature: temperature.score, humidity: humidity.score, moisture: moisture.score };
  const scores = { ...imageScores, ...sensorScores };
  const factors = FACTORS.map((factor) => ({
    ...factor,
    score: scores[factor.key],
    average: factor.key === "temperature" ? temperature.average
      : factor.key === "humidity" ? humidity.average
        : factor.key === "moisture" ? moisture.average : null,
    count: factor.key === "temperature" ? temperature.count
      : factor.key === "humidity" ? humidity.count
        : factor.key === "moisture" ? moisture.count : null,
  }));
  const environmentalScore = ["temperature", "humidity", "moisture"].every((key) => validScore(scores[key]))
    ? roundOne((0.10 * scores.temperature + 0.10 * scores.humidity + 0.15 * scores.moisture) / 0.35)
    : null;
  const cropHealthScore = factors.every((factor) => validScore(factor.score))
    ? roundOne(factors.reduce((total, factor) => total + factor.weight * factor.score, 0))
    : null;
  const latestSensorAt = [temperature, soilTemperature, humidity, moisture]
    .map((item) => item.latestAt).filter(Boolean).sort().at(-1) || null;
  return {
    field,
    period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    factors,
    context: { soilTemperature: { average: soilTemperature.average, count: soilTemperature.count, latestAt: soilTemperature.latestAt } },
    environmentalScore,
    cropHealthScore,
    classification: cropHealthScore == null ? null : classify(cropHealthScore),
    latestSensorAt,
    image: inspection ? {
      id: inspection.id,
      analyzedAt: inspection.created_at,
      healthScore: inspection.health_score,
      scoringMethod: inspection.factor_scores?.method || null,
      regions: inspection.factor_scores?.regions || [],
      issue: inspection.disease_or_issue_name,
      summary: inspection.visual_summary,
      symptoms: inspection.identified_symptoms,
      pestRating: inspection.factor_scores?.ratings?.pest || null,
      recommendations: Array.isArray(inspection.action_recommendations)
        ? inspection.action_recommendations.filter((item) => typeof item === "string" && item.trim()).slice(0, 3)
        : [],
    } : null,
    missing: factors.filter((factor) => factor.score == null).map((factor) => factor.label),
  };
}

module.exports = { FACTORS, buildAssessment, classify, scoreTemperature, scoreHumidity, scoreMoisture, soilBandsFor };
