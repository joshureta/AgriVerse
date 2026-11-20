// AgriVerse unified crop health + environmental monitoring report (daily or weekly).
// Every status, priority, and recommendation here is fixed by rules. No combined
// numerical health score is produced and severity labels are never averaged.

const { DIMENSIONS, OVERALL, SEVERITY, STATUS: DIM_STATUS, applyDecisionTree, normalizeDimension } = require("./pineapple-assessment");
const { PARAMETERS, STATUS, CRITICAL_STATUSES, FRESHNESS_LIMIT_MS, classifyValue } = require("./environmental-classification");

const METHOD = "unified-monitoring-v1";
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CONTINUOUS_GAP_MS = 10 * 60 * 1000;
const DAILY_MIN_SPAN_MS = 6 * 60 * 60 * 1000;
const WEEKLY_MIN_DAYS = 4;

const SEVERITY_RANK = { [SEVERITY.LOW]: 1, [SEVERITY.UNDETERMINED]: 1.5, [SEVERITY.MODERATE]: 2, [SEVERITY.HIGH]: 3 };
// Rule checklists record visible extent; translate it to the validated LOW / MODERATE / HIGH labels.
const CHECKLIST_SEVERITY = {
  none: [DIM_STATUS.NO_ISSUE, SEVERITY.NOT_APPLICABLE],
  mild: [DIM_STATUS.DETECTED, SEVERITY.LOW],
  moderate: [DIM_STATUS.DETECTED, SEVERITY.MODERATE],
  severe: [DIM_STATUS.DETECTED, SEVERITY.HIGH],
  extensive: [DIM_STATUS.DETECTED, SEVERITY.HIGH],
  unknown: [DIM_STATUS.INCONCLUSIVE, SEVERITY.UNDETERMINED],
};
const PLAUSIBLE = Object.fromEntries(PARAMETERS.map((param) => [param.key, param.plausible]));
const RANGE_LABEL = Object.fromEntries(PARAMETERS.map((param) => [param.key, param.range]));

const dayKey = (time) => new Date(time + MANILA_OFFSET_MS).toISOString().slice(0, 10);
const isIssue = (dimension) => dimension.status === DIM_STATUS.SUSPECTED || dimension.status === DIM_STATUS.DETECTED;
const round = (value) => Math.round(value * 10) / 10;
const lower = (value) => value.toLowerCase();
const join = (list) => list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
const unitText = (unit) => unit === "% RH" ? "% RH" : unit === "%" ? "%" : unit;
const reading = (value, unit) => `${value}${unit === "°C" ? "°C" : ` ${unitText(unit)}`}`;

function periodWindow(period, date) {
  const end = Date.parse(`${date}T00:00:00+08:00`) + DAY_MS;
  const start = period === "weekly" ? end - 7 * DAY_MS : end - DAY_MS;
  return { start, end, startDate: dayKey(start), endDate: date };
}

// ---------- Crop health ----------

function dimensionFromRating(rating) {
  if (!rating || typeof rating !== "object") {
    return { status: DIM_STATUS.INCONCLUSIVE, severity: SEVERITY.UNDETERMINED, condition: "No finding recorded", symptoms: [], scale: null };
  }
  const checklist = CHECKLIST_SEVERITY[String(rating.severity || "").toLowerCase()];
  if (checklist && !rating.status) {
    const [status, severity] = checklist;
    const evidence = typeof rating.evidence === "string" ? rating.evidence.trim() : "";
    return {
      status, severity, symptoms: [], scale: "checklist",
      condition: evidence || (status === DIM_STATUS.NO_ISSUE ? "No significant visible symptoms" : status === DIM_STATUS.INCONCLUSIVE ? "Could not be assessed" : "Visible abnormality recorded"),
    };
  }
  const normalized = normalizeDimension(rating);
  return { status: normalized.status, severity: normalized.severity, condition: normalized.condition, symptoms: normalized.symptoms, scale: "validated" };
}

function buildRecord(row) {
  const ratings = row.factor_scores?.ratings || {};
  const dimensions = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, dimensionFromRating(ratings[key])]));
  const stored = row.factor_scores?.overall?.status;
  // Preserve the status assigned when the assessment was validated; otherwise apply the same tree.
  const status = Object.values(OVERALL).includes(stored) ? stored : applyDecisionTree(dimensions).status;
  const time = Date.parse(row.created_at);
  return {
    id: row.id,
    at: new Date(time).toISOString(),
    day: dayKey(time),
    source: row.assessment_source,
    status,
    headline: row.disease_or_issue_name || null,
    summary: row.visual_summary || null,
    imageUrl: row.image_url || null,
    dimensions,
  };
}

