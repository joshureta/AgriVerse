-- Stores the worker's proof photo on the task for every category except Harvesting.
--
-- Harvesting already keeps its photo in the harvest_proof_image_* columns (025), and the
-- crop_health_inspections row written on completion has no link back to the task, so the
-- Records page had no way to show the photo for other categories.
--
-- Tasks completed before this migration have no photo stored here and show as "no photo".

alter table public.tasks
  add column if not exists completion_proof_image_url text,
  add column if not exists completion_proof_image_storage_path text;

notify pgrst, 'reload schema';
