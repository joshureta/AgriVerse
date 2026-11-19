// Environmental monitoring summary and recommendations (AgriVerse prompt, Parts 1–8).
// The backend classification fixes every status, the rule-based actions, and the
// priority order. Gemini only writes the explanations; if it is unavailable or its
// answer is unusable, template text written from the same rules is used instead.

const {
  STATUS, QUALITY, CRITICAL_STATUSES, DEVIATION_STATUSES, DATA_ISSUE_STATUSES, FRESHNESS_LIMIT_MS, priorityOf,
} = require("./environmental-classification");

const AI_MODEL_PREFIX = "environmental-ai-v1";
const RULES_MODEL = "environmental-rules-v1";

const manilaTime = (value) => new Date(value).toLocaleTimeString("en-PH", {
  timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit",
});
const formatReading = (item) => item.reading == null ? "No reading" : `${item.reading}${item.unit === "°C" ? "°C" : item.unit === "% RH" ? "% RH" : "%"}`;

// Part 5: recommendations per parameter and status.
const RECOMMENDATIONS = {
  airTemperature: {
    [STATUS.NORMAL]: ["Continue routine monitoring.", "Maintain appropriate farm management practices."],
    [STATUS.LOW]: ["Monitor temperature trends.", "Observe pineapple plants for signs of cold-related stress.", "Review field conditions and crop development."],
    [STATUS.HIGH]: ["Monitor the duration of elevated temperature.", "Check soil moisture and irrigation conditions.", "Inspect plants for visible heat-related symptoms."],
    CRITICAL: ["Verify the sensor reading.", "Prioritize field inspection.", "Assess crop exposure and consider suitable temperature-stress management practices with agricultural guidance."],
  },
  soilTemperature: {
    [STATUS.NORMAL]: ["Continue monitoring soil temperature."],
    [STATUS.LOW]: ["Monitor root-zone temperature trends.", "Inspect plant growth if low temperatures persist."],
    [STATUS.HIGH]: ["Review soil exposure and moisture conditions.", "Monitor whether elevated soil temperatures persist.", "Inspect affected areas for visible stress symptoms."],
    CRITICAL: ["Verify the sensor reading and installation.", "Inspect root-zone conditions promptly.", "Consult an agricultural expert if abnormal conditions persist."],
  },
  humidity: {
    [STATUS.NORMAL]: ["Continue routine humidity monitoring."],
    [STATUS.LOW]: ["Monitor dry atmospheric conditions.", "Check soil moisture and irrigation conditions.", "Observe plants for signs of water stress."],
    [STATUS.HIGH]: ["Monitor humidity trends.", "Inspect pineapple plants for disease symptoms.", "Review field airflow and moisture conditions where relevant."],
  },
  soilMoisture: {
    [STATUS.NORMAL]: ["Maintain the existing irrigation monitoring routine."],
    [STATUS.LOW]: ["Inspect soil moisture around the pineapple root zone.", "Review the irrigation schedule.", "Monitor whether the condition persists."],
    [STATUS.CRITICAL_LOW]: ["Prioritize soil moisture verification.", "Inspect irrigation delivery and soil conditions.", "Determine whether irrigation adjustment is necessary."],
    [STATUS.HIGH]: ["Check recent irrigation and rainfall conditions.", "Inspect drainage.", "Monitor soil moisture trends."],
    [STATUS.CRITICAL_HIGH]: ["Inspect for possible waterlogging or saturation.", "Review drainage and irrigation practices.", "Prioritize field inspection of the affected root zone."],
  },
};

const DATA_ACTIONS = {
  [STATUS.NO_DATA]: ["Check that the sensor is powered, connected, and assigned to this field."],
  [STATUS.SENSOR_ERROR]: ["Check the sensor, wiring, calibration, and communication before relying on this parameter."],
  [STATUS.STALE]: ["Check sensor connectivity and wait for a fresh reading before acting on this parameter."],
};