function summarizeDimension({ key, label }, records) {
  const entries = records.map((record) => ({ record, dimension: record.dimensions[key] }));
  const assessed = entries.filter(({ dimension }) => dimension.status !== DIM_STATUS.INCONCLUSIVE);
  const issues = entries.filter(({ dimension }) => isIssue(dimension));
  const worst = issues.reduce((top, item) => (SEVERITY_RANK[item.dimension.severity] || 0) > (SEVERITY_RANK[top?.dimension.severity] || 0) ? item : top, null);
  const findings = [];
  for (const { record, dimension } of issues) {
    if (findings.some((item) => item.condition === dimension.condition)) continue;
    findings.push({ condition: dimension.condition, severity: dimension.severity, status: dimension.status, at: record.at, symptoms: dimension.symptoms.slice(0, 4) });
  }
  const issueDays = [...new Set(issues.map(({ record }) => record.day))];
  let result;
  if (!records.length) result = "INSUFFICIENT DATA";
  else if (!assessed.length) result = "INCONCLUSIVE";
  else if (!issues.length) result = "NO ISSUE DETECTED";
  else result = worst.dimension.status;
  const latestAssessed = assessed[0]?.dimension;
  return {
    key, label, result,
    highestSeverity: worst?.dimension.severity || null,
    hasHigh: issues.some(({ dimension }) => dimension.severity === SEVERITY.HIGH),
    assessedCount: assessed.length,
    issueCount: issues.length,
    recordCount: records.length,
    issueDays,
    recurring: issues.length >= 2,
    findings: findings.slice(0, 3),
    note: issues.length ? null : latestAssessed?.condition || (records.length ? "Could not be assessed from the available records" : "No assessment recorded"),
  };
}

function cropPeriodStatus(records, dimensions) {
  if (!records.length) return OVERALL.INCONCLUSIVE;
  if (records.some((record) => record.status === OVERALL.CRITICAL) || dimensions.some((item) => item.hasHigh)) return OVERALL.CRITICAL;
  if (dimensions.some((item) => item.issueCount > 0)) return OVERALL.NEEDS_ATTENTION;
  if (records.some((record) => record.status === OVERALL.HEALTHY)) return OVERALL.HEALTHY;
  return OVERALL.INCONCLUSIVE;
}

function buildCropHealth(rows, window) {
  const records = rows
    .filter((row) => row?.factor_scores && typeof row.factor_scores === "object")
    .filter((row) => { const time = Date.parse(row.created_at); return Number.isFinite(time) && time >= window.start && time < window.cutoff; })
    .map(buildRecord)
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
  const dimensions = DIMENSIONS.map((dimension) => summarizeDimension(dimension, records));
  const statusCounts = Object.fromEntries(Object.values(OVERALL).map((status) => [status, records.filter((record) => record.status === status).length]));
  return {
    status: cropPeriodStatus(records, dimensions),
    recordCount: records.length,
    statusCounts,
    dimensions,
    records,
    usesChecklistScale: records.some((record) => Object.values(record.dimensions).some((item) => item.scale === "checklist" && isIssue(item))),
    inconclusiveCount: statusCounts[OVERALL.INCONCLUSIVE],
  };
}

// ---------- Environment ----------

function seriesFor(rows, column, key) {
  const [low, high] = PLAUSIBLE[key];
  const valid = [];
  let invalid = 0;
  for (const row of rows) {
    if (row[column] == null) continue;
    const time = Date.parse(row.created_at);
    const value = Number(row[column]);
    if (!Number.isFinite(time)) continue;
    if (!Number.isFinite(value) || value < low || value > high) { invalid += 1; continue; }
    valid.push({ time, value: round(value) });
  }
  return { valid: valid.sort((left, right) => left.time - right.time), invalid };
}

function direction(status) {
  if (status === STATUS.LOW || status === STATUS.CRITICAL_LOW) return "low";
  if (status === STATUS.NORMAL) return "normal";
  return "high";
}

