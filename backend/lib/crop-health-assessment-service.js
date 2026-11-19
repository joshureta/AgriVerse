const { getSensorSupabase } = require("./sensor-supabase");
const { getSupabase } = require("../supabase");
const { buildAssessment, soilBandsFor } = require("./crop-health-assessment");
const { manilaToday, reportWindow } = require("./environmental-report");

const FIELDS = new Set(["Field A", "Field B", "Field C", "Field D"]);
const PERIOD_HOURS = new Set([24, 168]);
const PAGE_SIZE = 500;

function assessmentWindow(field, dateOrHours, now = Date.now()) {
  const day = typeof dateOrHours === "string" ? reportWindow(dateOrHours) : null;
  if (day && FIELDS.has(field) && dateOrHours <= manilaToday(now)) {
    return { from: day.start, to: Math.min(day.end, now + 1), date: dateOrHours };
  }
  // Retain the existing numeric API for callers that still request a rolling period.
  const periodHours = typeof dateOrHours === "number" ? dateOrHours : NaN;
  if (FIELDS.has(field) && PERIOD_HOURS.has(periodHours)) {
    return { from: now - periodHours * 60 * 60 * 1000, to: now + 1, hours: periodHours };
  }
  const error = new Error("Choose a valid field and a current or past date");
  error.status = 400;
  throw error;
}

async function loadRows(client, table, field, from, to, unassigned = false) {
  const rows = [];
  for (let offset = 0; ;) {
    let query = client.from(table).select("*")
      .gte("created_at", new Date(from).toISOString())
      .lt("created_at", new Date(to).toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    query = unassigned
      ? query.eq("device_id", "ESP32_001").is("field_name", null)
      : query.eq("field_name", field);
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    offset += data.length;
  }
  return rows;
}

async function loadAssessment(field, dateOrHours, now = Date.now()) {
  const window = assessmentWindow(field, dateOrHours, now);
  const { data: inspection, error: inspectionError } = await getSupabase()
    .from("crop_health_inspections")
    .select("*")
    .eq("field_name", field)
    .eq("assessment_source", "gemini-diagnosis")
    .not("factor_scores", "is", null)
    .gte("created_at", new Date(window.from).toISOString())
    .lt("created_at", new Date(window.to).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // The additive migration may still be pending; sensor-only assessment remains available.
  if (inspectionError && !["PGRST204", "42703"].includes(inspectionError.code)) throw inspectionError;
  // Task proof photos and older single-score diagnoses are never used as image scores.
  const scoredInspection = inspection?.factor_scores && typeof inspection.factor_scores === "object" ? inspection : null;

  let climateRows = [];
  let soilRows = [];
  let sensorError = null;
  try {
    const sensor = getSensorSupabase();
    const [climate, soil, legacyClimate, legacySoil] = await Promise.all([
      loadRows(sensor, "sensor_readings", field, window.from, window.to),
      loadRows(sensor, "soil_readings", field, window.from, window.to),
      field === "Field A" ? loadRows(sensor, "sensor_readings", field, window.from, window.to, true) : [],
      field === "Field A" ? loadRows(sensor, "soil_readings", field, window.from, window.to, true) : [],
    ]);
    climateRows = [...climate, ...legacyClimate];
    soilRows = [...soil, ...legacySoil];
  } catch (error) {
    console.warn("Crop assessment sensor data unavailable:", error);
    sensorError = "Sensor readings are unavailable";
  }

  return {
    ...buildAssessment({
      field,
      from: window.from,
      to: window.to,
      climateRows,
      soilRows,
      inspection: scoredInspection,
      soilBands: soilBandsFor(field),
    }),
    date: window.date || null,
    sensorError,
  };
}

module.exports = { assessmentWindow, loadAssessment };