// Part 2: interpretation rules, used as the template implication.
const IMPLICATIONS = {
  airTemperature: {
    [STATUS.NORMAL]: "Air temperature is within the configured favorable range for pineapple cultivation.",
    [STATUS.LOW]: "Cooler conditions may slow pineapple growth, depending on how long they last and the crop stage.",
    [STATUS.HIGH]: "Continued exposure to elevated air temperature may contribute to temperature-related stress.",
    CRITICAL: "The temperature is substantially outside the configured range; prompt verification and inspection of growing conditions are needed before drawing conclusions about the crop.",
  },
  soilTemperature: {
    [STATUS.NORMAL]: "Soil temperature is within the proposed operating range for the pineapple root zone.",
    [STATUS.LOW]: "Cooler soil conditions may influence root activity and nutrient uptake.",
    [STATUS.HIGH]: "Warm soil may affect root-zone conditions if the elevated reading persists.",
    CRITICAL: "Soil temperature is substantially above the proposed range; the root zone should be verified and inspected. This reading alone does not confirm root damage.",
  },
  humidity: {
    [STATUS.NORMAL]: "Relative humidity is within the proposed favorable monitoring range.",
    [STATUS.LOW]: "The air is relatively dry and may increase evaporative demand on the plants.",
    [STATUS.HIGH]: "Prolonged humid conditions may favor certain plant diseases when other necessary conditions are present. High humidity alone does not indicate a disease outbreak.",
  },
  soilMoisture: {
    [STATUS.NORMAL]: "Soil moisture is within the desired monitoring range.",
    [STATUS.LOW]: "Soil moisture is below the farm's target range.",
    [STATUS.CRITICAL_LOW]: "Soil may be excessively dry around the root zone.",
    [STATUS.HIGH]: "Soil is wetter than the target range, which makes irrigation and drainage worth checking.",
    [STATUS.CRITICAL_HIGH]: "Soil may be excessively wet or saturated, which can affect root-zone aeration.",
  },
};

function lookup(table, key, status) {
  const entry = table[key] || {};
  return entry[status] || (CRITICAL_STATUSES.has(status) ? entry.CRITICAL : null) || entry[STATUS.NORMAL];
}

function templateDescription(item, isToday) {
  const when = item.measuredAt ? ` at ${manilaTime(item.measuredAt)}` : "";
  const reading = formatReading(item);
  const latest = isToday ? "latest" : "last recorded";
  const range = item.rangeLabel || item.referenceRange;
  if (item.thresholds && item.status === STATUS.CRITICAL_LOW) {
    return `The ${latest} reading of ${reading}${when} is at or below the configured critical-dry threshold of ${item.thresholds.criticalLow}%.`;
  }
  if (item.thresholds && item.status === STATUS.CRITICAL_HIGH) {
    return `The ${latest} reading of ${reading}${when} is at or above the configured saturation threshold of ${item.thresholds.saturated}%.`;
  }
  switch (item.status) {
    case STATUS.NO_DATA: return "No measurement is available, so this parameter cannot currently be assessed.";
    case STATUS.SENSOR_ERROR: return `The reported value (${reading}) is outside the sensor's plausible measurement range and was not used for assessment.`;
    case STATUS.STALE: return `The latest reading (${reading}${when}) is older than the ${FRESHNESS_LIMIT_MS / 60000}-minute freshness limit, so it does not represent current conditions.`;
    case STATUS.NORMAL: return `The ${latest} reading of ${reading}${when} is within the configured ${range} range.`;
    case STATUS.LOW: return `The ${latest} reading of ${reading}${when} is below the configured ${range} range.`;
    case STATUS.HIGH: return `The ${latest} reading of ${reading}${when} is above the configured ${range} range.`;
    default: return `The ${latest} reading of ${reading}${when} is substantially outside the configured ${range} range.`;
  }
}

function templateImplication(item) {
  if (item.status === STATUS.NO_DATA) return "This parameter cannot be assessed until a reading is received.";
  if (item.status === STATUS.SENSOR_ERROR) return "No environmental conclusion can be drawn from an invalid reading.";
  if (item.status === STATUS.STALE) return "No conclusion about current conditions can be drawn from an outdated reading.";
  const base = lookup(IMPLICATIONS, item.key, item.status);
  return CRITICAL_STATUSES.has(item.status) && item.singleReading
    ? `${base} This critical value was observed in a single reading and should be verified.`
    : base;
}

