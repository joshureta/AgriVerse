-- A missed task date does not prevent its assigned worker from starting or submitting it.
-- Unexplained overdue work still guards progress on other assignments.
create or replace function public.guard_operation_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare worker uuid; needs_check boolean; code text;
begin
  if tg_table_name = 'tasks' then
    select s.code into code from public.task_statuses s where s.id = new.status_id;
    worker := old.assigned_worker_id;
    needs_check := new.status_id is distinct from old.status_id and code in ('in_progress', 'awaiting_approval', 'completed');
  else
    worker := old.assigned_driver_id;
    needs_check := new.delivery_assignment_status is distinct from old.delivery_assignment_status
      and new.delivery_assignment_status in ('accepted', 'picked_up', 'out_for_delivery', 'delivered');
  end if;
  if needs_check and worker is not null then
    perform public.detect_overdue_operations(worker);
    if tg_table_name = 'tasks' and exists (
      select 1 from public.operation_incidents
      where task_id = old.id and assignee_id = worker and recovered_at is null
    ) then
      return new;
    end if;
    if exists (
      select 1 from public.operation_incidents
      where assignee_id = worker and recovered_at is null and reason_submitted_at is null
    ) then
      raise exception 'Submit a delay reason in Operations before starting another job.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