const IMPLICATIONS = {
  airTemperature: {
    low: "Cooler air may slow pineapple growth, depending on how long it lasts and the crop stage.",
    high: "Elevated air temperature may contribute to temperature-related stress if it continues.",
    normal: "Air temperature stayed within the configured favorable range for pineapple.",
  },
  soilTemperature: {
    low: "Cooler soil may influence root activity and nutrient uptake.",
    high: "Warm soil may affect root-zone conditions if the elevated readings continue.",
    normal: "Soil temperature stayed within the proposed root-zone range.",
  },
  humidity: {
    low: "Dry air may increase water demand on the plants.",
    high: "Prolonged humid conditions may favor some plant diseases when other conditions are present; humidity alone does not indicate disease.",
    normal: "Relative humidity stayed within the proposed favorable range.",
  },
  soilMoisture: {
    low: "Soil around the root zone may be drier than the farm's target.",
    high: "Soil wetter than the target may affect root-zone aeration and is worth checking against irrigation and drainage.",
    normal: "Soil moisture stayed within the configured target range.",
  },
};

function longestAbnormalRun(points) {
  let longest = 0;
  let runStart = null;
  let previous = null;
  for (const point of points) {
    const abnormal = point.status !== STATUS.NORMAL;
    const continuous = previous && point.time - previous.time <= CONTINUOUS_GAP_MS;
    if (!abnormal) runStart = null;
    else if (runStart == null || !continuous) runStart = point.time;
    else longest = Math.max(longest, point.time - runStart);
    previous = point;
  }
  return longest;
}

function summarizeParameter(param, series, { period, window, bands }) {
  const base = {
    key: param.key, parameter: param.label, unit: param.unit, invalidCount: series.invalid,
    range: param.key === "soilMoisture"
      ? `${bands.min}–${bands.max}% target (critical dry ≤${bands.criticalLow}%, saturated ≥${bands.saturated}%)`
      : RANGE_LABEL[param.key],
  };
  const points = series.valid.map((point) => ({ ...point, status: classifyValue(param.key, point.value, bands) }));
  if (!points.length) {
    return { ...base, count: 0, descriptor: "INSUFFICIENT DATA", tone: "muted", latest: null, min: null, max: null,
      statusCounts: {}, abnormalCount: 0, criticalCount: 0, abnormalDays: [], notable: [],
      implication: "This parameter could not be assessed for the selected period." };
  }
  const latest = points.at(-1);
  const min = points.reduce((best, point) => point.value < best.value ? point : best);
  const max = points.reduce((best, point) => point.value > best.value ? point : best);
  const statusCounts = {};
  for (const point of points) statusCounts[point.status] = (statusCounts[point.status] || 0) + 1;
  const abnormal = points.filter((point) => point.status !== STATUS.NORMAL);
  const critical = points.filter((point) => CRITICAL_STATUSES.has(point.status));
  const days = new Set(points.map((point) => dayKey(point.time)));
  const abnormalDays = [...new Set(abnormal.map((point) => dayKey(point.time)))];
  const lowCount = abnormal.filter((point) => direction(point.status) === "low").length;
  const highCount = abnormal.length - lowCount;
  const side = lowCount && highCount ? "LOW AND HIGH" : lowCount ? "LOW" : "HIGH";
  const span = latest.time - points[0].time;
  const sufficient = period === "weekly" ? days.size >= WEEKLY_MIN_DAYS : span >= DAILY_MIN_SPAN_MS && points.length >= 12;
  const stale = window.isCurrent && window.cutoff - latest.time > FRESHNESS_LIMIT_MS;

  let descriptor;
  let tone;
  if (critical.length) { descriptor = "CRITICAL READING RECORDED"; tone = "critical"; }
  else if (period === "daily") {
    if (!abnormal.length) { descriptor = points.length === 1 ? "NORMAL (SINGLE READING)" : sufficient ? "NORMAL" : "NORMAL (LIMITED DATA)"; tone = "normal"; }
    else { descriptor = `${side} READINGS RECORDED`; tone = "warning"; }
  } else if (!sufficient) { descriptor = "INSUFFICIENT DATA"; tone = abnormal.length ? "warning" : "muted"; }
  else if (!abnormal.length) { descriptor = "CONSISTENTLY NORMAL"; tone = "normal"; }
  else {
    const frequent = abnormalDays.length >= 3 || abnormal.length / points.length >= 0.3;
    descriptor = `${frequent ? "FREQUENTLY" : "OCCASIONALLY"} ${side}`;
    tone = "warning";
  }

  const notable = [];
  const worstLow = critical.find((point) => direction(point.status) === "low") || abnormal.find((point) => direction(point.status) === "low");
  const worstHigh = critical.find((point) => direction(point.status) === "high") || abnormal.find((point) => direction(point.status) === "high");
  if (critical.length) {
    notable.push(`${critical.length} critical reading${critical.length === 1 ? "" : "s"} (${join([...new Set(critical.map((point) => point.status))])})${critical.length === 1 ? " — a single reading; verify the sensor" : ""}.`);
  }
  if (abnormal.length) {
    notable.push(`${abnormal.length} of ${points.length} readings outside the configured range${period === "weekly" ? ` on ${abnormalDays.length} of ${days.size} days with data` : ""}.`);
    const run = longestAbnormalRun(points);
    if (run >= 30 * 60 * 1000) notable.push(`Longest continuous out-of-range stretch: about ${round(run / 3600000)} hours.`);
  }
  if (series.invalid) notable.push(`${series.invalid} reading${series.invalid === 1 ? "" : "s"} outside the sensor's plausible range ${series.invalid === 1 ? "was" : "were"} excluded.`);
  if (stale) notable.push(`Latest reading is older than ${FRESHNESS_LIMIT_MS / 60000} minutes; it may not reflect current conditions.`);

  const sides = [worstLow && "low", worstHigh && "high"].filter(Boolean);
  const implication = sides.length
    ? sides.map((key) => IMPLICATIONS[param.key][key]).join(" ")
    : IMPLICATIONS[param.key].normal;

  return {
    ...base,
    count: points.length,
    daysWithData: days.size,
    sufficient,
    stale,
    descriptor,
    tone,
    latest: { value: latest.value, at: new Date(latest.time).toISOString(), status: latest.status },
    min: { value: min.value, at: new Date(min.time).toISOString(), status: min.status },
    max: { value: max.value, at: new Date(max.time).toISOString(), status: max.status },
    statusCounts,
    abnormalCount: abnormal.length,
    criticalCount: critical.length,
    abnormalSides: sides,
    abnormalDays,
    criticalDays: [...new Set(critical.map((point) => dayKey(point.time)))],
    notable,
    implication,
  };
}

