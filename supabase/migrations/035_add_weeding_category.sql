-- Adds Weeding as a task category. The Records page already had a layout for it,
-- but the category itself was never created.
--
-- Weeding collects no extra fields: the worker submits a photo and optional notes, like Irrigation.

insert into public.task_categories (category_name, description)
values ('Weeding', 'Weed removal and field clearing')
on conflict do nothing;
