-- Record whether the assignee can continue, and require their delay submission
-- before an admin classifies or resolves an overdue assignment.
alter table public.operation_incidents add column if not exists can_continue boolean;
alter table public.tasks add column if not exists stopped_work_notes text
  check (stopped_work_notes is null or char_length(trim(stopped_work_notes)) between 5 and 2000);

create or replace function public.guard_overdue_admin_decision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if ((new.reviewed_at is not null and old.reviewed_at is null)
      or (new.recovered_by is not null and old.recovered_by is null))
      and old.reason_submitted_at is null then
    raise exception 'The assignee must submit a delay reason before an admin decision.' using errcode = 'P0001';
  end if;
  if new.recovered_by is not null and old.recovered_by is null and old.reviewed_at is null then
    raise exception 'Review the delay reason before deciding this assignment.' using errcode = 'P0001';
  end if;
  if new.recovered_by is not null and old.recovered_by is null
      and old.task_id is not null and old.can_continue is false
      and new.recovery_action = 'reschedule' then
    raise exception 'This worker cannot continue. Reassign or stop the task.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger operation_reason_before_admin_decision
before update of reviewed_at, recovered_by on public.operation_incidents
for each row execute function public.guard_overdue_admin_decision();

create function public.guard_overdue_cancellation_reason()
returns trigger language plpgsql security definer set search_path = '' as $$
declare assignee uuid; incident_missing boolean; review_missing boolean; new_code text;
begin
  if tg_table_name = 'tasks' then
    select code into new_code from public.task_statuses where id = new.status_id;
    if new_code <> 'cancelled' or new.status_id is not distinct from old.status_id then return new; end if;
    assignee := old.assigned_worker_id;
  else
    if old.assigned_driver_id is null or new.assigned_driver_id is not null then return new; end if;
    if new.order_status <> 'ready_for_delivery' or new.delivery_assignment_status <> 'declined' then return new; end if;
    assignee := old.assigned_driver_id;
  end if;
  perform public.detect_overdue_operations(assignee);
  if tg_table_name = 'tasks' then
    select exists(select 1 from public.operation_incidents
      where task_id = old.id and recovered_at is null and reason_submitted_at is null) into incident_missing;
    select exists(select 1 from public.operation_incidents
      where task_id = old.id and recovered_at is null and reviewed_at is null) into review_missing;
  else
    select exists(select 1 from public.operation_incidents
      where order_id = old.id and recovered_at is null and reason_submitted_at is null) into incident_missing;
    select exists(select 1 from public.operation_incidents
      where order_id = old.id and recovered_at is null and reviewed_at is null) into review_missing;
  end if;
  if incident_missing then
    raise exception 'The assignee must submit a delay reason before an admin decision.' using errcode = 'P0001';
  end if;
  if review_missing then
    raise exception 'Review the delay reason before deciding this assignment.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger task_overdue_cancellation_reason
before update of status_id on public.tasks
for each row execute function public.guard_overdue_cancellation_reason();
create trigger delivery_overdue_cancellation_reason
before update of assigned_driver_id on public.buyer_orders
for each row execute function public.guard_overdue_cancellation_reason();

-- A stopped task retains its real start time for the existing task timeline.
create or replace function public.set_normalized_task_lifecycle_timestamps()
returns trigger language plpgsql set search_path = '' as $$
declare status_code text;
begin
  select code into status_code from public.task_statuses where id = new.status_id;
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
    new.started_at = old.started_at;
    new.completed_at = null;
    new.cancelled_at = coalesce(new.cancelled_at, now());
  else
    raise exception 'Unknown task status ID %', new.status_id using errcode = '23514';
  end if;
  return new;
end $$;

create function public.stop_overdue_task(p_incident bigint, p_admin uuid, p_notes text)
returns void language plpgsql security definer set search_path = '' as $$
declare i public.operation_incidents; t public.tasks; cancelled_task bigint; cancelled_schedule bigint;
begin
  if not exists(select 1 from public.profiles where id = p_admin and role = 'admin') then
    raise exception 'Admin access required.' using errcode = 'P0001';
  end if;
  if char_length(trim(coalesce(p_notes, ''))) not between 5 and 2000 then
    raise exception 'Record the work already done in 5–2000 characters.' using errcode = 'P0001';
  end if;
  select * into i from public.operation_incidents where id = p_incident;
  if not found or i.task_id is null then
    raise exception 'This task cannot be stopped from the overdue review.' using errcode = 'P0001';
  end if;
  perform 1 from public.tasks where id = i.task_id for update;
  select * into i from public.operation_incidents where id = p_incident for update;
  if not found or i.task_id is null or i.recovered_at is not null or i.reason_submitted_at is null or i.reviewed_at is null
      or i.can_continue is distinct from false then
    raise exception 'This task cannot be stopped from the overdue review.' using errcode = 'P0001';
  end if;
  select * into t from public.tasks where id = i.task_id for update;
  if t.assigned_worker_id is distinct from i.assignee_id or
      not exists(select 1 from public.task_statuses where id = t.status_id and code = 'in_progress') then
    raise exception 'Only in-progress work with the current assignee can be stopped.' using errcode = 'P0001';
  end if;
  select id into cancelled_task from public.task_statuses where code = 'cancelled';
  select id into cancelled_schedule from public.schedule_statuses where code = 'cancelled';
  if cancelled_task is null or cancelled_schedule is null then
    raise exception 'Cancellation status is not configured.' using errcode = 'P0001';
  end if;
  update public.tasks set status_id = cancelled_task, cancelled_at = now(), cancelled_by = p_admin,
    stopped_work_notes = trim(p_notes) where id = i.task_id;
  update public.schedules set status_id = cancelled_schedule where task_id = i.task_id;
  update public.operation_incidents set recovered_at = now(), recovered_by = p_admin,
    recovery_action = 'cancelled' where id = i.id;
  perform public.operation_notify(i.assignee_id, 'task_cancelled', 'Task stopped',
    i.label || ': the admin ended this task. Work recorded: ' || left(trim(p_notes), 350), i.task_id, null);
end $$;
revoke all on function public.stop_overdue_task(bigint, uuid, text) from public, anon, authenticated;
grant execute on function public.stop_overdue_task(bigint, uuid, text) to service_role;

notify pgrst, 'reload schema';