function buildEnvironment({ climateRows, soilRows, period, window, bands }) {
  const inWindow = (row) => { const time = Date.parse(row.created_at); return Number.isFinite(time) && time >= window.start && time < window.cutoff; };
  climateRows = climateRows.filter(inWindow);
  soilRows = soilRows.filter(inWindow);
  const soilSeries = seriesFor(soilRows, "moisture_percent", "soilMoisture");
  const series = {
    airTemperature: seriesFor(climateRows, "temperature_c", "airTemperature"),
    soilTemperature: seriesFor(climateRows, "soil_temperature_c", "soilTemperature"),
    humidity: seriesFor(climateRows, "humidity_percent", "humidity"),
    soilMoisture: soilSeries.valid.length ? soilSeries : seriesFor(climateRows, "soil_moisture", "soilMoisture"),
  };
  const parameters = PARAMETERS.map((param) => summarizeParameter(param, series[param.key], { period, window, bands }));
  const withData = parameters.filter((item) => item.count > 0);
  let status;
  if (!withData.length) status = "NO DATA";
  else if (parameters.some((item) => item.criticalCount)) status = "CRITICAL READING";
  else if (parameters.some((item) => item.abnormalCount)) status = "OUT OF RANGE";
  else if (withData.length === parameters.length) status = "WITHIN RANGE";
  else status = "PARTIAL DATA";
  return {
    status,
    recordCount: climateRows.length + soilRows.length,
    readingCount: parameters.reduce((sum, item) => sum + item.count, 0),
    soilMoistureCalibrated: Boolean(bands.calibrated),
    parameters,
  };
}

// ---------- Combined interpretation ----------

const RELATIONSHIPS = [
  {
    dimension: "disease",
    match: (env) => env.humidity.abnormalSides?.includes("high") ? "humidity" : env.soilMoisture.abnormalSides?.includes("high") ? "soilMoisture" : null,
    text: (param) => `Plant disease symptoms were recorded while ${param === "humidity" ? "relative humidity" : "soil moisture"} was above its configured range. Humid or wet conditions may favor some pineapple diseases, but this does not confirm the cause.`,
  },
  {
    dimension: "cropCondition",
    match: (env) => env.soilMoisture.abnormalSides?.includes("low") ? "soilMoisture" : env.airTemperature.abnormalSides?.includes("high") ? "airTemperature" : null,
    text: (param) => `Crop condition symptoms were recorded while ${param === "soilMoisture" ? "soil moisture was below target" : "air temperature was above its configured range"}. Water or temperature stress is a possible contributor that should be checked in the field.`,
  },
  {
    dimension: "nutrient",
    match: (env) => env.soilMoisture.abnormalCount ? "soilMoisture" : env.soilTemperature.abnormalSides?.includes("low") ? "soilTemperature" : null,
    text: (param) => `Possible nutrient-related symptoms were recorded while ${param === "soilMoisture" ? "soil moisture was outside its target range" : "soil temperature was below its configured range"}. Root-zone conditions can affect nutrient uptake; soil or tissue testing is needed to confirm a deficiency.`,
  },
];

