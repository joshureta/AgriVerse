// AgriVerse environmental classification rules (pineapple monitoring).
// The backend sets every status here; the AI only explains them.

const METHOD = "environmental-rules-v1";
const FRESHNESS_LIMIT_MS = 10 * 60 * 1000;

const STATUS = Object.freeze({
  NORMAL: "NORMAL",
  LOW: "LOW",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
  CRITICAL_LOW: "CRITICAL LOW",
  CRITICAL_HIGH: "CRITICAL HIGH",
  NO_DATA: "NO DATA",
  SENSOR_ERROR: "SENSOR ERROR",
  STALE: "STALE",
});

const QUALITY = Object.freeze({ VALID: "VALID", NO_DATA: "NO DATA", SENSOR_ERROR: "SENSOR ERROR", STALE: "STALE" });

const CRITICAL_STATUSES = new Set([STATUS.CRITICAL, STATUS.CRITICAL_LOW, STATUS.CRITICAL_HIGH]);
const DEVIATION_STATUSES = new Set([STATUS.LOW, STATUS.HIGH]);
const DATA_ISSUE_STATUSES = new Set([STATUS.NO_DATA, STATUS.SENSOR_ERROR, STATUS.STALE]);

// Default soil moisture bands mirror the live monitoring page; they are not farm-calibrated.
const DEFAULT_SOIL_MOISTURE = Object.freeze({ criticalLow: 25, min: 30, max: 70, saturated: 85 });

const PARAMETERS = [
  {
    key: "airTemperature", label: "Air Temperature", unit: "°C",
    plausible: [-10, 60],
    range: "20–30°C",
    classify: (v) => v < 15 ? STATUS.CRITICAL_LOW : v < 20 ? STATUS.LOW : v <= 30 ? STATUS.NORMAL : v <= 32 ? STATUS.HIGH : STATUS.CRITICAL_HIGH,
  },
  {
    key: "soilTemperature", label: "Soil Temperature", unit: "°C",
    plausible: [-10, 70],
    range: "25–32°C",
    classify: (v) => v < 25 ? STATUS.LOW : v <= 32 ? STATUS.NORMAL : v <= 35 ? STATUS.HIGH : STATUS.CRITICAL,
  },
  {
    key: "humidity", label: "Air Humidity", unit: "% RH",
    plausible: [0, 100],
    range: "70–85% RH",
    // Humidity never becomes CRITICAL under the current AgriVerse rules.
    classify: (v) => v < 70 ? STATUS.LOW : v <= 85 ? STATUS.NORMAL : STATUS.HIGH,
  },
  {
    key: "soilMoisture", label: "Soil Moisture", unit: "%",
    plausible: [0, 100],
  },
];

function soilMoistureBands(field, raw = process.env.ENVIRONMENTAL_SOIL_MOISTURE_TARGETS) {
  if (!raw) return { ...DEFAULT_SOIL_MOISTURE, calibrated: false };
  try {
    const config = JSON.parse(raw)[field] || {};
    const criticalLow = Number(config.criticalLow ?? config.dryBelow);
    const min = Number(config.min ?? config[0]);
    const max = Number(config.max ?? config[1]);
    const saturated = Number(config.saturated ?? config.saturatedAbove);
    if ([criticalLow, min, max, saturated].every(Number.isFinite) &&
      criticalLow >= 0 && criticalLow < min && min < max && max < saturated && saturated <= 100) {
      return { criticalLow, min, max, saturated, calibrated: true };
    }
  } catch {
    console.warn("ENVIRONMENTAL_SOIL_MOISTURE_TARGETS is not valid JSON");
  }
  return { ...DEFAULT_SOIL_MOISTURE, calibrated: false };
}

function classifySoilMoisture(value, bands) {
  if (value <= bands.criticalLow) return STATUS.CRITICAL_LOW;
  if (value < bands.min) return STATUS.LOW;
  if (value <= bands.max) return STATUS.NORMAL;
  if (value < bands.saturated) return STATUS.HIGH;
  return STATUS.CRITICAL_HIGH;
}

