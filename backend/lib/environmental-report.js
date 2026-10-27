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
  if (!values.length) return { count: 0, min: null, max: null, average: null, first: null, last: null, coveragePercent: 0 };
  const numbers = values.map(({ value }) => value);
  const round = (value) => Math.round(value * 10) / 10;
  return {
    count: numbers.length,
    min: round(Math.min(...numbers)),
    max: round(Math.max(...numbers)),
    average: round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length),
    first: round(numbers[0]),
    last: round(numbers[numbers.length - 1]),
    coveragePercent: Math.min(100, Math.round((numbers.length / expected) * 100)),
  };
}

function buildEnvironmentalReport({ field, date, climateRows, soilRows, now = Date.now() }) {
  const window = reportWindow(date);
  if (!window || !FIELDS.has(field)) throw new Error("Invalid report field or date");
  const cutoff = Math.min(now, window.end);
  const elapsed = Math.max(0, cutoff - window.start);
  const expected = Math.max(1, Math.ceil(elapsed / SAMPLE_INTERVAL_MS));
  const soilSource = soilRows.length ? soilRows : climateRows;
  const soilKey = soilRows.length ? "moisture_percent" : "soil_moisture";
  const metrics = {
    soilTemperature: summarizeMetric(climateRows, "temperature_c", expected),
    humidity: summarizeMetric(climateRows, "humidity_percent", expected),
    soilMoisture: summarizeMetric(soilSource, soilKey, expected),
  };
  const allTimes = [...climateRows, ...soilRows]
    .map((row) => Date.parse(row.created_at))
    .filter(Number.isFinite);
  const firstAt = allTimes.length ? new Date(Math.min(...allTimes)).toISOString() : null;
  const lastAt = allTimes.length ? new Date(Math.max(...allTimes)).toISOString() : null;
  const spanMs = allTimes.length ? Math.max(...allTimes) - Math.min(...allTimes) : 0;
  const enoughData = spanMs >= MIN_SPAN_MS && Object.values(metrics).every(
    (metric) => metric.count > 0 && metric.coveragePercent >= MIN_COVERAGE,
  );
  const hasReadings = Object.values(metrics).some((metric) => metric.count > 0);
  return {
    field,
    date,
    isToday: date === manilaToday(now),
    status: enoughData ? (date === manilaToday(now) ? "ready" : "final") : "insufficient",
    hasReadings,
    firstAt,
    lastAt,
    climateRowCount: climateRows.length,
    soilRowCount: soilRows.length,
    metrics,
    coverageRequirement: `At least 6 hours of readings and 50% coverage for each sensor`,
  };
}

module.exports = { FIELDS, manilaToday, reportWindow, buildEnvironmentalReport };
