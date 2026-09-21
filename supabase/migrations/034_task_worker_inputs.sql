-- Worker inputs per task category.
--
-- activity_type    Pest & Disease only: the admin decides Inspection or Action when creating the task.
-- details          Inspection answers (crop condition, pest observed, recommended action), saved on completion.
-- inventory_item_id / inventory_quantity
--                  The fertilizer (Fertilization) or pesticide (Pest & Disease Action) the worker takes
--                  when starting the task. The stock is deducted in the same step as starting.

alter table public.tasks
  add column if not exists activity_type text check (activity_type in ('inspection', 'action')),
  add column if not exists details jsonb,
  add column if not exists inventory_item_id bigint references public.inventory_items(id) on delete restrict,
  add column if not exists inventory_quantity integer check (inventory_quantity > 0);

-- Before this migration, Pest & Disease workers could only submit a photo and notes, which matches Inspection.
update public.tasks t
set activity_type = 'inspection'
from public.task_categories c
where c.id = t.category_id and c.category_name = 'Pest & Disease' and t.activity_type is null;

-- Starts a pending task and takes the chosen supplies from inventory in one transaction.
-- If any check fails (wrong task, wrong item kind, not enough stock) nothing changes.
create or replace function public.start_task_with_item(
  p_task_id bigint,
  p_worker_id uuid,
  p_item_id bigint,
  p_quantity integer
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_category_name text;
  v_pending_id bigint;
  v_in_progress_id bigint;
  v_required_kind text;
  v_item_kind text;
begin
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1';
  end if;

  select id into v_pending_id from public.task_statuses where code = 'pending';
  select id into v_in_progress_id from public.task_statuses where code = 'in_progress';
  if v_pending_id is null or v_in_progress_id is null then
    raise exception 'Task status configuration is missing';
  end if;

  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id and t.assigned_worker_id = p_worker_id
  for update;
  if not found then
    raise exception 'Assigned task was not found';
  end if;
  if v_task.status_id is distinct from v_pending_id then
    raise exception 'Task is not pending';
  end if;

  select category_name into v_category_name from public.task_categories where id = v_task.category_id;
  if v_category_name = 'Fertilization' then
    v_required_kind := 'fertilizer';
  elsif v_category_name = 'Pest & Disease' and v_task.activity_type = 'action' then
    v_required_kind := 'pesticide';
  else
    raise exception 'This task does not use inventory supplies';
  end if;

  select c.code into v_item_kind
  from public.inventory_items i
  join public.inventory_categories c on c.id = i.inventory_category_id
  where i.id = p_item_id;
  if v_item_kind is distinct from v_required_kind then
    raise exception 'The selected item is not a %', v_required_kind;
  end if;

  -- The stock movement trigger logs this decrease in the stock history.
  update public.inventory_items
  set quantity = quantity - p_quantity
  where id = p_item_id and archived_at is null and quantity >= p_quantity;
  if not found then
    raise exception 'Inventory item not found or has insufficient stock';
  end if;

  update public.tasks
  set status_id = v_in_progress_id,
      started_at = now(),
      inventory_item_id = p_item_id,
      inventory_quantity = p_quantity
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

revoke all on function public.start_task_with_item(bigint, uuid, bigint, integer) from public, anon, authenticated;
grant execute on function public.start_task_with_item(bigint, uuid, bigint, integer) to service_role;

notify pgrst, 'reload schema';
