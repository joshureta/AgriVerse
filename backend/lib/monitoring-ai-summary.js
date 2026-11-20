// Optional AI wording for the unified monitoring report. Gemini only rewrites the
// overall summary and the combined-findings explanation from the rule-based report;
// statuses, priorities, and recommendations stay fixed by the backend rules.

const MODEL_PREFIX = "monitoring-ai-v1";

function buildPrompt(report) {
  const input = {
    reportInformation: report.info,
    cropHealth: {
      periodStatus: report.crop.status,
      assessments: report.crop.recordCount,
      statusCounts: report.crop.statusCounts,
      dimensions: report.crop.dimensions.map((item) => ({
        dimension: item.label, result: item.result, highestSeverity: item.highestSeverity,
        issueCount: item.issueCount, recordCount: item.recordCount, recurring: item.recurring,
        findings: item.findings.map(({ condition, severity, status }) => ({ condition, severity, status })),
      })),
    },
    environment: report.environment.parameters.map((item) => ({
      parameter: item.parameter, unit: item.unit, configuredRange: item.range, validReadings: item.count,
      latest: item.latest, minimum: item.min, maximum: item.max, descriptiveStatus: item.descriptor,
      abnormalReadings: item.abnormalCount, criticalReadings: item.criticalCount, notable: item.notable,
    })),
    combinedScenario: { id: report.combined.scenario, title: report.combined.title, suspectedRelationships: report.combined.relationships },
    priorityConcerns: report.concerns,
    recommendedActions: report.recommendations,
    limitations: report.limitations,
  };
  return `
ROLE
You are an AI-assisted agricultural monitoring analyst for AgriVerse, specializing in pineapple (Ananas comosus) cultivation.
Write two short pieces of text for a ${report.info.period} monitoring report of ${report.info.field} (${report.info.startDate} to ${report.info.endDate}, Asia/Manila).

RULES
- Every status, severity, environmental classification, scenario, priority, and recommendation below was fixed by backend rules. Never change, override, or invent one.
- Use only the provided records. Do not invent measurements, symptoms, diagnoses, trends, or causal relationships.
- Do not calculate or mention any numerical health score or percentage. Do not average severity labels.
- Do not treat environmental readings as confirmed causes of crop problems. Mention relationships only when listed in suspectedRelationships, as possibilities.
- Do not claim improvement, worsening, spread, or persistence unless the data explicitly supports it.
- Image-based disease or nutrient findings are not laboratory-confirmed.
- Missing records are not evidence of a healthy crop.
- Use concise, plain language suitable for pineapple farm owners.

REPORT DATA
${JSON.stringify(input, null, 2)}

OUTPUT
Respond in STRICT JSON without markdown:
{
  "overview": "<one paragraph, 3-5 sentences: crop health status for the period, most significant crop findings, important environmental conditions, whether anything needs urgent attention, general management priority>",
  "combinedExplanation": "<2-3 sentences explaining how crop findings and environmental readings relate under the given scenario, distinguishing observations from possible risk factors>"
}`;
}

function safe(value, max) {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim().replace(/\s+/g, " ").slice(0, max);
  if (/health (score|percentage|index)|\b\d+(\.\d+)?\s*(\/\s*100|% (healthy|health))/i.test(text)) return null;
  return text;
}

async function generateMonitoringSummary(report, {
  getClient = () => require("./gemini").getGeminiClient(),
  generate = (ai, prompt, options) => require("./gemini-vision").generateTextJson(ai, prompt, options),
} = {}) {
  let model = null;
  try {
    const ai = await generate(getClient(), buildPrompt(report), { onModelSuccess: (name) => { model = name; } });
    const overview = safe(ai?.overview, 1400);
    const combinedExplanation = safe(ai?.combinedExplanation, 900);
    if (overview) {
      return { overview, combinedExplanation: combinedExplanation || report.combined.explanation, source: "ai", model: `${MODEL_PREFIX}:${model || "gemini"}` };
    }
  } catch (error) {
    console.warn(`Monitoring AI summary unavailable for ${report.info.field}; using rule-based text:`, error.message);
  }
  return { overview: report.overview, combinedExplanation: report.combined.explanation, source: "rules", model: null };
}

module.exports = { buildPrompt, generateMonitoringSummary };