function actionsFor(item) {
  return DATA_ACTIONS[item.status] || lookup(RECOMMENDATIONS, item.key, item.status);
}

// Part 7E: data-quality limitations, each listed when it applies.
function buildLimitations(classification) {
  const names = (filter) => classification.parameters.filter(filter).map((item) => item.parameter).join(", ");
  const list = [];
  const missing = names((item) => item.status === STATUS.NO_DATA);
  const stale = names((item) => item.status === STATUS.STALE);
  const errors = names((item) => item.status === STATUS.SENSOR_ERROR || item.qualityNote);
  const noHistory = names((item) => item.quality === QUALITY.VALID && !item.history);
  if (missing) list.push(`Missing sensor readings: ${missing}.`);
  if (stale) list.push(`Stale measurements: ${stale}.`);
  if (errors) list.push(`Sensor errors: ${errors}.`);
  if (noHistory) list.push(`Lack of historical data: ${noHistory} (single reading only).`);
  return list;
}

function templateSummary(classification, report) {
  const { parameters, combinations } = classification;
  const names = (filter) => parameters.filter(filter).map((item) => item.parameter.toLowerCase());
  const join = (list) => list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
  const critical = parameters.filter((item) => CRITICAL_STATUSES.has(item.status));
  const deviations = parameters.filter((item) => DEVIATION_STATUSES.has(item.status));
  const normal = names((item) => item.status === STATUS.NORMAL);
  const unavailable = names((item) => DATA_ISSUE_STATUSES.has(item.status));
  const sentences = [];
  const subject = report.isToday ? `${report.field} currently shows` : `On ${report.date}, ${report.field}'s last recorded readings showed`;
  if (critical.length) {
    sentences.push(`${subject} critical readings for ${join(critical.map((item) => `${item.parameter.toLowerCase()} (${formatReading(item)}, ${item.status})`))}, which should be verified and inspected in the field promptly.`);
  }
  if (deviations.length) {
    sentences.push(`${critical.length ? "In addition," : `${subject}`} ${join(deviations.map((item) => `${item.parameter.toLowerCase()} is ${item.status === STATUS.LOW ? "below" : "above"} its configured range (${formatReading(item)})`))}.`);
  }
  if (normal.length) {
    sentences.push(`${!critical.length && !deviations.length ? `${subject} that ` : ""}${join(normal)} ${normal.length === 1 ? "is" : "are"} within the configured monitoring range${normal.length === 1 ? "" : "s"}.`.replace(/^./, (c) => c.toUpperCase()));
  }
  if (unavailable.length) sentences.push(`${join(unavailable).replace(/^./, (c) => c.toUpperCase())} could not be reliably assessed because of missing, stale, or invalid readings.`);
  for (const combo of combinations) sentences.push(combo.interpretation);
  if (classification.allNormal) sentences.push("No environmental parameter currently requires corrective attention based on the configured monitoring ranges.");
  else if (critical.length || deviations.length) sentences.push("These are environmental conditions to monitor, not confirmed plant health problems.");
  return sentences.join(" ");
}

function templateConcern(item) {
  if (CRITICAL_STATUSES.has(item.status)) return `${item.parameter} is ${item.status} (${formatReading(item)}). Verify the reading and inspect the field promptly.`;
  if (DEVIATION_STATUSES.has(item.status)) return `${item.parameter} is ${item.status === STATUS.LOW ? "below" : "above"} its configured range (${formatReading(item)}). Monitor and inspect as recommended.`;
  if (DATA_ISSUE_STATUSES.has(item.status)) return `${item.parameter} cannot be reliably monitored (${item.status}).`;
  return `${item.parameter} is within range and needs only routine monitoring.`;
}

function templateGeneralRecommendations(classification) {
  const list = [];
  const ordered = [...classification.parameters].sort((a, b) => priorityOf(a.status) - priorityOf(b.status));
  for (const combo of classification.combinations) list.push(combo.recommendation);
  for (const item of ordered) {
    if (item.status === STATUS.NORMAL) continue;
    list.push(actionsFor(item)[0]);
  }
  if (list.length < 3) list.push("Continue routine monitoring of all four environmental parameters.");
  if (list.length < 3) list.push("Maintain appropriate farm management practices and compare with the next report.");
  if (list.length < 3) list.push("Record any field observations alongside the sensor readings.");
  return [...new Set(list)].slice(0, 5);
}

