-- Harvesting task completion data, an "Awaiting Approval" status gate, and an
-- atomic approve step that pushes harvest counts into Pineapple Stock inventory.

alter table public.tasks
  add column if not exists harvest_small_count integer,
  add column if not exists harvest_medium_count integer,
  add column if not exists harvest_large_count integer,
  add column if not exists harvest_damaged_count integer,
  add column if not exists harvest_proof_image_url text,
  add column if not exists harvest_proof_image_storage_path text,
  add column if not exists harvest_proof_image_name text,
  add column if not exists harvest_proof_image_mime text,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists harvest_rejection_reason text,
  add column if not exists harvest_rejected_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_harvest_counts_non_negative') then
    alter table public.tasks add constraint tasks_harvest_counts_non_negative
      check (
        (harvest_small_count is null or harvest_small_count >= 0) and
        (harvest_medium_count is null or harvest_medium_count >= 0) and
        (harvest_large_count is null or harvest_large_count >= 0) and
        (harvest_damaged_count is null or harvest_damaged_count >= 0)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tasks_harvest_rejection_reason_length') then
    alter table public.tasks add constraint tasks_harvest_rejection_reason_length
      check (harvest_rejection_reason is null or char_length(harvest_rejection_reason) <= 1000);
  end if;
end $$;

insert into public.task_statuses (status_name, code, sort_order) values
  ('Awaiting Approval', 'awaiting_approval', 25)
on conflict (code) do nothing;

-- Widen the lifecycle trigger to accept the new status without clobbering timestamps.
create or replace function public.set_normalized_task_lifecycle_timestamps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  status_code text;
begin
  select code into status_code
  from public.task_statuses
  where id = new.status_id;

  if status_code = 'pending' then
    new.started_at = null;
    new.completed_at = null;
  elsif status_code = 'in_progress' then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = null;
  elsif status_code = 'awaiting_approval' then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = coalesce(new.completed_at, now());
  elsif status_code = 'completed' then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = coalesce(new.completed_at, now());
  else
    raise exception 'Unknown task status ID %', new.status_id using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Approves a harvesting task and its reported counts in one transaction:
-- completes the task and adds Small/Medium/Large stock to Pineapple Stock inventory.
-- Damaged count is recorded on the task only, never added as sellable stock.
create or replace function public.approve_harvest_task(
  p_task_id bigint,
  p_admin_id uuid,
  p_small_count integer,
  p_medium_count integer,
  p_large_count integer,
  p_damaged_count integer
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
  v_category_name text;
  v_awaiting_status_id bigint;
  v_completed_status_id bigint;
  v_pineapple_category_id bigint;
  v_unit_id bigint;
  v_size_row record;
  v_item_id bigint;
begin
  if p_small_count is null or p_small_count < 0
    or p_medium_count is null or p_medium_count < 0
    or p_large_count is null or p_large_count < 0
    or p_damaged_count is null or p_damaged_count < 0 then
    raise exception 'Harvest counts must be zero or greater';
  end if;

  select id into v_awaiting_status_id from public.task_statuses where code = 'awaiting_approval';
  select id into v_completed_status_id from public.task_statuses where code = 'completed';
  if v_awaiting_status_id is null or v_completed_status_id is null then
    raise exception 'Task status configuration is missing';
  end if;

  select t.* into v_task
  from public.tasks t
  where t.id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found';
  end if;

  select category_name into v_category_name
  from public.task_categories
  where id = v_task.category_id;

  if v_task.status_id is distinct from v_awaiting_status_id then
    raise exception 'Task is not awaiting approval';
  end if;
  if v_category_name is distinct from 'Harvesting' then
    raise exception 'Task is not a harvesting task';
  end if;

  update public.tasks set
    status_id = v_completed_status_id,
    harvest_small_count = p_small_count,
    harvest_medium_count = p_medium_count,
    harvest_large_count = p_large_count,
    harvest_damaged_count = p_damaged_count,
    approved_by = p_admin_id,
    approved_at = now()
  where id = p_task_id
  returning * into v_task;

  select id into v_pineapple_category_id from public.inventory_categories where code = 'pineapple';
  if v_pineapple_category_id is null then
    raise exception 'Pineapple inventory category is not configured';
  end if;
  select id into v_unit_id from public.measurement_units where abbreviation = 'pcs' and status = true;
  if v_unit_id is null then
    raise exception 'Default pineapple unit is not configured';
  end if;

  for v_size_row in
    select ps.id as size_id, ps.size_name as size_name, x.cnt as cnt
    from (values ('Small', p_small_count), ('Medium', p_medium_count), ('Large', p_large_count)) as x(size_name, cnt)
    join public.pineapple_sizes ps on ps.size_name = x.size_name and ps.status = true
  loop
    if v_size_row.cnt > 0 then
      select ii.id into v_item_id
      from public.inventory_items ii
      join public.pineapple_inventory pi on pi.inventory_id = ii.id
      where ii.inventory_category_id = v_pineapple_category_id
        and pi.size_id = v_size_row.size_id
        and ii.archived_at is null
      limit 1;

      if v_item_id is not null then
        update public.inventory_items set quantity = quantity + v_size_row.cnt where id = v_item_id;
      else
        insert into public.inventory_items (inventory_category_id, unit_id, item_name, quantity, created_by)
        values (v_pineapple_category_id, v_unit_id, v_size_row.size_name || ' Pineapple', v_size_row.cnt, p_admin_id)
        returning id into v_item_id;

        insert into public.pineapple_inventory (inventory_id, size_id) values (v_item_id, v_size_row.size_id);
      end if;
    end if;
  end loop;

  return v_task;
end;
$$;

revoke all on function public.approve_harvest_task(bigint, uuid, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.approve_harvest_task(bigint, uuid, integer, integer, integer, integer) to service_role;

grant all on table public.tasks to service_role;

notify pgrst, 'reload schema';
