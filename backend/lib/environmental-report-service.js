const { getSensorSupabase } = require("./sensor-supabase");
const { getSupabase } = require("../supabase");
const { FIELDS, manilaToday, reportWindow, buildEnvironmentalReport } = require("./environmental-report");
const { buildEnvironmentalSummary } = require("./environmental-summary");

const PAGE_SIZE = 500;
const buildFallbackSummary = buildEnvironmentalSummary;

function soilMoistureTarget(field) {
  if (!process.env.ENVIRONMENTAL_SOIL_MOISTURE_TARGETS) return null;
  try {
    const target = JSON.parse(process.env.ENVIRONMENTAL_SOIL_MOISTURE_TARGETS)[field];
    const min = Number(target?.min ?? target?.[0]);
    const max = Number(target?.max ?? target?.[1]);
    return Number.isFinite(min) && Number.isFinite(max) && min >= 0 && min < max && max <= 100
      ? { min, max } : null;
  } catch {
    console.warn("ENVIRONMENTAL_SOIL_MOISTURE_TARGETS is not valid JSON");
    return null;
  }
}

async function loadFieldActivities(field, date, cutoffAt) {
  const window = reportWindow(date);
  try {
    const { data, error } = await getSupabase().from("tasks")
      .select("completed_at")
      .eq("field", field)
      .ilike("category", "Irrigation")
      .gte("completed_at", new Date(window.start).toISOString())
      .lt("completed_at", cutoffAt)
      .order("completed_at", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data || []).map((task) => ({ type: "irrigation", at: task.completed_at }));
  } catch (error) {
    console.warn(`Irrigation activity records are unavailable for ${field}:`, error);
    return [];
  }
}

async function loadFieldRows(client, table, columns, field, window) {
  const rows = [];
  for (let offset = 0; ;) {
    const { data, error } = await client.from(table)
      .select(columns)
      .eq("field_name", field)
      .gte("created_at", new Date(window.start).toISOString())
      .lt("created_at", new Date(window.end).toISOString())
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...data);
    offset += data.length;
  }
  return rows;
}

async function computeFieldReport(field, date, now = Date.now()) {
  const window = reportWindow(date);
  if (!FIELDS.has(field) || !window || date > manilaToday(now)) {
    const error = new Error("Choose a valid field and a current or past date");
    error.status = 400;
    throw error;
  }
  const sensor = getSensorSupabase();
  const collectedWindow = { ...window, end: Math.min(window.end, now) };
  const [climateRows, soilRows] = await Promise.all([
    loadFieldRows(sensor, "sensor_readings", "*", field, collectedWindow),
    loadFieldRows(sensor, "soil_readings", "*", field, collectedWindow),
  ]);
  return buildEnvironmentalReport({ field, date, climateRows, soilRows, now });
}

function missingReportTable(error) {
  return ["42P01", "PGRST205"].includes(error?.code);
}

async function getSavedReport(field, date) {
  const { data, error } = await getSupabase().from("environmental_daily_reports")
    .select("summary,suggested_check,metrics,status,model,generated_at")
    .eq("field_name", field)
    .eq("report_date", date)
    .maybeSingle();
  if (error) {
    if (missingReportTable(error)) {
      console.warn("Daily report storage is unavailable. Apply migration 045_environmental_daily_reports.sql:", error);
      return { storageReady: false, saved: null };
    }
    throw error;
  }
  return { storageReady: true, saved: data || null };
}

async function saveReport(report, generated) {
  const row = {
    field_name: report.field,
    report_date: report.date,
    status: report.isToday ? "preview" : "final",
    metrics: report,
    summary: generated.summary,
    suggested_check: generated.suggestedCheck,
    model: generated.model,
    generated_at: report.generatedAt,
  };
  const { data, error } = await getSupabase().from("environmental_daily_reports")
    .upsert(row, { onConflict: "field_name,report_date" })
    .select("summary,suggested_check,metrics,status,model,generated_at")
    .single();
  if (error) {
    if (missingReportTable(error)) {
      const setupError = new Error("Apply the environmental daily reports migration to save summaries");
      setupError.status = 503;
      throw setupError;
    }
    throw error;
  }
  return data;
}

async function generateAndSave(field, date, { skipExistingFinal = false, allowPartial = false } = {}) {
  const report = await computeFieldReport(field, date, Date.now());
  if (!report.hasReadings) {
    if (allowPartial) {
      const error = new Error("No sensor readings are available for this field and date");
      error.status = 422;
      throw error;
    }
    return { report, saved: null, storageReady: true };
  }
  const existing = await getSavedReport(field, date);
  if (!existing.storageReady && !allowPartial) return { report, saved: null, storageReady: false };
  if (skipExistingFinal && existing.saved?.status === "final" && existing.saved.model === "calculated-summary-v3") {
    return { report, saved: existing.saved, storageReady: true };
  }
  const target = soilMoistureTarget(field);
  const activities = await loadFieldActivities(field, date, report.cutoffAt);
  report.soilMoistureTarget = target;
  report.activityRecords = activities;
  const generated = buildEnvironmentalSummary(report, { target, activities });
  if (!existing.storageReady) {
    return {
      report,
      saved: {
        summary: generated.summary,
        suggested_check: generated.suggestedCheck,
        metrics: report,
        status: report.isToday ? "preview" : "final",
        model: generated.model,
        generated_at: report.generatedAt,
        ephemeral: true,
      },
      storageReady: false,
    };
  }
  return { report, saved: await saveReport(report, generated), storageReady: true };
}

async function finalizeYesterday() {
  const date = manilaToday(Date.now() - 24 * 60 * 60 * 1000);
  for (const field of FIELDS) {
    try {
      await generateAndSave(field, date, { skipExistingFinal: true });
    } catch (error) {
      console.error(`Environmental report finalization failed for ${field}:`, error);
    }
  }
}

module.exports = { buildFallbackSummary, computeFieldReport, getSavedReport, generateAndSave, finalizeYesterday };
