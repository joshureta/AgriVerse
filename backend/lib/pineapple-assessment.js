// Pineapple crop health assessment: the AI describes what it sees in four dimensions,
// and this module enforces the detection/severity rules and the overall decision tree.

const METHOD = "pineapple-decision-tree-v1";

const DIMENSIONS = [
  { key: "cropCondition", label: "Crop Condition" },
  { key: "pest", label: "Pest Infestation" },
  { key: "nutrient", label: "Nutrient Deficiency" },
  { key: "disease", label: "Plant Diseases" },
];

const STATUS = Object.freeze({
  NO_ISSUE: "NO ISSUE DETECTED",
  SUSPECTED: "ISSUE SUSPECTED",
  DETECTED: "ISSUE DETECTED",
  INCONCLUSIVE: "INCONCLUSIVE",
});

const SEVERITY = Object.freeze({
  NOT_APPLICABLE: "NOT APPLICABLE",
  UNDETERMINED: "UNDETERMINED",
  LOW: "LOW",
  MODERATE: "MODERATE",
  HIGH: "HIGH",
});

const OVERALL = Object.freeze({
  HEALTHY: "HEALTHY",
  NEEDS_ATTENTION: "NEEDS ATTENTION",
  CRITICAL: "CRITICAL",
  INCONCLUSIVE: "INCONCLUSIVE",
});

// Stored as health_status so lists and reports read naturally.
const OVERALL_LABEL = Object.freeze({
  [OVERALL.HEALTHY]: "Healthy",
  [OVERALL.NEEDS_ATTENTION]: "Needs Attention",
  [OVERALL.CRITICAL]: "Critical",
  [OVERALL.INCONCLUSIVE]: "Inconclusive",
});

// Fixed per-dimension points kept only for the combined image + sensor field assessment.
// They are derived from the severity rules, never produced by the AI.
const SEVERITY_POINTS = Object.freeze({
  [SEVERITY.NOT_APPLICABLE]: 100,
  [SEVERITY.LOW]: 85,
  [SEVERITY.MODERATE]: 60,
  [SEVERITY.HIGH]: 30,
});

const DEFAULT_RECOMMENDATIONS = Object.freeze({
  [OVERALL.HEALTHY]: ["Continue regular monitoring and farm maintenance."],
  [OVERALL.NEEDS_ATTENTION]: [
    "Inspect the affected areas, monitor changes, and follow appropriate corrective actions.",
    "Check nearby pineapple plants for similar symptoms.",
  ],
  [OVERALL.CRITICAL]: [
    "Prioritize field inspection and intervention for the affected plant parts.",
    "Consult an agricultural expert before applying any treatment.",
  ],
  [OVERALL.INCONCLUSIVE]: [
    "Upload a clearer image showing the affected leaves and the plant's center, or conduct a field inspection.",
  ],
});

const STANDARD_LIMITATION = "Image-based assessment is an initial visual evaluation; field inspection or agricultural expert validation may be necessary.";

