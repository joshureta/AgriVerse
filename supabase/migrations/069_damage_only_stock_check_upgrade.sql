-- Upgrade databases that already applied the original migration 068.
-- The worker now submits damaged pineapples only; the old database function
-- required a Good count for every size and rejected the new mobile payload.

update public.task_categories
set description = 'Record damaged pineapples by size and damage type, with photo proof'
where category_name = 'Stock Check';

-- Keep old Good rows for historical tasks, but exclude that condition from
-- new submissions and approvals.
update public.stock_conditions set status = false where code = 'good';
update public.stock_conditions set status = true, sort_order = 10, condition_name = 'Minor damage' where code = 'minor_damage';
update public.stock_conditions set status = true, sort_order = 20, condition_name = 'Overripe' where code = 'overripe';
update public.stock_conditions set status = true, sort_order = 30, condition_name = 'Spoiled' where code = 'spoiled';
update public.stock_conditions set status = true, sort_order = 40, condition_name = 'Pest or disease' where code = 'pest_disease';

-- The original table required worker_quantity on every insert. The new
-- submission function keeps quantity and leaves that legacy column unused.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stock_check_counts' and column_name = 'worker_quantity'
  ) then
    alter table public.stock_check_counts alter column worker_quantity drop not null;
  end if;
end $$;

-- The stock movement trigger copies the reason, condition and task set by the approval function.
-- Other updates leave them empty.
create or replace function public.record_inventory_stock_movement()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.quantity is distinct from old.quantity then
    insert into public.inventory_stock_movements (
      inventory_item_id, movement_type, quantity, quantity_before, quantity_after,
      reason, condition_id, task_id
    ) values (
      new.id,
      case when new.quantity > old.quantity then 'stock_in' else 'stock_out' end,
      abs(new.quantity - old.quantity), old.quantity, new.quantity,
      nullif(current_setting('agriverse.movement_reason', true), ''),
      nullif(current_setting('agriverse.movement_condition_id', true), '')::bigint,
      nullif(current_setting('agriverse.movement_task_id', true), '')::bigint
    );
  end if;
  return new;
end;
$$;

-- The active Pineapple Stock item for a size, or null when there is none yet.
create or replace function public.stock_check_item_for_size(p_size_id bigint)
returns bigint language sql stable security definer set search_path = '' as $$
  select ii.id
  from public.inventory_items ii
  join public.inventory_categories c on c.id = ii.inventory_category_id and c.code = 'pineapple'
  join public.pineapple_inventory pi on pi.inventory_id = ii.id
  where pi.size_id = p_size_id and ii.archived_at is null
  order by ii.id
  limit 1;
$$;

-- Starts a pending Stock Check task.
create or replace function public.start_stock_check_task(p_task_id bigint, p_worker_id uuid)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare
  v_task public.tasks;
  v_category_name text;
  v_pending_id bigint;
  v_in_progress_id bigint;
begin
  select id into v_pending_id from public.task_statuses where code = 'pending';
  select id into v_in_progress_id from public.task_statuses where code = 'in_progress';
  if v_pending_id is null or v_in_progress_id is null then
    raise exception 'Task status configuration is missing';
  end if;

  select t.* into v_task from public.tasks t
  where t.id = p_task_id and t.assigned_worker_id = p_worker_id
  for update;
  if not found then
    raise exception 'Assigned task was not found';
  end if;
  if v_task.status_id is distinct from v_pending_id then
    raise exception 'Task is not pending';
  end if;
  select category_name into v_category_name from public.task_categories where id = v_task.category_id;
  if v_category_name is distinct from 'Stock Check' then
    raise exception 'Task is not a stock check';
  end if;

  update public.tasks set status_id = v_in_progress_id, started_at = now()
  where id = p_task_id returning * into v_task;
  return v_task;
end;
$$;

