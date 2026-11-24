// Stock Check: the worker physically counts pineapple stock by size and condition.
// Condition codes and damage types must match backend/lib/task-details.js and public.stock_conditions.

export const STOCK_CHECK = 'Stock Check';

export type StockCondition = 'good' | 'minor_damage' | 'overripe' | 'spoiled' | 'pest_disease';

export const STOCK_CONDITIONS: { code: StockCondition; label: string; hint: string }[] = [
  { code: 'good', label: 'Good', hint: 'Saleable' },
  { code: 'minor_damage', label: 'Minor damage', hint: 'Bruised or scratched' },
  { code: 'overripe', label: 'Overripe', hint: 'For immediate sale' },
  { code: 'spoiled', label: 'Spoiled', hint: 'Not saleable' },
  { code: 'pest_disease', label: 'Pest or disease', hint: 'Insect or disease signs' },
];

export const DAMAGE_TYPES = ['Bruised', 'Cracked Skin', 'Crown Damage', 'Dropped'];

// Every pineapple size is counted, the recorded stock is never shown (blind count), and every
// non-saleable condition above zero needs a photo.
export type StockCheckInfo = {
  sizes: string[];
  counts: { size: string; condition: StockCondition; quantity: number; damage_types: string[] }[];
};

export type StockPhoto = { uri: string; base64: string | null; mime: string };

export function stockKey(size: string, condition: StockCondition) {
  return `${size}|${condition}`;
}

export function isStockCheck(category?: string | null) {
  return category === STOCK_CHECK;
}

// Counts the worker saved before (a recount keeps them), as editable text.
export function initialStockCounts(info?: StockCheckInfo | null) {
  return Object.fromEntries((info?.counts || []).map((count) => [stockKey(count.size, count.condition), String(count.quantity)]));
}

export function initialDamageTypes(info?: StockCheckInfo | null) {
  return Object.fromEntries((info?.counts || []).map((count) => [stockKey(count.size, count.condition), count.damage_types || []]));
}
