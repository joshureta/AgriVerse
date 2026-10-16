/** Local 3D task artwork used across the farm-worker task experience. */
export const TASK_ICON_CONTAINER_STYLE = {
  backgroundColor: '#EEF1F4',
  borderColor: '#D6DCE2',
  borderWidth: 1,
} as const;

const taskCategoryIcons: Record<string, number> = {
  Planting: require('@/assets/task-category-icons/planting.png'),
  Irrigation: require('@/assets/task-category-icons/irrigation.png'),
  Fertilization: require('@/assets/task-category-icons/fertilization.png'),
  Fertilizer: require('@/assets/task-category-icons/fertilization.png'),
  Fertilizing: require('@/assets/task-category-icons/fertilization.png'),
  Monitoring: require('@/assets/task-category-icons/monitoring.png'),
  'Crop Inspection': require('@/assets/task-category-icons/monitoring.png'),
  'Pest & Disease': require('@/assets/task-category-icons/pest-and-disease.png'),
  'Pests & Disease Control': require('@/assets/task-category-icons/pest-and-disease.png'),
  Harvesting: require('@/assets/task-category-icons/harvesting.png'),
};

export function taskCategoryIconSource(category?: string) {
  return taskCategoryIcons[category || ''] || taskCategoryIcons.Planting;
}