function buildAssessmentPrompt({ field, cropType, imageContext }) {
  return `
ROLE
You are an AI-assisted agricultural crop health assessment system for AgriVerse, a web and mobile-based pineapple farm management system.
Analyze the attached pineapple image from ${field || "the farm"} (crop: ${cropType || "Pineapple / Ananas comosus"}). A prior check classified the view as: ${imageContext}.
Assess its visible health condition in four dimensions: Crop Condition, Pest Infestation, Nutrient Deficiency, and Plant Diseases.
Base the assessment only on visible evidence in the image. Do not invent symptoms, assume a problem, or give unsupported diagnoses.

PART 1: IMAGE ANALYSIS
1. Crop Condition — general physical appearance and visible growth: leaf color and uniformity; leaf shape, structure, and development; yellowing, browning, or wilting; damaged or dried leaf tips and margins; abnormal growth or visible deterioration.
2. Pest Infestation — visible insects or pest-like organisms; number and distribution; clusters; feeding marks, holes, damaged leaves, or other tissue damage; extent of damage. Do not name a specific pest unless its visible characteristics reasonably support it. If only damage is visible, describe the damage and mark the cause as suspected.
3. Nutrient Deficiency — yellowing or discoloration; red or purple coloration; browning or necrosis at tips and margins; differences between older and younger leaves; weakened development. Never confirm a specific deficiency from leaf color alone, since diseases, pests, or environmental stress cause similar symptoms; use "possible" or "suspected".
4. Plant Diseases — leaf spots, lesions, unusual discoloration; rotting, softening, or tissue deterioration; abnormal leaf and stem changes; symptoms at the central growing point (heart); other unusual patterns. Do not claim a specific disease unless symptoms reasonably support it; otherwise mark it suspected.

Reference (use a name only when the visible evidence matches it): mealybug wilt (red/bronze leaves, downward-curling tips, white cottony colonies at leaf bases); Phytophthora heart rot (pale central leaves, water-soaked brown rot at leaf bases, loose central whorl); black/butt rot (soft dark-brown to black decay on base, peduncle, or fruit); fusariosis (fruit or crown deformation, gumming); scale insects and mites (clustered yellow spotting, waxy crusts on leaves).

PART 2: SEVERITY CLASSIFICATION
For every identified or suspected issue, weigh together: extent of symptoms, symptom intensity, affected plant parts, distribution (isolated, scattered, widespread), and potential impact on growth.
- LOW: minor or localized symptoms; only a small portion affected; limited damage or discoloration; plant keeps its normal appearance.
- MODERATE: noticeable symptoms on multiple leaves or areas; more apparent discoloration or damage; several portions abnormal; may affect development if left unaddressed.
- HIGH: extensive or severe symptoms; significant portions affected; substantial damage, deterioration, or rotting; serious symptoms on important parts, especially the central growing point (heart); substantial risk to development.
Rules: never assign HIGH for a single insect or minor discoloration alone. Do not assign severity without sufficient visible evidence. Severity reflects the observed extent and seriousness of symptoms, not your confidence.

PART 3: DETECTION STATUS (one per dimension)
- "NO ISSUE DETECTED": no clear visible evidence of a problem. Severity must be "NOT APPLICABLE".
- "ISSUE SUSPECTED": abnormal symptoms are visible but the cause cannot be reliably identified.
- "ISSUE DETECTED": visible evidence reasonably supports a specific issue.
- "INCONCLUSIVE": the image lacks the visual information to assess this dimension. Severity must be "UNDETERMINED".
For SUSPECTED or DETECTED, use "LOW", "MODERATE", or "HIGH" only when the evidence supports it; otherwise "UNDETERMINED".
Never use "NO ISSUE DETECTED" to mean "not visible" — an unassessable dimension is "INCONCLUSIVE", and inconclusive is not evidence of health.

PART 4: OVERALL STATUS (apply strictly, in order)
Step 1: Findings insufficient for a clear, reliable assessment -> INCONCLUSIVE. Otherwise continue.
Step 2: Any HIGH severity in any dimension -> CRITICAL (even if other dimensions are inconclusive).
Step 3: Any MODERATE severity or any SUSPECTED issue -> NEEDS ATTENTION.
Step 4: All four dimensions assessable with no significant issues -> HEALTHY; otherwise INCONCLUSIVE.
Do not average severities. A healthy dimension never cancels a serious issue in another.

PART 5: RECOMMENDATIONS
Specific to each identified or suspected condition, matched to its severity, practical for pineapple farm management, clear to farm owners and workers, ordered by severity (most severe first).
- LOW: routine monitoring; inspect the affected leaves or parts; watch whether symptoms increase or spread.
- MODERATE: closer inspection; check nearby plants for similar symptoms; review relevant farm practices; consult an agricultural expert when the cause is uncertain.
- HIGH: prioritize field inspection; name the plant parts needing immediate attention; suggest intervention suited to the suspected or detected issue; consult an agricultural expert before applying treatments.
- INCONCLUSIVE: say what information is missing; recommend a clearer image and additional photos of affected leaves, the plant's center, or other relevant parts; recommend field inspection when necessary.
Restrictions: no specific pesticides, chemical dosages, or fertilizer quantities; no chemical treatment solely because a symptom resembles a disease or deficiency; never promise recovery; when the cause is uncertain recommend inspection or expert consultation; no generic advice unrelated to the findings.

PART 6: RESPONSE RULES
Analyze all four dimensions separately. Use only visible evidence. Apply the severity criteria consistently. Explain each severity and the overall status. Do not invent symptoms, pests, diseases, or deficiencies. Do not produce numerical health scores or percentages. Use clear, concise, professional language. If the image is insufficient, state the limitation instead of guessing.

Respond in STRICT JSON without markdown, matching exactly:
{
  "dimensions": {
    "cropCondition": {
      "status": "<NO ISSUE DETECTED | ISSUE SUSPECTED | ISSUE DETECTED | INCONCLUSIVE>",
      "condition": "<identified or suspected condition; 'No significant visible symptoms' when none; why it cannot be assessed when inconclusive>",
      "symptoms": ["<each observed symptom with its location on the plant>"],
      "severity": "<NOT APPLICABLE | LOW | MODERATE | HIGH | UNDETERMINED>",
      "severityExplanation": "<why this severity was assigned, citing extent, intensity, affected parts, distribution, and impact>"
    },
    "pest": { same fields },
    "nutrient": { same fields },
    "disease": { same fields }
  },
  "overall": {
    "status": "<HEALTHY | NEEDS ATTENTION | CRITICAL | INCONCLUSIVE>",
    "summary": "<1-2 sentence summary of the plant's visible condition>",
    "mainFinding": "<the finding that determined the overall status>"
  },
  "recommendations": ["<one practical action, without a leading number; most severe issue first>"],
  "limitations": ["<image limitation: quality, lighting, incomplete view, indistinguishable causes, or plant parts not visible>"]
}`;
}

