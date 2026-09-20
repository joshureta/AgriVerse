-- Removes the Crop Maintenance, Post-Harvest, and Distribution task categories.
--
-- tasks.category_id is "on delete restrict", so the tasks in these categories are deleted first.
-- Their schedules are removed automatically (schedules.task_id is "on delete cascade").
-- Deleted tasks are not recoverable: back up the database before running this.

begin;

delete from public.tasks
where category_id in (
  select id from public.task_categories
  where category_name in ('Crop Maintenance', 'Post-Harvest', 'Distribution')
);

delete from public.task_categories
where category_name in ('Crop Maintenance', 'Post-Harvest', 'Distribution');

commit;