function buildPrompt(classification, report) {
  const input = classification.parameters.map((item) => ({
    parameter: item.parameter,
    sensorReading: item.reading,
    unit: item.unit,
    status: item.status,
    measurementTimestamp: item.measuredAt,
    dataQuality: item.quality,
    qualityNote: item.qualityNote || null,
    configuredReferenceRange: item.referenceRange,
    criticalSeenInSingleReadingOnly: CRITICAL_STATUSES.has(item.status) ? Boolean(item.singleReading || !item.criticalRepeated) : null,
    recentHistory: item.history,
    ruleRecommendedActions: actionsFor(item),
  }));
  return `
ROLE AND OBJECTIVE
You are an AI-assisted environmental monitoring analyst specializing in pineapple cultivation and farm management for AgriVerse.
Interpret the environmental monitoring results below for ${report.field} and write a clear, accurate, practical summary for pineapple farm owners and workers.
${report.isToday ? `The data is current as of ${manilaTime(report.cutoffAt)} (Asia/Manila).` : `The data describes ${report.date}; the readings are the last ones recorded that day and must not be described as current conditions.`}

RULES
- The status of each parameter was set by backend rules. Never change, override, or invent a classification.
- Use only the provided measurements. Do not invent readings or historical trends. If recentHistory is null, describe only the current reading and do not claim that a condition persisted, increased, decreased, or improved.
- recentHistory, when present, gives only the first, minimum, maximum, and average of the day's readings; base any trend statement on those numbers only.
- NO DATA: say the parameter cannot be assessed. SENSOR ERROR: recommend checking the sensor, wiring, calibration, or communication. STALE: do not describe the reading as current; recommend checking connectivity. Never draw environmental conclusions from invalid or missing readings.
- If a critical value was seen in a single reading only, recommend verifying the measurement and do not call it persistent.
- Soil moisture uses ${classification.soilMoistureCalibrated ? "farm-calibrated thresholds" : "default, uncalibrated sensor thresholds"}; never present it as an accurate volumetric soil moisture measurement.
- Do not calculate an overall environmental health percentage, average the four readings, combine them into a score, or invent an overall CRITICAL label.
- Distinguish observed measurements from possible effects on crop growth. Never claim crop damage, pest infestation, nutrient deficiency, root damage, or disease from environmental readings. High humidity is not a disease outbreak; do not recommend disease treatment from humidity alone.
- Do not recommend a specific irrigation volume or schedule.
- When all readings are NORMAL, avoid unnecessary warnings. Keep language plain and understandable for farm owners.

SUMMARY PRIORITY
1. Critical readings first, with prompt verification and field inspection.
2. Otherwise HIGH or LOW readings, with monitoring or inspection.
3. If all four are NORMAL, say conditions are within the configured monitoring ranges.
4. If any reading is missing, stale, or invalid, explain the limitation and do not claim that all conditions are normal.

COMBINED INTERPRETATIONS DETECTED BY THE BACKEND (possible interactions, not diagnoses; mention only these):
${classification.combinations.length ? JSON.stringify(classification.combinations, null, 2) : "None"}

ENVIRONMENTAL DATA
${JSON.stringify(input, null, 2)}

OUTPUT
Respond in STRICT JSON without markdown, matching exactly:
{
  "summary": "<one short paragraph (2-4 sentences): normal parameters, abnormal parameters, critical readings if any, possible implications for pineapple cultivation>",
  "parameters": [
    {
      "parameter": "<exactly one of: Air Temperature, Soil Temperature, Air Humidity, Soil Moisture>",
      "description": "<one sentence explaining the reading relative to the configured range>",
      "possibleImplication": "<one sentence on what this may mean for pineapple cultivation, without claiming an unconfirmed effect>"
    }
  ],
  "priorityConcerns": [
    { "parameter": "<parameter name>", "concern": "<one sentence on why it needs attention>" }
  ],
  "generalRecommendations": ["<3 to 5 practical, non-repetitive recommendations based on the actual findings>"]
}
Include all four parameters in "parameters". List priorityConcerns only for parameters that are not NORMAL, most urgent first; use an empty array when all are NORMAL.`;
}

