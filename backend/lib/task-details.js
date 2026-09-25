// Rules for the extra information some task categories collect from the worker.
// The option lists here must match mobile/src/lib/task-supplies.ts.

const { httpError } = require("./http-error");

const INSPECTION_OPTIONS = {
  crop_condition: ["Healthy", "Mild nutrient stress", "Recovering", "Needs attention"],
  pest_observed: ["None observed", "Mealybug wilt", "Leaf spot", "Other"],
  recommended_action: ["Continue routine monitoring", "Improve drainage", "Apply pesticide next visit"],
};

const ACTIVITY_TYPES = ["inspection", "action"];
const PEST_AND_DISEASE = "Pest & Disease";

// "fertilizer" or "pesticide" when the worker takes supplies from inventory to start the task, else null.
function requiredInventoryKind(categoryName, activityType) {
  if (categoryName === "Fertilization") return "fertilizer";
  if (categoryName === PEST_AND_DISEASE && activityType === "action") return "pesticide";
  return null;
}

// True when the worker answers the crop condition, pest, and recommended action questions on completion.
function collectsInspectionDetails(categoryName, activityType) {
  if (categoryName === "Monitoring") return true;
  return categoryName === PEST_AND_DISEASE && activityType === "inspection";
}

function readActivityType(categoryName, value) {
  if (categoryName !== PEST_AND_DISEASE) return null;
  const activity = String(value || "").trim();
  if (!ACTIVITY_TYPES.includes(activity)) {
    throw httpError(400, "Choose Inspection or Action for Pest & Disease tasks");
  }
  return activity;
}

function readInspectionDetails(value) {
  const source = value && typeof value === "object" ? value : {};
  const details = {};
  for (const [key, options] of Object.entries(INSPECTION_OPTIONS)) {
    const answer = String(source[key] || "").trim();
    if (!options.includes(answer)) throw httpError(400, "Answer every inspection question before completing the task");
    details[key] = answer;
  }
  return details;
}

module.exports = {
  ACTIVITY_TYPES,
  INSPECTION_OPTIONS,
  collectsInspectionDetails,
  readActivityType,
  readInspectionDetails,
  requiredInventoryKind,
};