function buildCombined(crop, environment) {
  const env = Object.fromEntries(environment.parameters.map((item) => [item.key, item]));
  const abnormal = environment.parameters.filter((item) => item.abnormalCount > 0);
  const critical = environment.parameters.filter((item) => item.criticalCount > 0);
  const issueDims = crop.dimensions.filter((item) => item.issueCount > 0);
  const envMissing = environment.parameters.every((item) => item.count === 0);
  const cropMissing = crop.status === OVERALL.INCONCLUSIVE;

  let scenario;
  if (crop.status === OVERALL.CRITICAL) scenario = "E";
  else if (critical.length) scenario = "F";
  else if (cropMissing || envMissing) scenario = "G";
  else if (crop.status === OVERALL.HEALTHY) scenario = abnormal.length ? "B" : "A";
  else scenario = abnormal.length ? "D" : "C";

  const SCENARIO_TITLE = {
    A: "Healthy crop, normal environment",
    B: "Healthy crop, environment needs attention",
    C: "Crop needs attention, environment within range",
    D: "Crop needs attention, environment out of range",
    E: "Critical crop health finding",
    F: "Critical environmental reading",
    G: "Insufficient data",
  };

  const direct = [
    ...issueDims.map((item) => `${item.label}: ${item.findings[0].condition} (${item.highestSeverity === SEVERITY.UNDETERMINED ? "severity undetermined" : `${lower(item.highestSeverity)} severity`}, ${item.issueCount} of ${item.recordCount} assessment${item.recordCount === 1 ? "" : "s"}).`),
    ...(crop.status === OVERALL.HEALTHY ? ["The available crop assessments show no significant visible symptoms."] : []),
    ...environment.parameters.filter((item) => item.count).map((item) => `${item.parameter}: latest ${reading(item.latest.value, item.unit)} (${item.latest.status}); ${item.descriptor.toLowerCase()}.`),
  ];
  const risks = abnormal.map((item) => item.implication);
  const relationships = [];
  for (const rule of RELATIONSHIPS) {
    const dim = crop.dimensions.find((item) => item.key === rule.dimension);
    if (!dim?.issueCount) continue;
    const param = rule.match(env);
    // Only relate findings that overlap in time (same day) within the same field.
    if (param && env[param].abnormalDays.some((day) => dim.issueDays.includes(day))) relationships.push(rule.text(param));
  }
  const confirm = [
    ...issueDims.filter((item) => item.findings.some((finding) => finding.status === DIM_STATUS.SUSPECTED))
      .map((item) => `${item.label}: the suspected cause needs field or expert confirmation.`),
    ...(issueDims.some((item) => item.key === "disease") ? ["Image-based disease findings are not laboratory-confirmed diagnoses."] : []),
    ...critical.filter((item) => item.criticalCount === 1).map((item) => `${item.parameter}: the single critical reading should be verified on site.`),
  ];

  const explanation = {
    A: "The available crop assessments show no significant issues and the monitored environmental readings stayed within their configured ranges. Conditions in the available observations are generally favorable.",
    B: `The crop shows no significant visible symptoms in the available assessments, but ${join(abnormal.map((item) => lower(item.parameter)))} ${abnormal.length === 1 ? "was" : "were"} outside the configured range. The crop status is unchanged; watch for emerging symptoms.`,
    C: `Crop symptoms were recorded in ${join(issueDims.map((item) => lower(item.label)))}, while the monitored environmental readings show no corresponding abnormality. The symptoms should be investigated directly; normal readings do not mean the crop is healthy.`,
    D: `Crop symptoms were recorded in ${join(issueDims.map((item) => lower(item.label)))} and ${join(abnormal.map((item) => lower(item.parameter)))} ${abnormal.length === 1 ? "was" : "were"} outside the configured range. ${relationships.length ? "Some timing overlaps are noted below as possible relationships, not confirmed causes." : "No agriculturally supported relationship between them is indicated by the timing of the records."}`,
    E: `A HIGH-severity crop health finding was recorded and takes priority${abnormal.length ? ` over the environmental deviations` : " even though the environmental readings stayed within range"}.`,
    F: `A critical ${join(critical.map((item) => lower(item.parameter)))} reading was recorded without a critical crop health finding. The environmental concern is highlighted separately and does not change the crop status.`,
    G: `${cropMissing ? (crop.recordCount ? "The crop assessments were inconclusive" : "No crop health assessment was recorded") : ""}${cropMissing && envMissing ? " and " : ""}${envMissing ? (cropMissing ? "no environmental readings were available" : "No environmental readings were available") : ""}${cropMissing && !envMissing ? ", so the environmental readings cannot be related to the crop" : ""}${envMissing && !cropMissing ? ", so crop findings cannot be compared with field conditions" : ""}. No combined conclusion is drawn.`,
  }[scenario];

  return { scenario, title: SCENARIO_TITLE[scenario], explanation, direct, risks, relationships, confirm };
}