function text(value, max = 600) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function textList(value, maxItems = 8) {
  return Array.isArray(value) ? value.map((item) => text(item, 400)).filter(Boolean).slice(0, maxItems) : [];
}

function pick(value, allowed) {
  const normalized = text(value, 40).toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return Object.values(allowed).find((option) => option === normalized) || null;
}

// Applies the Part 3 rules so a dimension's status and severity can never contradict each other.
function normalizeDimension(raw) {
  const symptoms = textList(raw?.symptoms);
  let status = pick(raw?.status, STATUS) || STATUS.INCONCLUSIVE;
  let severity = pick(raw?.severity, SEVERITY) || SEVERITY.UNDETERMINED;

  if (status === STATUS.NO_ISSUE) severity = SEVERITY.NOT_APPLICABLE;
  else if (status === STATUS.INCONCLUSIVE) severity = SEVERITY.UNDETERMINED;
  else if (severity === SEVERITY.NOT_APPLICABLE) severity = SEVERITY.UNDETERMINED;

  // A reported issue with nothing observed behind it is not evidence; treat it as unassessed.
  if ((status === STATUS.SUSPECTED || status === STATUS.DETECTED) && symptoms.length === 0) {
    status = STATUS.INCONCLUSIVE;
    severity = SEVERITY.UNDETERMINED;
  }

  const condition = text(raw?.condition, 200)
    || (status === STATUS.NO_ISSUE ? "No significant visible symptoms observed"
      : status === STATUS.INCONCLUSIVE ? "Cannot be assessed from this image" : "Visible abnormality; cause undetermined");
  const severityExplanation = text(raw?.severityExplanation);
  return {
    status,
    severity,
    condition,
    symptoms,
    severityExplanation,
    // Short line used by the field assessment page and older views.
    evidence: [condition, symptoms.join("; ")].filter(Boolean).join(" — "),
  };
}

function hasIssue(dimension) {
  return dimension.status === STATUS.SUSPECTED || dimension.status === STATUS.DETECTED;
}

function listLabels(keys) {
  return keys.map((key) => DIMENSIONS.find((item) => item.key === key).label).join(", ");
}

// Part 4, applied in the exact order given. Returns the status and the path that produced it.
function applyDecisionTree(dimensions) {
  const keys = DIMENSIONS.map(({ key }) => key);
  const inconclusive = keys.filter((key) => dimensions[key].status === STATUS.INCONCLUSIVE);
  const high = keys.filter((key) => dimensions[key].severity === SEVERITY.HIGH);
  const moderate = keys.filter((key) => dimensions[key].severity === SEVERITY.MODERATE);
  const suspected = keys.filter((key) => dimensions[key].status === STATUS.SUSPECTED);
  const unratedIssues = keys.filter((key) => hasIssue(dimensions[key]) && dimensions[key].severity === SEVERITY.UNDETERMINED);

  if (inconclusive.length === keys.length) {
    return {
      status: OVERALL.INCONCLUSIVE,
      decidedBy: keys,
      decisionPath: "Step 1: no dimension could be assessed reliably from this image, so the overall status is INCONCLUSIVE.",
    };
  }
  const step1 = "Step 1: the findings are sufficient to continue.";
  if (high.length) {
    return {
      status: OVERALL.CRITICAL,
      decidedBy: high,
      decisionPath: `${step1} Step 2: HIGH severity in ${listLabels(high)}, so the overall status is CRITICAL.`,
    };
  }
  const step2 = "Step 2: no HIGH-severity issue.";
  const attention = [...new Set([...moderate, ...suspected, ...unratedIssues])];
  if (attention.length) {
    const reasons = [
      moderate.length && `MODERATE severity in ${listLabels(moderate)}`,
      suspected.length && `a suspected issue in ${listLabels(suspected)}`,
      unratedIssues.filter((key) => !suspected.includes(key)).length
        && `a detected issue of undetermined severity in ${listLabels(unratedIssues.filter((key) => !suspected.includes(key)))}`,
    ].filter(Boolean).join(" and ");
    return {
      status: OVERALL.NEEDS_ATTENTION,
      decidedBy: attention,
      decisionPath: `${step1} ${step2} Step 3: ${reasons}, so the overall status is NEEDS ATTENTION.`,
    };
  }
  const step3 = "Step 3: no MODERATE or suspected issue.";
  if (!inconclusive.length) {
    return {
      status: OVERALL.HEALTHY,
      decidedBy: [],
      decisionPath: `${step1} ${step2} ${step3} Step 4: all four dimensions were assessable with no significant issues, so the overall status is HEALTHY.`,
    };
  }
  return {
    status: OVERALL.INCONCLUSIVE,
    decidedBy: inconclusive,
    decisionPath: `${step1} ${step2} ${step3} Step 4: ${listLabels(inconclusive)} could not be assessed, so the absence of issues cannot be established and the overall status is INCONCLUSIVE.`,
  };
}

