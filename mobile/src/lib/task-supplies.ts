// What some task categories collect from the worker. Must match backend/lib/task-details.js.

export type ActivityType = 'inspection' | 'action';
export type SupplyKind = 'fertilizer' | 'pesticide';

export type SupplyItem = {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  available: boolean;
};

export type InspectionDetails = {
  crop_condition: string;
  pest_observed: string;
  recommended_action: string;
};

export const INSPECTION_QUESTIONS: { key: keyof InspectionDetails; label: string; options: string[] }[] = [
  { key: 'crop_condition', label: 'Crop condition', options: ['Healthy', 'Mild nutrient stress', 'Recovering', 'Needs attention'] },
  { key: 'pest_observed', label: 'Pest or disease observed', options: ['None observed', 'Mealybug wilt', 'Leaf spot', 'Other'] },
  { key: 'recommended_action', label: 'Recommended action', options: ['Continue routine monitoring', 'Improve drainage', 'Apply pesticide next visit'] },
];

// Fields the worker API adds to a task for the categories above.
export type TaskSupplyFields = {
  activity_type?: ActivityType | null;
  inventory_quantity?: number | null;
  inventory_item?: { item_name: string; unit?: { abbreviation?: string | null } | null } | null;
};

// "fertilizer" or "pesticide" when the worker takes supplies from inventory to start the task.
export function supplyKindFor(category: string, activity?: ActivityType | null): SupplyKind | null {
  if (category === 'Fertilization') return 'fertilizer';
  if (category === 'Pest & Disease' && activity === 'action') return 'pesticide';
  return null;
}

// True when the worker answers the crop condition, pest, and recommended action questions on completion.
export function collectsInspection(category: string, activity?: ActivityType | null): boolean {
  return category === 'Monitoring' || (category === 'Pest & Disease' && activity === 'inspection');
}

export function activityLabel(activity?: ActivityType | null): string | null {
  if (activity === 'inspection') return 'Inspection';
  if (activity === 'action') return 'Action';
  return null;
}

// "Urea 46-0-0 · 2 bags", or null when nothing was taken for this task.
export function suppliesSummary(task: TaskSupplyFields): string | null {
  if (!task.inventory_item || !task.inventory_quantity) return null;
  const unit = task.inventory_item.unit?.abbreviation || '';
  return `${task.inventory_item.item_name} · ${task.inventory_quantity} ${unit}`.trim();
}
