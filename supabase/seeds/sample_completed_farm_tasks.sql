-- Demo records for Admin > Records > farm activity tabs in the MAIN Supabase project.
-- Run in the Supabase SQL Editor after the main-project migrations through 034.
-- Requires at least one existing profile with role = farm_worker (not seller/driver).
-- Adds 20 completed tasks per farm category (140 total): Pest & Disease has
-- 10 inspections and 10 actions. Every task is marked [DEMO]. Rerunning skips
-- tasks with the same names, including the eight names from the earlier seed.
-- These are historical examples: no stock is deducted or added, no photo is uploaded,
-- and no order or delivery is created. Do not treat them as real worker activity.

begin;

do $$
declare
  v_worker_id uuid;
  v_admin_id uuid;
  v_completed_status_id bigint;
  v_completed_schedule_status_id bigint;
  v_priority_id bigint;
  v_category_id bigint;
  v_field_id bigint;
  v_fertilizer_id bigint;
  v_pesticide_id bigint;
  v_supply_category_id bigint;
  v_unit_id bigint;
  v_task_id bigint;
  v_sequence integer;
  v_limit integer;
  v_task_name text;
  v_field_name text;
  v_date date;
  v_started_at timestamptz;
  v_completed_at timestamptz;
  sample record;
begin
  -- Choose an existing crop farm worker. To use a specific worker, replace this
  -- SELECT with: v_worker_id := 'YOUR-WORKER-UUID'::uuid;
  select p.id into v_worker_id
  from public.profiles p
  where p.role::text = 'farm_worker'
    and coalesce(p.worker_category::text, '') not in ('seller', 'driver')
  order by p.id
  limit 1;

  if v_worker_id is null then
    raise exception 'Create a crop farm worker account first, then rerun this seed.';
  end if;

  select p.id into v_admin_id
  from public.profiles p
  where p.role::text = 'admin'
  order by p.id
  limit 1;

  select id into strict v_completed_status_id
  from public.task_statuses where code = 'completed';
  select id into strict v_completed_schedule_status_id
  from public.schedule_statuses where code = 'completed';
  select id into strict v_priority_id
  from public.task_priorities where code = 'medium';

  -- Records shows supply name and amount for Fertilization and Pest & Disease Action.
  -- Reuse active items where possible. Create zero-stock demo items only if needed.
  select i.id into v_fertilizer_id
  from public.inventory_items i
  join public.inventory_categories c on c.id = i.inventory_category_id
  where c.code = 'fertilizer' and i.archived_at is null
  order by (lower(i.item_name) = 'urea (21-0-0)') desc, i.id
  limit 1;
  if v_fertilizer_id is null then
    select id into strict v_supply_category_id
    from public.inventory_categories where code = 'fertilizer';
    select id into strict v_unit_id
    from public.measurement_units where abbreviation = 'bags';
    insert into public.inventory_items
      (inventory_category_id, unit_id, item_name, quantity)
    values (v_supply_category_id, v_unit_id, '[DEMO] Urea (21-0-0)', 0)
    returning id into v_fertilizer_id;
    insert into public.fertilizer_inventory (inventory_id, formulation)
    values (v_fertilizer_id, '21-0-0');
  end if;

  select i.id into v_pesticide_id
  from public.inventory_items i
  join public.inventory_categories c on c.id = i.inventory_category_id
  where c.code = 'pesticide' and i.archived_at is null
  order by (lower(i.item_name) = 'furadan') desc, i.id
  limit 1;
  if v_pesticide_id is null then
    select id into strict v_supply_category_id
    from public.inventory_categories where code = 'pesticide';
    select id into strict v_unit_id
    from public.measurement_units where abbreviation = 'kg';
    insert into public.inventory_items
      (inventory_category_id, unit_id, item_name, quantity)
    values (v_supply_category_id, v_unit_id, '[DEMO] Pest Control', 0)
    returning id into v_pesticide_id;
    insert into public.pesticide_inventory (inventory_id, pesticide_type)
    values (v_pesticide_id, 'Insecticide');
  end if;

  for sample in
    select * from (values
      -- name, category, field, days ago, start time, duration minutes,
      -- Pest & Disease activity, inspection answers, supply kind, amount,
      -- small/medium/large/damaged counts, worker insight
      ('[DEMO] Fertilize Field A', 'Fertilization', 'Field A', 1, time '08:00', 90,
       null::text, null::jsonb, 'fertilizer', 2, null::integer, null::integer, null::integer, null::integer,
       'Applied fertilizer evenly along the planting rows.'),
      ('[DEMO] Harvest Field B', 'Harvesting', 'Field B', 2, time '07:30', 120,
       null, null, null, null, 12, 18, 10, 2,
       'Sorted harvested pineapples by size; damaged fruit was separated.'),
      ('[DEMO] Irrigate Field C', 'Irrigation', 'Field C', 3, time '07:00', 60,
       null, null, null, null, null, null, null, null,
       'Watered all rows and checked the irrigation lines.'),
      ('[DEMO] Monitor Field D', 'Monitoring', 'Field D', 4, time '09:00', 60,
       null, '{"crop_condition":"Healthy","pest_observed":"None observed","recommended_action":"Continue routine monitoring"}'::jsonb,
       null, null, null, null, null, null,
       'Plants appeared healthy during the routine inspection.'),
      ('[DEMO] Inspect pests in Field A', 'Pest & Disease', 'Field A', 5, time '08:30', 60,
       'inspection', '{"crop_condition":"Needs attention","pest_observed":"Mealybug wilt","recommended_action":"Apply pesticide next visit"}'::jsonb,
       null, null, null, null, null, null,
       'Mealybug signs were observed in several rows.'),
      ('[DEMO] Treat pests in Field A', 'Pest & Disease', 'Field A', 4, time '10:00', 75,
       'action', null, 'pesticide', 1, null, null, null, null,
       'Treated affected plants and marked the area for follow-up.'),
      ('[DEMO] Plant Field B', 'Planting', 'Field B', 6, time '07:30', 90,
       null, null, null, null, null, null, null, null,
       'New pineapple slips were planted at the planned spacing.'),
      ('[DEMO] Weed Field C', 'Weeding', 'Field C', 7, time '08:00', 90,
       null, null, null, null, null, null, null, null,
       'Removed weeds between rows and cleared the field edges.')
    ) as s(
      task_name, category_name, field_name, days_ago, start_time, duration_minutes,
      activity_type, details, supply_kind, supply_quantity,
      small_count, medium_count, large_count, damaged_count, completion_notes
    )
  loop
    select id into strict v_category_id
    from public.task_categories where category_name = sample.category_name;
    v_limit := case when sample.category_name = 'Pest & Disease' then 10 else 20 end;

    for v_sequence in 1..v_limit loop
      -- Preserve the original eight task names for safe upgrades from the first seed.
      v_task_name := case when v_sequence = 1 then sample.task_name
        else sample.task_name || ' #' || lpad(v_sequence::text, 2, '0') end;
      if exists (select 1 from public.tasks t where t.task_name = v_task_name) then
        continue;
      end if;

      -- Rotate the additional samples across the four configured farm fields.
      v_field_name := case when v_sequence = 1 then sample.field_name
        else 'Field ' || chr(65 + ((v_sequence - 1) % 4)) end;
      select id into strict v_field_id
      from public.farm_fields where field_name = v_field_name;

      v_date := (now() at time zone 'Asia/Manila')::date - sample.days_ago - (v_sequence - 1);
      v_started_at := (v_date + sample.start_time) at time zone 'Asia/Manila';
      v_completed_at := v_started_at + make_interval(mins => sample.duration_minutes);

      insert into public.tasks (
        assigned_worker_id, category_id, field_id, priority_id, status_id,
        task_name, description, estimated_duration_minutes,
        started_at, completed_at, completion_notes, activity_type, details,
        inventory_item_id, inventory_quantity,
        harvest_small_count, harvest_medium_count, harvest_large_count,
        harvest_damaged_count, approved_by, approved_at, created_by
      ) values (
        v_worker_id, v_category_id, v_field_id, v_priority_id, v_completed_status_id,
        v_task_name, 'Sample completed farm task for the Records page.', sample.duration_minutes,
        v_started_at, v_completed_at, sample.completion_notes,
        sample.activity_type, sample.details,
        case sample.supply_kind when 'fertilizer' then v_fertilizer_id
                                when 'pesticide' then v_pesticide_id else null end,
        sample.supply_quantity,
        case when sample.small_count is null then null else sample.small_count + (v_sequence - 1) % 5 end,
        case when sample.medium_count is null then null else sample.medium_count + (v_sequence - 1) % 5 end,
        case when sample.large_count is null then null else sample.large_count + (v_sequence - 1) % 5 end,
        sample.damaged_count,
        case when sample.category_name = 'Harvesting' then v_admin_id else null end,
        case when sample.category_name = 'Harvesting' then v_completed_at else null end,
        v_admin_id
      ) returning id into v_task_id;

      insert into public.schedules
        (task_id, schedule_date, start_time, end_time, location, status_id, notes)
      values (
        v_task_id, v_date, sample.start_time,
        sample.start_time + make_interval(mins => sample.duration_minutes),
        v_field_name, v_completed_schedule_status_id,
        'Sample schedule for a completed farm task.'
      );
    end loop;
  end loop;
end $$;

-- Confirm what the Records endpoint will find.
select c.category_name, count(*) as demo_completed_records
from public.tasks t
join public.task_categories c on c.id = t.category_id
join public.task_statuses s on s.id = t.status_id
where t.task_name like '[DEMO] %' and s.code = 'completed'
group by c.category_name
order by c.category_name;

commit;
