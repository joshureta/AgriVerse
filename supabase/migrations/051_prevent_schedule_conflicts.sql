-- Prevent a worker or driver from being assigned overlapping active schedules.
-- Intervals are half-open, so an assignment may start exactly when another ends.

create or replace function public.prevent_worker_schedule_conflict()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  worker_id uuid;
  status_code text;
begin
  select assigned_worker_id into worker_id
  from public.tasks
  where id = new.task_id;

  select code into status_code
  from public.schedule_statuses
  where id = new.status_id;

  if worker_id is null or status_code = 'cancelled' then
    return new;
  end if;

  -- Serialize checks for one worker so simultaneous assignment requests cannot
  -- both pass before either schedule is visible to the other request.
  perform pg_advisory_xact_lock(hashtextextended('worker:' || worker_id::text, 0));

  if exists (
    select 1
    from public.schedules existing
    join public.tasks task on task.id = existing.task_id
    join public.schedule_statuses schedule_status on schedule_status.id = existing.status_id
    where task.assigned_worker_id = worker_id
      and existing.id is distinct from new.id
      and existing.task_id <> new.task_id
      and schedule_status.code <> 'cancelled'
      and existing.schedule_date = new.schedule_date
      and existing.start_time < new.end_time
      and existing.end_time > new.start_time
  ) then
    raise exception 'worker_schedule_conflict' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists schedules_prevent_worker_conflict on public.schedules;
create trigger schedules_prevent_worker_conflict
  before insert or update of task_id, schedule_date, start_time, end_time, status_id
  on public.schedules
  for each row execute procedure public.prevent_worker_schedule_conflict();

create or replace function public.prevent_driver_schedule_conflict()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_driver_id is null
    or new.delivery_scheduled_at is null
    or new.delivery_window_end_at is null
    or new.order_status not in ('ready_for_delivery', 'out_for_delivery')
    or new.delivery_assignment_status not in ('assigned', 'accepted', 'picked_up', 'out_for_delivery') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('driver:' || new.assigned_driver_id::text, 0));

  if exists (
    select 1
    from public.buyer_orders existing
    where existing.assigned_driver_id = new.assigned_driver_id
      and existing.id is distinct from new.id
      and existing.order_status in ('ready_for_delivery', 'out_for_delivery')
      and existing.delivery_assignment_status in ('assigned', 'accepted', 'picked_up', 'out_for_delivery')
      and existing.delivery_scheduled_at < new.delivery_window_end_at
      and existing.delivery_window_end_at > new.delivery_scheduled_at
  ) then
    raise exception 'driver_schedule_conflict' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists buyer_orders_prevent_driver_conflict on public.buyer_orders;
create trigger buyer_orders_prevent_driver_conflict
  before insert or update of assigned_driver_id, delivery_scheduled_at, delivery_window_end_at, delivery_assignment_status, order_status
  on public.buyer_orders
  for each row execute procedure public.prevent_driver_schedule_conflict();

notify pgrst, 'reload schema';