-- Replaces the damaged counts and photos of an in-progress Stock Check task.
-- p_counts: [{ "size": "Small", "condition": "spoiled", "quantity": 1, "damage_types": [...] }, ...]
--   Every size and damage type must be sent, with 0 where there is no damage.
-- p_photos: [{ "size": "Small", "condition": "spoiled", "image_url": "...", "storage_path": "..." }, ...]
--   Every damage type above zero needs a photo.
create or replace function public.save_stock_check_submission(
  p_task_id bigint,
  p_worker_id uuid,
  p_counts jsonb,
  p_photos jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_task public.tasks;
  v_category_name text;
  v_in_progress_id bigint;
  v_entry jsonb;
  v_size_id bigint;
  v_condition public.stock_conditions;
  v_quantity integer;
  v_expected integer;
  v_missing text;
begin
  select id into v_in_progress_id from public.task_statuses where code = 'in_progress';
  select t.* into v_task from public.tasks t
  where t.id = p_task_id and t.assigned_worker_id = p_worker_id
  for update;
  if not found then
    raise exception 'Assigned task was not found';
  end if;
  if v_task.status_id is distinct from v_in_progress_id then
    raise exception 'Only an active stock check can be submitted';
  end if;
  select category_name into v_category_name from public.task_categories where id = v_task.category_id;
  if v_category_name is distinct from 'Stock Check' then
    raise exception 'Task is not a stock check';
  end if;
  if p_counts is null or jsonb_typeof(p_counts) <> 'array' then
    raise exception 'Damaged counts are required';
  end if;

  delete from public.stock_check_counts where task_id = p_task_id;
  delete from public.stock_check_photos where task_id = p_task_id;

  for v_entry in select value from jsonb_array_elements(p_counts) loop
    select ps.id into v_size_id from public.pineapple_sizes ps
    where ps.status = true and lower(ps.size_name) = lower(coalesce(v_entry->>'size', ''));
    if v_size_id is null then
      raise exception 'Size % is not a pineapple size', coalesce(v_entry->>'size', '');
    end if;
    select * into v_condition from public.stock_conditions
    where code = coalesce(v_entry->>'condition', '') and status = true;
    if not found then
      raise exception 'Unknown damage type %', coalesce(v_entry->>'condition', '');
    end if;
    if coalesce(v_entry->>'quantity', '') !~ '^\d{1,6}$' then
      raise exception 'Damaged counts must be whole numbers 0 or greater';
    end if;
    v_quantity := (v_entry->>'quantity')::integer;
    insert into public.stock_check_counts (task_id, pineapple_size_id, condition_id, quantity, damage_types)
    values (
      p_task_id, v_size_id, v_condition.id, v_quantity,
      coalesce(array(select jsonb_array_elements_text(case when jsonb_typeof(v_entry->'damage_types') = 'array' then v_entry->'damage_types' else '[]'::jsonb end)), '{}')
    )
    on conflict (task_id, pineapple_size_id, condition_id) do update
      set quantity = excluded.quantity, damage_types = excluded.damage_types, updated_at = now();
  end loop;

  select count(*) * (select count(*) from public.stock_conditions where status = true)
  into v_expected from public.pineapple_sizes where status = true;
  if (select count(*) from public.stock_check_counts where task_id = p_task_id) <> v_expected then
    raise exception 'Enter a damaged count for every size and damage type (0 where none)';
  end if;

  if p_photos is not null and jsonb_typeof(p_photos) = 'array' then
    for v_entry in select value from jsonb_array_elements(p_photos) loop
      select ps.id into v_size_id from public.pineapple_sizes ps
      where ps.status = true and lower(ps.size_name) = lower(coalesce(v_entry->>'size', ''));
      select * into v_condition from public.stock_conditions where code = coalesce(v_entry->>'condition', '');
      if v_size_id is null or v_condition.id is null or coalesce(v_entry->>'image_url', '') = '' then
        raise exception 'A photo is missing its size, damage type or image';
      end if;
      insert into public.stock_check_photos (task_id, pineapple_size_id, condition_id, image_url, storage_path)
      values (p_task_id, v_size_id, v_condition.id, v_entry->>'image_url', nullif(v_entry->>'storage_path', ''));
    end loop;
  end if;

  select ps.size_name || ', ' || sc.condition_name into v_missing
  from public.stock_check_counts c
  join public.stock_conditions sc on sc.id = c.condition_id
  join public.pineapple_sizes ps on ps.id = c.pineapple_size_id
  where c.task_id = p_task_id and c.quantity > 0
    and not exists (
      select 1 from public.stock_check_photos p
      where p.task_id = c.task_id and p.pineapple_size_id = c.pineapple_size_id and p.condition_id = c.condition_id
    )
  order by ps.id, sc.sort_order
  limit 1;
  if v_missing is not null then
    raise exception 'A photo is required for %', v_missing;
  end if;
end;
$$;

-- Approves a Stock Check and removes the damaged pineapples from Pineapple Stock in one transaction.
-- p_counts (optional) holds the admin's corrections in the same shape as save_stock_check_submission.
-- Stock that would go below zero stops the approval, so the admin can correct the count first.
create or replace function public.approve_stock_check_task(p_task_id bigint, p_admin_id uuid, p_counts jsonb)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare
  v_task public.tasks;
  v_category_name text;
  v_awaiting_id bigint;
  v_completed_id bigint;
  v_entry jsonb;
  v_size record;
  v_condition record;
  v_item_id bigint;
  v_available integer;
begin
  select id into v_awaiting_id from public.task_statuses where code = 'awaiting_approval';
  select id into v_completed_id from public.task_statuses where code = 'completed';
  if v_awaiting_id is null or v_completed_id is null then
    raise exception 'Task status configuration is missing';
  end if;

  select t.* into v_task from public.tasks t where t.id = p_task_id for update;
  if not found then
    raise exception 'Task not found';
  end if;
  select category_name into v_category_name from public.task_categories where id = v_task.category_id;
  if v_task.status_id is distinct from v_awaiting_id then
    raise exception 'Task is not awaiting approval';
  end if;
  if v_category_name is distinct from 'Stock Check' then
    raise exception 'Task is not a stock check';
  end if;

  -- Admin corrections. The worker's numbers are kept as they were submitted.
  if p_counts is not null and jsonb_typeof(p_counts) = 'array' then
    for v_entry in select value from jsonb_array_elements(p_counts) loop
      if coalesce(v_entry->>'quantity', '') !~ '^\d{1,6}$' then
        raise exception 'Damaged counts must be whole numbers 0 or greater';
      end if;
      update public.stock_check_counts c set quantity = (v_entry->>'quantity')::integer, updated_at = now()
      from public.pineapple_sizes ps, public.stock_conditions sc
      where c.task_id = p_task_id and ps.id = c.pineapple_size_id and sc.id = c.condition_id
        and lower(ps.size_name) = lower(coalesce(v_entry->>'size', '')) and sc.code = coalesce(v_entry->>'condition', '');
    end loop;
  end if;

  perform set_config('agriverse.movement_task_id', p_task_id::text, true);
  perform set_config('agriverse.movement_reason', 'stock_check', true);

  for v_size in
    select c.pineapple_size_id as size_id, ps.size_name, sum(c.quantity) as damaged
    from public.stock_check_counts c
    join public.pineapple_sizes ps on ps.id = c.pineapple_size_id
    where c.task_id = p_task_id and exists (
      select 1 from public.stock_conditions sc
      where sc.id = c.condition_id and sc.status = true
    )
    group by c.pineapple_size_id, ps.size_name
    having sum(c.quantity) > 0
    order by c.pineapple_size_id
  loop
    v_item_id := public.stock_check_item_for_size(v_size.size_id);
    if v_item_id is null then
      raise exception 'No % Pineapple stock to remove the damaged pineapples from', v_size.size_name;
    end if;
    select quantity into v_available from public.inventory_items where id = v_item_id for update;
    if v_available < v_size.damaged then
      raise exception 'Not enough % Pineapple stock (% left) to remove % damaged. Correct the count first.',
        v_size.size_name, v_available, v_size.damaged;
    end if;

    for v_condition in
      select c.condition_id, c.quantity
      from public.stock_check_counts c
      join public.stock_conditions sc on sc.id = c.condition_id
      where c.task_id = p_task_id and c.pineapple_size_id = v_size.size_id and c.quantity > 0 and sc.status = true
      order by sc.sort_order
    loop
      perform set_config('agriverse.movement_condition_id', v_condition.condition_id::text, true);
      update public.inventory_items set quantity = quantity - v_condition.quantity where id = v_item_id;
    end loop;
  end loop;

  perform set_config('agriverse.movement_reason', '', true);
  perform set_config('agriverse.movement_condition_id', '', true);
  perform set_config('agriverse.movement_task_id', '', true);

  update public.tasks set status_id = v_completed_id, approved_by = p_admin_id, approved_at = now()
  where id = p_task_id returning * into v_task;
  return v_task;
end;
$$;

alter table public.stock_conditions enable row level security;
alter table public.stock_check_counts enable row level security;
alter table public.stock_check_photos enable row level security;
revoke all on table public.stock_conditions, public.stock_check_counts, public.stock_check_photos
  from anon, authenticated;
grant all on table public.stock_conditions, public.stock_check_counts, public.stock_check_photos
  to service_role;
grant usage, select on sequence public.stock_conditions_id_seq, public.stock_check_counts_id_seq,
  public.stock_check_photos_id_seq to service_role;

revoke all on function public.stock_check_item_for_size(bigint) from public, anon, authenticated;
revoke all on function public.start_stock_check_task(bigint, uuid) from public, anon, authenticated;
revoke all on function public.save_stock_check_submission(bigint, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.approve_stock_check_task(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.stock_check_item_for_size(bigint) to service_role;
grant execute on function public.start_stock_check_task(bigint, uuid) to service_role;
grant execute on function public.save_stock_check_submission(bigint, uuid, jsonb, jsonb) to service_role;
grant execute on function public.approve_stock_check_task(bigint, uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