const cleanText = (value, max = 600) => typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ").slice(0, max) : null;

// Removes AI sentences that contradict hard rules (scores/percent health, invented statuses).
function safeText(value, max) {
  const text = cleanText(value, max);
  if (!text) return null;
  if (/health (score|percentage)|\b\d+(\.\d+)?% (healthy|health)|overall critical/i.test(text)) return null;
  return text;
}

function buildEnvironmentalAssessment(classification, report, ai = null) {
  const aiParams = new Map((Array.isArray(ai?.parameters) ? ai.parameters : [])
    .filter((item) => typeof item?.parameter === "string")
    .map((item) => [item.parameter.trim().toLowerCase(), item]));
  const aiConcerns = new Map((Array.isArray(ai?.priorityConcerns) ? ai.priorityConcerns : [])
    .filter((item) => typeof item?.parameter === "string")
    .map((item) => [item.parameter.trim().toLowerCase(), item]));

  const parameters = classification.parameters.map((item) => {
    const fromAi = aiParams.get(item.parameter.toLowerCase());
    return {
      key: item.key,
      parameter: item.parameter,
      reading: item.reading,
      unit: item.unit,
      displayReading: formatReading(item),
      status: item.status,
      quality: item.quality,
      measuredAt: item.measuredAt,
      referenceRange: item.referenceRange,
      description: safeText(fromAi?.description, 400) || templateDescription(item, report.isToday),
      possibleImplication: safeText(fromAi?.possibleImplication, 400) || templateImplication(item),
      recommendedActions: actionsFor(item),
      priority: priorityOf(item.status),
    };
  });

  const priorityConcerns = [...parameters]
    .sort((a, b) => a.priority - b.priority)
    .filter((item) => item.status !== STATUS.NORMAL)
    .map((item) => ({
      parameter: item.parameter,
      status: item.status,
      priority: item.priority,
      concern: safeText(aiConcerns.get(item.parameter.toLowerCase())?.concern, 300) || templateConcern(item),
    }));

  const aiRecommendations = (Array.isArray(ai?.generalRecommendations) ? ai.generalRecommendations : [])
    .map((value) => safeText(value, 300)).filter(Boolean);
  const generalRecommendations = aiRecommendations.length >= 3
    ? [...new Set(aiRecommendations)].slice(0, 5)
    : templateGeneralRecommendations(classification);

  return {
    method: classification.method,
    source: ai ? "gemini" : "rules",
    field: report.field,
    date: report.date,
    isToday: report.isToday,
    generatedAt: report.generatedAt,
    summaryPriority: classification.summaryPriority,
    allNormal: classification.allNormal,
    soilMoistureCalibrated: classification.soilMoistureCalibrated,
    summary: safeText(ai?.summary, 1200) || templateSummary(classification, report),
    parameters,
    priorityConcerns,
    noConcernMessage: priorityConcerns.length ? null : "No environmental parameter currently requires corrective attention based on the configured monitoring ranges.",
    combinations: classification.combinations,
    generalRecommendations,
    limitations: buildLimitations(classification),
  };
}

async function generateEnvironmentalAssessment(classification, report, {
  getClient = () => require("./gemini").getGeminiClient(),
  generate = (ai, prompt, options) => require("./gemini-vision").generateTextJson(ai, prompt, options),
} = {}) {
  let ai = null;
  let model = null;
  try {
    const client = getClient();
    ai = await generate(client, buildPrompt(classification, report), { onModelSuccess: (name) => { model = name; } });
  } catch (error) {
    console.warn(`Environmental AI summary unavailable for ${report.field}; using rule-based text:`, error.message);
  }
  const assessment = buildEnvironmentalAssessment(classification, report, ai);
  return { assessment, model: ai ? `${AI_MODEL_PREFIX}:${model || "gemini"}` : RULES_MODEL };
}

module.exports = {
  AI_MODEL_PREFIX, RULES_MODEL, RECOMMENDATIONS,
  buildPrompt, buildEnvironmentalAssessment, generateEnvironmentalAssessment,
};
