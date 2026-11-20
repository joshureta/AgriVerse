const { getSensorSupabase } = require("./sensor-supabase");
const { getSupabase } = require("../supabase");
const { FIELDS, manilaToday, reportWindow } = require("./environmental-report");
const { soilMoistureBands } = require("./environmental-classification");
const { buildMonitoringReport, periodWindow } = require("./monitoring-report");

const PAGE_SIZE = 1000;
const PERIODS = new Set(["daily", "weekly"]);
const INSPECTION_COLUMNS = "id,created_at,field_name,assessment_source,factor_scores,health_status,disease_or_issue_name,visual_summary,image_url";

function validate(field, period, date, now) {
  if (!FIELDS.has(field) || !PERIODS.has(period) || !reportWindow(date || "") || date > manilaToday(now)) {
    const error = new Error("Choose a valid field, period, and a current or past date");
    error.status = 400;
    throw error;
  }
}

async function loadPaged(build) {
  const rows = [];
  for (let offset = 0; ;) {
    const { data, error } = await build().range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    offset += data.length;
  }
  return rows;
}

function sensorRows(client, table, columns, field, from, to, unassigned = false) {
  return loadPaged(() => {
    const query = client.from(table).select(columns)
      .gte("created_at", from).lt("created_at", to)
      .order("created_at", { ascending: true }).order("id", { ascending: true });
    return unassigned ? query.eq("device_id", "ESP32_001").is("field_name", null) : query.eq("field_name", field);
  });
}

async function loadInspections(field, from, to) {
  try {
    return await loadPaged(() => getSupabase().from("crop_health_inspections").select(INSPECTION_COLUMNS)
      .eq("field_name", field)
      .in("assessment_source", ["gemini-diagnosis", "rule-inspection"])
      .not("factor_scores", "is", null)
      .gte("created_at", from).lt("created_at", to)
      .order("created_at", { ascending: false }).order("id", { ascending: false }));
  } catch (error) {
    // The additive inspection columns may not be migrated yet; report environment only.
    if (["PGRST204", "42703"].includes(error.code)) return [];
    throw error;
  }
}

async function loadMonitoringReport(field, period, date, now = Date.now()) {
  validate(field, period, date, now);
  const window = periodWindow(period, date);
  const from = new Date(window.start).toISOString();
  const to = new Date(Math.min(window.end, now + 1)).toISOString();
  const climateColumns = "id,created_at,temperature_c,soil_temperature_c,humidity_percent,soil_moisture";
  const soilColumns = "id,created_at,moisture_percent";

  const inspections = await loadInspections(field, from, to);
  let climateRows = [];
  let soilRows = [];
  let sensorError = null;
  try {
    const sensor = getSensorSupabase();
    const legacy = field === "Field A";
    const [climate, soil, legacyClimate, legacySoil] = await Promise.all([
      sensorRows(sensor, "sensor_readings", climateColumns, field, from, to),
      sensorRows(sensor, "soil_readings", soilColumns, field, from, to),
      legacy ? sensorRows(sensor, "sensor_readings", climateColumns, field, from, to, true) : [],
      legacy ? sensorRows(sensor, "soil_readings", soilColumns, field, from, to, true) : [],
    ]);
    climateRows = [...climate, ...legacyClimate];
    soilRows = [...soil, ...legacySoil];
  } catch (error) {
    console.warn("Monitoring report sensor data unavailable:", error);
    sensorError = "Sensor readings are unavailable right now";
  }

  const report = buildMonitoringReport({
    field, period, date, inspections, climateRows, soilRows, bands: soilMoistureBands(field), now,
  });
  return { ...report, sensorError };
}

module.exports = { loadMonitoringReport };