function round(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

// Counts readings that fall in critical bands across the day, so a single critical
// reading can be told apart from a repeated one.
function classifyParameter(param, metric, { isToday, cutoffAt, bands }) {
  const base = {
    key: param.key,
    parameter: param.label,
    unit: param.unit,
    reading: null,
    measuredAt: null,
    referenceRange: param.key === "soilMoisture"
      ? `${bands.min}–${bands.max}% target (critical dry ≤${bands.criticalLow}%, saturated ≥${bands.saturated}%)`
      : param.range,
    rangeLabel: param.key === "soilMoisture" ? `${bands.min}–${bands.max}% target` : param.range,
    thresholds: param.key === "soilMoisture" ? { criticalLow: bands.criticalLow, saturated: bands.saturated } : null,
    history: null,
  };
  if (!metric?.count) {
    return { ...base, quality: QUALITY.NO_DATA, status: STATUS.NO_DATA };
  }
  const reading = round(metric.last);
  const [low, high] = param.plausible;
  const history = metric.count > 1
    ? { count: metric.count, first: metric.first, min: metric.min, max: metric.max, average: metric.average, firstAt: metric.firstAt }
    : null;
  const result = { ...base, reading, measuredAt: metric.lastAt, history };
  if (!Number.isFinite(reading) || reading < low || reading > high) {
    return { ...result, quality: QUALITY.SENSOR_ERROR, status: STATUS.SENSOR_ERROR };
  }
  if (metric.flatLine) {
    result.qualityNote = "The reading stayed unchanged for at least 30 minutes; check that the sensor is responding.";
  }
  if (isToday && Date.parse(cutoffAt) - Date.parse(metric.lastAt) > FRESHNESS_LIMIT_MS) {
    return { ...result, quality: QUALITY.STALE, status: STATUS.STALE };
  }
  const status = param.key === "soilMoisture" ? classifySoilMoisture(reading, bands) : param.classify(reading);
  const classify = param.key === "soilMoisture" ? (v) => classifySoilMoisture(v, bands) : param.classify;
  // Only the day's extremes are known; a critical status is "repeated" when both
  // the minimum and maximum (or the earlier first reading) share the status.
  const singleReading = metric.count === 1;
  const repeated = !singleReading && CRITICAL_STATUSES.has(status) &&
    [metric.first, status.includes("LOW") ? metric.max : metric.min].some((value) => classify(value) === status);
  return { ...result, quality: QUALITY.VALID, status, singleReading, criticalRepeated: repeated };
}

const COMBINATIONS = [
  {
    id: "heat-dry",
    match: (s) => isHigh(s.airTemperature) && isLow(s.soilMoisture),
    interpretation: "Elevated air temperature together with low soil moisture may increase the risk of water-related stress.",
    recommendation: "Inspect root-zone moisture, review irrigation conditions, and monitor plant symptoms.",
  },
  {
    id: "humid-wet",
    match: (s) => isHigh(s.humidity) && isHigh(s.soilMoisture),
    interpretation: "Humid air combined with excessive soil moisture may create conditions favorable to certain plant diseases or poor root-zone aeration.",
    recommendation: "Inspect drainage, monitor soil moisture, and check plants for disease symptoms.",
  },
  {
    id: "warm-soil-dry",
    match: (s) => isHigh(s.soilTemperature) && isLow(s.soilMoisture),
    interpretation: "Warm soil and low moisture may increase root-zone stress under certain conditions.",
    recommendation: "Inspect soil conditions and review irrigation and soil management practices.",
  },
];

function isHigh(item) {
  return item?.quality === QUALITY.VALID && [STATUS.HIGH, STATUS.CRITICAL, STATUS.CRITICAL_HIGH].includes(item.status);
}

function isLow(item) {
  return item?.quality === QUALITY.VALID && [STATUS.LOW, STATUS.CRITICAL_LOW].includes(item.status);
}

function priorityOf(status) {
  if (CRITICAL_STATUSES.has(status)) return 1;
  if (DEVIATION_STATUSES.has(status)) return 2;
  if (DATA_ISSUE_STATUSES.has(status)) return 3;
  return 4;
}

function classifyEnvironment(report, { bands = soilMoistureBands(report.field) } = {}) {
  const context = { isToday: report.isToday, cutoffAt: report.cutoffAt, bands };
  const parameters = PARAMETERS.map((param) => classifyParameter(param, report.metrics?.[param.key], context));
  const byKey = Object.fromEntries(parameters.map((item) => [item.key, item]));
  const combinations = COMBINATIONS.filter((combo) => combo.match(byKey))
    .map(({ id, interpretation, recommendation }) => ({ id, interpretation, recommendation }));
  const priority = parameters.some((item) => CRITICAL_STATUSES.has(item.status)) ? 1
    : parameters.some((item) => DEVIATION_STATUSES.has(item.status)) ? 2
      : parameters.some((item) => DATA_ISSUE_STATUSES.has(item.status)) ? 4 : 3;
  return {
    method: METHOD,
    field: report.field,
    date: report.date,
    isToday: report.isToday,
    soilMoistureCalibrated: bands.calibrated,
    soilMoistureBands: { criticalLow: bands.criticalLow, min: bands.min, max: bands.max, saturated: bands.saturated },
    parameters,
    combinations,
    // Priority rule from Part 4: 1 critical, 2 high/low, 3 all normal, 4 missing/unreliable.
    summaryPriority: priority,
    allNormal: parameters.every((item) => item.status === STATUS.NORMAL),
  };
}

// Classifies one reading with the same configured bands used for the daily report.
function classifyValue(key, value, bands) {
  if (key === "soilMoisture") return classifySoilMoisture(value, bands);
  return PARAMETERS.find((param) => param.key === key).classify(value);
}

module.exports = {
  PARAMETERS, classifyValue,
  METHOD, STATUS, QUALITY, CRITICAL_STATUSES, DEVIATION_STATUSES, DATA_ISSUE_STATUSES,
  DEFAULT_SOIL_MOISTURE, FRESHNESS_LIMIT_MS,
  classifyEnvironment, soilMoistureBands, priorityOf,
};