// ---------- Priorities and recommendations ----------

const CROP_ACTIONS = {
  pest: "Inspect the affected plants and nearby crops for pests, and consult an agricultural expert on appropriate pest management.",
  nutrient: "Check how the symptoms are distributed, review nutrient management records, and consider soil or plant-tissue testing.",
  disease: "Inspect the symptomatic plants, watch for additional symptoms, and get expert confirmation before any treatment.",
  cropCondition: "Inspect the affected plant parts, review recent farm management practices, and keep monitoring for changes.",
};
const ENV_ACTIONS = {
  airTemperature: "Review air temperature trends, inspect plants for temperature-related stress, and check irrigation and field conditions.",
  soilTemperature: "Monitor root-zone conditions, inspect soil exposure and moisture, and verify unusual soil temperature readings.",
  humidity: "Monitor humidity, inspect plants for possible disease symptoms, and review airflow and moisture conditions.",
  soilMoisture: "Inspect soil moisture around the root zone, review irrigation and drainage, and verify sensor calibration.",
};

function buildPriorities(crop, environment, combined, period) {
  const items = [];
  const add = (rank, item) => items.push({ rank, ...item });
  const repeated = (item) => item.descriptor.startsWith("FREQUENTLY") || (period === "daily" && item.abnormalCount >= 3);

  for (const dim of crop.dimensions) {
    if (!dim.issueCount) continue;
    const finding = dim.findings[0];
    const severity = dim.highestSeverity;
    if (severity === SEVERITY.HIGH) {
      add(1, { level: "URGENT", related: dim.label, concern: `${dim.label}: ${finding.condition}`,
        reason: "HIGH-severity crop health finding",
        action: `Promptly inspect the affected plants in the field and seek agricultural guidance. ${CROP_ACTIONS[dim.key]}` });
    } else if (severity === SEVERITY.MODERATE || severity === SEVERITY.UNDETERMINED) {
      add(3, { level: "HIGH", related: dim.label, concern: `${dim.label}: ${finding.condition}`,
        reason: severity === SEVERITY.MODERATE ? "MODERATE-severity crop health finding" : "Issue recorded with undetermined severity",
        action: CROP_ACTIONS[dim.key] });
    } else {
      add(5, { level: "ROUTINE", related: dim.label, concern: `${dim.label}: ${finding.condition}`,
        reason: "LOW-severity crop health finding", action: CROP_ACTIONS[dim.key] });
    }
  }
  for (const item of environment.parameters) {
    if (item.criticalCount) {
      add(2, { level: "URGENT", related: item.parameter, concern: `${item.parameter}: ${item.descriptor.toLowerCase()}`,
        reason: `Critical reading recorded (${join([...new Set(Object.keys(item.statusCounts).filter((status) => CRITICAL_STATUSES.has(status)))])})`,
        action: `Verify the ${lower(item.parameter)} reading, inspect the affected area, and monitor the crop.` });
    } else if (item.abnormalCount && repeated(item)) {
      add(4, { level: "HIGH", related: item.parameter, concern: `${item.parameter}: ${item.descriptor.toLowerCase()}`,
        reason: "Repeated readings outside the configured range", action: ENV_ACTIONS[item.key] });
    } else if (item.abnormalCount) {
      add(5, { level: "ROUTINE", related: item.parameter, concern: `${item.parameter}: ${item.descriptor.toLowerCase()}`,
        reason: "Occasional readings outside the configured range", action: ENV_ACTIONS[item.key] });
    }
  }
  if (crop.recordCount === 0) {
    add(6, { level: "ROUTINE", related: "Crop health records", concern: "No crop health assessment recorded",
      reason: "Crop health could not be assessed for this period",
      action: "Record a crop photo assessment for this field so crop health can be evaluated." });
  } else if (crop.status === OVERALL.INCONCLUSIVE) {
    add(6, { level: "ROUTINE", related: "Crop health records", concern: "Crop assessments were inconclusive",
      reason: "Images did not show enough of the plant",
      action: "Take clearer photos of the affected leaves and the plant's center, or inspect the plants in the field." });
  }
  const missing = environment.parameters.filter((item) => !item.count);
  if (missing.length) {
    add(6, { level: "ROUTINE", related: join(missing.map((item) => item.parameter)), concern: `No valid readings for ${join(missing.map((item) => lower(item.parameter)))}`,
      reason: "Environmental conditions could not be fully assessed",
      action: "Check that the field sensors are powered, connected, and assigned to this field." });
  }
  const stale = environment.parameters.filter((item) => item.stale);
  if (stale.length) {
    add(6, { level: "ROUTINE", related: join(stale.map((item) => item.parameter)), concern: "Sensor data is stale",
      reason: "Latest readings are older than the freshness limit",
      action: "Check sensor connectivity and wait for fresh readings before acting on them." });
  }

  items.sort((left, right) => left.rank - right.rank);
  const concerns = items.filter((item) => item.rank <= 5).map(({ rank, level, concern, reason, related }) => ({ rank, level, concern, reason, related }));

  const recommendations = [];
  for (const item of items) {
    const existing = recommendations.find((rec) => rec.action === item.action);
    if (existing) { if (!existing.related.includes(item.related)) existing.related = `${existing.related}, ${item.related}`; continue; }
    recommendations.push({ action: item.action, reason: item.reason, priority: item.level, related: item.related });
  }
  const routine = [
    combined.scenario === "B" && { action: "Inspect the crop for emerging symptoms while the out-of-range readings are monitored.", reason: "The crop looks healthy but conditions need attention", related: "Crop condition" },
    { action: "Continue routine crop photo inspections and environmental monitoring for this field.", reason: "Keeps the next report comparable with this one", related: "All monitoring" },
    { action: "Record field observations alongside each crop inspection so later reports can compare the same areas.", reason: "Comparable records are needed to confirm changes over time", related: "Crop health records" },
    { action: "Check sensor placement and calibration periodically so environmental readings stay reliable.", reason: "Reliable readings keep the environmental classifications accurate", related: "Environmental sensors" },
  ].filter(Boolean);
  for (const item of routine) {
    if (recommendations.length >= 3) break;
    recommendations.push({ ...item, priority: "ROUTINE" });
  }
  return { concerns, recommendations: recommendations.slice(0, 5) };
}

