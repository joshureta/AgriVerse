-- Allow admins to cancel pending farm tasks and notify workers/drivers.

alter table public.tasks
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null;

-- The lifecycle trigger previously rejected the already-configured cancelled status.
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
    new.cancelled_at = null;
    new.cancelled_by = null;
  elsif status_code = 'in_progress' then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = null;
  elsif status_code in ('awaiting_approval', 'completed') then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = coalesce(new.completed_at, now());
  elsif status_code = 'cancelled' then
    new.started_at = null;
    new.completed_at = null;
    new.cancelled_at = coalesce(new.cancelled_at, now());
  else
    raise exception 'Unknown task status ID %', new.status_id using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.cancel_pending_task(
  p_task_id bigint,
  p_cancelled_by uuid
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_status_id bigint;
  cancelled_task_status_id bigint;
  cancelled_schedule_status_id bigint;
begin
  select id into pending_status_id from public.task_statuses where code = 'pending';
  select id into cancelled_task_status_id from public.task_statuses where code = 'cancelled';
  select id into cancelled_schedule_status_id from public.schedule_statuses where code = 'cancelled';

  if pending_status_id is null or cancelled_task_status_id is null or cancelled_schedule_status_id is null then
    raise exception 'cancellation_status_not_configured' using errcode = 'P0001';
  end if;

  update public.tasks
  set status_id = cancelled_task_status_id,
      cancelled_at = now(),
      cancelled_by = p_cancelled_by
  where id = p_task_id and status_id = pending_status_id;

  if not found then
    raise exception 'task_not_pending' using errcode = 'P0001';
  end if;

  update public.schedules
  set status_id = cancelled_schedule_status_id
  where task_id = p_task_id;

  return p_task_id;
end;
$$;

revoke all on function public.cancel_pending_task(bigint, uuid) from public, anon, authenticated;
grant execute on function public.cancel_pending_task(bigint, uuid) to service_role;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'task_assigned', 'task_starting_soon', 'harvest_approved', 'harvest_rejected',
  'task_reassigned', 'task_cancelled', 'admin_broadcast', 'weather_alert',
  'delivery_assigned', 'delivery_cancelled', 'delivery_window_approaching', 'order_cancelled',
  'dispute_opened', 'cod_confirmed', 'rating_received', 'order_status_updated'
));

notify pgrst, 'reload schema';
