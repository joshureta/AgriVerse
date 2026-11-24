// Stock Check: the worker records damaged pineapples by size and damage type.
// Damage codes and types must match backend/lib/task-details.js and public.stock_conditions.

export const STOCK_CHECK = 'Stock Check';

export type StockCondition = 'minor_damage' | 'overripe' | 'spoiled' | 'pest_disease';

export const STOCK_CONDITIONS: { code: StockCondition; label: string; hint: string }[] = [
  { code: 'minor_damage', label: 'Minor damage', hint: 'Bruised or scratched' },
  { code: 'overripe', label: 'Overripe', hint: 'Too ripe to sell' },
  { code: 'spoiled', label: 'Spoiled', hint: 'Rotten or moldy' },
  { code: 'pest_disease', label: 'Pest or disease', hint: 'Insect or disease signs' },
];

export const DAMAGE_TYPES = ['Bruised', 'Cracked Skin', 'Crown Damage', 'Dropped'];

// Only the DAMAGED pineapples are recorded, by size and damage type. Every damage type above zero needs a photo.
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
