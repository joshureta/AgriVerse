const { Type } = require("@google/genai");
const { getGeminiClient } = require("./gemini");
const { getSensorSupabase } = require("./sensor-supabase");
const { getSupabase } = require("../supabase");
const { FIELDS, manilaToday, reportWindow, buildEnvironmentalReport } = require("./environmental-report");

const PAGE_SIZE = 500;
const REPORT_MODEL = process.env.ENVIRONMENTAL_REPORT_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
  const [climateRows, soilRows] = await Promise.all([
    loadFieldRows(sensor, "sensor_readings", "*", field, window),
    loadFieldRows(sensor, "soil_readings", "*", field, window),
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
    if (missingReportTable(error)) return { storageReady: false, saved: null };
    throw error;
  }
  return { storageReady: true, saved: data || null };
}

async function generateSummary(report) {
  let response;
  try {
    response = await getGeminiClient().models.generateContent({
      model: REPORT_MODEL,
      contents: `Write a plain-language environmental summary for ${report.field} on ${report.date} in Manila time.\n` +
        `Use only the measured facts in this JSON:\n${JSON.stringify(report)}\n` +
        "Write 2 or 3 concise sentences about the observed pattern and data quality. " +
        "Do not repeat numerical values because the report shows them separately. " +
        "Do not invent weather, crop conditions, disease, causes, or measurements. " +
        "If data is incomplete, clearly say this is a partial summary of available readings. " +
        "Do not describe periods without readings or imply a missing sensor was measured. " +
        "Do not call conditions safe, optimal, or dangerous without validated crop-specific thresholds. " +
        "Provide one cautious practical check based on the readings, or an empty string if none is justified.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            suggested_check: { type: Type.STRING },
          },
          required: ["summary", "suggested_check"],
        },
      },
    });
  } catch (cause) {
    const error = new Error("Gemini could not generate a summary right now. Please try again.");
    error.status = 502;
    error.cause = cause;
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(response.text || "{}");
  } catch {
    const error = new Error("The AI summary could not be validated. Please try again.");
    error.status = 502;
    throw error;
  }
  const summary = String(parsed.summary || "").trim();
  const suggestedCheck = String(parsed.suggested_check || "").trim();
  if (!summary || summary.length > 700 || suggestedCheck.length > 240 || /\d/.test(summary + suggestedCheck)) {
    const error = new Error("The AI summary could not be validated. Please try again.");
    error.status = 502;
    throw error;
  }
  return { summary, suggestedCheck, model: REPORT_MODEL };
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
    generated_at: new Date().toISOString(),
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
  const report = await computeFieldReport(field, date);
  if (!report.hasReadings) {
    if (allowPartial) {
      const error = new Error("No sensor readings are available for this field and date");
      error.status = 422;
      throw error;
    }
    return { report, saved: null, storageReady: true };
  }
  if (report.status === "insufficient" && !allowPartial) return { report, saved: null, storageReady: true };
  const existing = await getSavedReport(field, date);
  if (!existing.storageReady && !allowPartial) return { report, saved: null, storageReady: false };
  if (skipExistingFinal && existing.saved?.status === "final" && existing.saved.metrics?.status === "final") {
    return { report, saved: existing.saved, storageReady: true };
  }
  const generated = await generateSummary(report);
  if (!existing.storageReady) {
    return {
      report,
      saved: {
        summary: generated.summary,
        suggested_check: generated.suggestedCheck,
        metrics: report,
        status: report.isToday ? "preview" : "final",
        model: generated.model,
        generated_at: new Date().toISOString(),
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

module.exports = { computeFieldReport, getSavedReport, generateAndSave, finalizeYesterday };
