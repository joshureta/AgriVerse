const FIELDS = new Set(["Field A", "Field B", "Field C", "Field D"]);
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const SAMPLE_INTERVAL_MS = 30 * 1000;
const MIN_SPAN_MS = 6 * 60 * 60 * 1000;
const MIN_COVERAGE = 50;

function manilaToday(now = Date.now()) {
  return new Date(now + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function reportWindow(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const start = Date.parse(`${date}T00:00:00+08:00`);
  if (!Number.isFinite(start) || new Date(start + MANILA_OFFSET_MS).toISOString().slice(0, 10) !== date) return null;
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

function summarizeMetric(rows, key, expected) {
  const values = rows
    .map((row) => ({ value: Number(row[key]), time: Date.parse(row.created_at) }))
    .filter(({ value, time }, index) => rows[index][key] != null && Number.isFinite(value) && Number.isFinite(time))
    .sort((left, right) => left.time - right.time);
  if (!values.length) return { count: 0, min: null, max: null, average: null, first: null, last: null, firstAt: null, lastAt: null, minAt: null, maxAt: null, hasGap: false, flatLine: false, coveragePercent: 0 };
  const numbers = values.map(({ value }) => value);
  const round = (value) => Math.round(value * 10) / 10;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const maxGapMs = values.slice(1).reduce((gap, value, index) => Math.max(gap, value.time - values[index].time), 0);
  return {
    count: numbers.length,
    min: round(min),
    max: round(max),
    average: round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length),
    first: round(numbers[0]),
    last: round(numbers[numbers.length - 1]),
    firstAt: new Date(values[0].time).toISOString(),
    lastAt: new Date(values.at(-1).time).toISOString(),
    minAt: new Date(values.find(({ value }) => value === min).time).toISOString(),
    maxAt: new Date(values.find(({ value }) => value === max).time).toISOString(),
    hasGap: maxGapMs > 10 * 60 * 1000,
    flatLine: numbers.length >= 20 && values.at(-1).time - values[0].time >= 30 * 60 * 1000 && min === max,
    coveragePercent: Math.min(100, Math.round((numbers.length / expected) * 100)),
  };
}

function buildEnvironmentalReport({ field, date, climateRows, soilRows, now = Date.now() }) {
  const window = reportWindow(date);
  if (!window || !FIELDS.has(field)) throw new Error("Invalid report field or date");
  const cutoff = Math.min(now, window.end);
  const inWindow = (row) => {
    const time = Date.parse(row.created_at);
    return Number.isFinite(time) && time >= window.start && time < cutoff;
  };
  climateRows = climateRows.filter(inWindow);
  soilRows = soilRows.filter(inWindow);
  const hasNumber = (value) => value != null && Number.isFinite(Number(value));
  const validClimateRows = climateRows.filter((row) =>
    hasNumber(row.temperature_c) || hasNumber(row.humidity_percent) || hasNumber(row.soil_moisture));
  const validSoilRows = soilRows.filter((row) => hasNumber(row.moisture_percent));
  const firstRowTime = [...validClimateRows, ...validSoilRows]
    .reduce((first, row) => Math.min(first, Date.parse(row.created_at)), Infinity);
  const elapsed = Math.max(0, cutoff - (Number.isFinite(firstRowTime) ? firstRowTime : window.start));
  const expected = Math.max(1, Math.ceil(elapsed / SAMPLE_INTERVAL_MS));
  const soilSource = validSoilRows.length ? soilRows : climateRows;
  const soilKey = validSoilRows.length ? "moisture_percent" : "soil_moisture";
  const metrics = {
    soilTemperature: summarizeMetric(climateRows, "temperature_c", expected),
    humidity: summarizeMetric(climateRows, "humidity_percent", expected),
    soilMoisture: summarizeMetric(soilSource, soilKey, expected),
  };
  const allTimes = Object.values(metrics).flatMap((metric) => [metric.firstAt, metric.lastAt])
    .filter(Boolean).map(Date.parse);
  const firstAt = allTimes.length ? new Date(Math.min(...allTimes)).toISOString() : null;
  const lastAt = allTimes.length ? new Date(Math.max(...allTimes)).toISOString() : null;
  const spanMs = allTimes.length ? Math.max(...allTimes) - Math.min(...allTimes) : 0;
  const enoughData = spanMs >= MIN_SPAN_MS && Object.values(metrics).every(
    (metric) => metric.count > 0 && metric.coveragePercent >= MIN_COVERAGE,
  );
  const hasReadings = Object.values(metrics).some((metric) => metric.count > 0);
  const qualityIssues = [];
  for (const [name, metric] of Object.entries(metrics)) {
    if (hasReadings && !metric.count) qualityIssues.push(`${name} has no valid readings`);
    if (metric.count === 1) qualityIssues.push(`${name} has only one valid reading`);
    if (metric.hasGap) qualityIssues.push(`${name} has a gap longer than 10 minutes`);
    if (metric.flatLine) qualityIssues.push(`${name} has a flat line lasting at least 30 minutes`);
  }
  if (date === manilaToday(now) && lastAt && cutoff - Date.parse(lastAt) > 10 * 60 * 1000) {
    qualityIssues.push("the latest valid reading is more than 10 minutes old");
  }
  return {
    field,
    date,
    isToday: date === manilaToday(now),
    status: enoughData ? (date === manilaToday(now) ? "ready" : "final") : "insufficient",
    hasReadings,
    firstAt,
    lastAt,
    generatedAt: new Date(now).toISOString(),
    cutoffAt: new Date(cutoff).toISOString(),
    qualityIssues,
    climateRowCount: climateRows.length,
    soilRowCount: soilRows.length,
    metrics,
    coverageRequirement: `Six hours of readings and 50% coverage indicate a fuller report; sparse readings can still be summarized`,
  };
}

module.exports = { FIELDS, manilaToday, reportWindow, buildEnvironmentalReport };