// One entry per dimension that decided the overall status, so the page can list them separately.
function mainFindingsFor(tree, dimensions) {
  return tree.decidedBy.map((key) => {
    const { label } = DIMENSIONS.find((item) => item.key === key);
    const { condition, status, severity } = dimensions[key];
    return { dimension: label, condition, status, severity };
  });
}

function mainFindingFor(tree, dimensions) {
  if (tree.status === OVERALL.HEALTHY) return "No significant visible issues in any of the four dimensions.";
  return mainFindingsFor(tree, dimensions).map(({ dimension, condition, status, severity }) =>
    status === STATUS.INCONCLUSIVE ? `${dimension}: ${condition}`
      : `${dimension}: ${condition} (${status.toLowerCase()}, ${severity.toLowerCase()} severity)`).join("; ");
}

function headlineFor(tree, dimensions) {
  if (tree.status === OVERALL.HEALTHY) return "Healthy Pineapple Plant";
  if (tree.status === OVERALL.INCONCLUSIVE) return "Inconclusive Visual Assessment";
  const lead = dimensions[tree.decidedBy[0]];
  return lead && hasIssue(lead) ? lead.condition.slice(0, 120) : OVERALL_LABEL[tree.status];
}

// Turns the raw AI JSON into the stored assessment. The overall status always comes from the tree.
function buildAssessment(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The AI did not return a valid crop assessment.");
  }
  const dimensions = Object.fromEntries(DIMENSIONS.map(({ key }) => [key, normalizeDimension(raw.dimensions?.[key])]));
  const tree = applyDecisionTree(dimensions);
  const aiStatus = pick(raw.overall?.status, OVERALL);
  const summary = aiStatus === tree.status && text(raw.overall?.summary)
    ? text(raw.overall.summary)
    : `Overall status: ${tree.status}. ${mainFindingFor(tree, dimensions)}.`;
  // The page numbers the list itself, so drop any "1." or "2)" the model adds.
  const recommendations = textList(raw.recommendations, 10).map((item) => item.replace(/^\d+\s*[.)]\s*/, "")).filter(Boolean);
  const limitations = textList(raw.limitations, 6);
  if (!limitations.includes(STANDARD_LIMITATION)) limitations.push(STANDARD_LIMITATION);

  const factorScores = Object.fromEntries(DIMENSIONS.map(({ key }) =>
    [key, SEVERITY_POINTS[dimensions[key].severity] ?? null]));

  return {
    method: METHOD,
    dimensions,
    overall: {
      status: tree.status,
      label: OVERALL_LABEL[tree.status],
      summary,
      mainFinding: mainFindingFor(tree, dimensions),
      mainFindings: mainFindingsFor(tree, dimensions),
      decisionPath: tree.decisionPath,
      aiStatusDisagreed: Boolean(aiStatus && aiStatus !== tree.status),
    },
    headline: headlineFor(tree, dimensions),
    recommendations: recommendations.length ? recommendations : [...DEFAULT_RECOMMENDATIONS[tree.status]],
    limitations,
    symptoms: DIMENSIONS.flatMap(({ key, label }) => dimensions[key].symptoms.map((symptom) => `${label}: ${symptom}`)),
    factorScores,
  };
}

module.exports = {
  DIMENSIONS,
  METHOD,
  OVERALL,
  OVERALL_LABEL,
  SEVERITY,
  STATUS,
  applyDecisionTree,
  buildAssessment,
  buildAssessmentPrompt,
  normalizeDimension,
};
