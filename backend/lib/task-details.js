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

// Stock Check: the worker records the DAMAGED pineapples by size and damage type (migration 068).
// Good pineapples are not counted. Every damage type above zero needs a photo.
// The condition codes must match public.stock_conditions and mobile/src/lib/stock-check.ts.
const STOCK_CHECK = "Stock Check";
const PINEAPPLE_SIZES = ["Small", "Medium", "Large"];
const STOCK_CONDITIONS = ["minor_damage", "overripe", "spoiled", "pest_disease"];
const DAMAGE_TYPES = ["Bruised", "Cracked Skin", "Crown Damage", "Dropped"];

function isStockCheck(categoryName) {
  return categoryName === STOCK_CHECK;
}

// The worker's damaged counts: one entry for every size and damage type (0 where there is none).
function readStockCounts(value, sizes = PINEAPPLE_SIZES) {
  if (!Array.isArray(value) || !value.length) throw httpError(400, "Enter the damaged counts before submitting");
  const counts = value.map((entry) => {
    const size = String(entry?.size || "").trim();
    const condition = String(entry?.condition || "").trim();
    const quantity = Number(entry?.quantity);
    if (!sizes.includes(size)) throw httpError(400, `Size '${size}' is not part of this stock check`);
    if (!STOCK_CONDITIONS.includes(condition)) throw httpError(400, `Unknown condition '${condition}'`);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999999) {
      throw httpError(400, "Damaged counts must be whole numbers 0 or greater");
    }
    const damageTypes = Array.isArray(entry.damage_types)
      ? [...new Set(entry.damage_types.map((type) => String(type).trim()).filter((type) => DAMAGE_TYPES.includes(type)))]
      : [];
    return { size, condition, quantity, damage_types: damageTypes };
  });
  for (const size of sizes) {
    for (const condition of STOCK_CONDITIONS) {
      if (!counts.some((entry) => entry.size === size && entry.condition === condition)) {
        throw httpError(400, "Enter a damaged count for every size and damage type (0 where none)");
      }
    }
  }
  return counts;
}

module.exports = {
  ACTIVITY_TYPES,
  DAMAGE_TYPES,
  INSPECTION_OPTIONS,
  PINEAPPLE_SIZES,
  STOCK_CHECK,
  STOCK_CONDITIONS,
  collectsInspectionDetails,
  isStockCheck,
  readActivityType,
  readInspectionDetails,
  readStockCounts,
  requiredInventoryKind,
};