// ---------- Summary and limitations ----------

function buildLimitations({ crop, environment, window, period, field }) {
  const list = [];
  if (!crop.recordCount) list.push("No crop health assessment was recorded in this period; missing records are not evidence of a healthy crop.");
  else if (crop.inconclusiveCount) list.push(`${crop.inconclusiveCount} of ${crop.recordCount} crop assessment${crop.recordCount === 1 ? " was" : "s were"} inconclusive.`);
  if (crop.recordCount) list.push("Crop findings are image-based visual assessments, not laboratory-confirmed diagnoses, and may not represent every plant in the field.");
  if (crop.usesChecklistScale) list.push("Some records used the rule checklist scale (mild to extensive); it was mapped to LOW, MODERATE, or HIGH severity.");
  if (period === "weekly" && crop.recordCount > 1) list.push("Records do not identify the same plants or areas, so improvement, worsening, or spread is not claimed.");
  const missing = environment.parameters.filter((item) => !item.count).map((item) => item.parameter);
  if (missing.length) list.push(`No valid readings for ${join(missing)}.`);
  const sparse = environment.parameters.filter((item) => item.count && !item.sufficient).map((item) => item.parameter);
  if (sparse.length) list.push(`${join(sparse)} ${sparse.length === 1 ? "has" : "have"} limited coverage, so ${period === "weekly" ? "weekly patterns" : "all-day conditions"} cannot be confirmed.`);
  const stale = environment.parameters.filter((item) => item.stale).map((item) => item.parameter);
  if (stale.length) list.push(`Stale sensor data: ${join(stale)}.`);
  if (environment.parameters.some((item) => item.invalidCount)) list.push("Some sensor values were outside the plausible range and were excluded.");
  if (!environment.soilMoistureCalibrated) list.push("Soil moisture uses default thresholds that are not yet calibrated for this farm.");
  if (field === "Field A" && environment.readingCount) list.push("Field A also includes readings from the unassigned field sensor (ESP32_001).");
  if (!window.isCurrent) list.push("These findings are historical; inspect current conditions before taking action.");
  return list;
}

function buildOverview({ field, period, crop, environment, combined, priorities }) {
  const periodText = period === "weekly" ? "this week" : "this day";
  const sentences = [];
  const label = { [OVERALL.HEALTHY]: "HEALTHY", [OVERALL.NEEDS_ATTENTION]: "NEEDS ATTENTION", [OVERALL.CRITICAL]: "CRITICAL", [OVERALL.INCONCLUSIVE]: "INCONCLUSIVE" }[crop.status];
  sentences.push(crop.recordCount
    ? `${field}'s crop health status for ${periodText} is ${label}, based on ${crop.recordCount} assessment${crop.recordCount === 1 ? "" : "s"}.`
    : `No crop health assessment was recorded for ${field} ${periodText}, so crop health is INCONCLUSIVE.`);
  const issues = crop.dimensions.filter((item) => item.issueCount)
    .sort((left, right) => (SEVERITY_RANK[right.highestSeverity] || 0) - (SEVERITY_RANK[left.highestSeverity] || 0));
  if (issues.length) {
    const top = issues[0];
    sentences.push(`The most significant finding is ${lower(top.label)}: ${top.findings[0].condition.replace(/\.$/, "")} (${top.highestSeverity === SEVERITY.UNDETERMINED ? "severity undetermined" : `${lower(top.highestSeverity)} severity`}).`);
  } else if (crop.status === OVERALL.HEALTHY) {
    sentences.push("No significant visible crop issues were recorded.");
  }
  const critical = environment.parameters.filter((item) => item.criticalCount);
  const abnormal = environment.parameters.filter((item) => item.abnormalCount && !item.criticalCount);
  const normal = environment.parameters.filter((item) => item.count && !item.abnormalCount);
  if (!environment.readingCount) sentences.push("No environmental readings were available.");
  else {
    const parts = [
      critical.length && `critical readings were recorded for ${join(critical.map((item) => lower(item.parameter)))}`,
      abnormal.length && `${join(abnormal.map((item) => lower(item.parameter)))} ${abnormal.length === 1 ? "was" : "were"} outside the configured range at times`,
      normal.length && `${join(normal.map((item) => lower(item.parameter)))} stayed within range`,
    ].filter(Boolean);
    sentences.push(`${parts.join("; ").replace(/^./, (char) => char.toUpperCase())}.`);
  }
  const urgent = priorities.recommendations.filter((item) => item.priority === "URGENT");
  sentences.push(urgent.length
    ? `${urgent.length === 1 ? "One finding requires" : `${urgent.length} findings require`} urgent attention; prioritize ${lower(urgent[0].related)}.`
    : priorities.recommendations.some((item) => item.priority === "HIGH")
      ? `Nothing requires urgent action; the main priority is ${lower(priorities.recommendations[0].related)}.`
      : combined.scenario === "G" ? "Collect the missing records before drawing conclusions." : "No urgent action is needed; continue routine monitoring.");
  return sentences.join(" ");
}

function buildMonitoringReport({ field, period, date, inspections = [], climateRows = [], soilRows = [], bands, now = Date.now() }) {
  const base = periodWindow(period, date);
  const window = { ...base, cutoff: Math.min(base.end, now), isCurrent: now < base.end };
  const crop = buildCropHealth(inspections, window);
  const environment = buildEnvironment({ climateRows, soilRows, period, window, bands });
  const combined = buildCombined(crop, environment);
  const priorities = buildPriorities(crop, environment, combined, period);
  return {
    method: METHOD,
    info: {
      field,
      period: period.toUpperCase(),
      startDate: window.startDate,
      endDate: window.endDate,
      start: new Date(window.start).toISOString(),
      end: new Date(window.cutoff).toISOString(),
      timezone: "Asia/Manila",
      isCurrent: window.isCurrent,
      cropRecords: crop.recordCount,
      environmentalRecords: environment.recordCount,
      environmentalReadings: environment.readingCount,
    },
    overview: buildOverview({ field, period, crop, environment, combined, priorities }),
    overviewSource: "rules",
    crop,
    environment,
    combined,
    concerns: priorities.concerns,
    recommendations: priorities.recommendations,
    limitations: buildLimitations({ crop, environment, window, period, field }),
    generatedAt: new Date(now).toISOString(),
  };
}

module.exports = { METHOD, periodWindow, buildRecord, buildMonitoringReport };
