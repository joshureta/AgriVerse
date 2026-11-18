-- A resolved overdue assignment no longer blocks the worker's next job.
create or replace function public.guard_operation_progress()
returns trigger language plpgsql security definer set search_path = '' as $$
declare worker uuid; needs_check boolean; code text;
begin
  if tg_table_name='tasks' then
    select s.code into code from public.task_statuses s where s.id=new.status_id;
    worker := old.assigned_worker_id;
    needs_check := new.status_id is distinct from old.status_id and code in ('in_progress','awaiting_approval','completed');
  else
    worker := old.assigned_driver_id;
    needs_check := new.delivery_assignment_status is distinct from old.delivery_assignment_status
      and new.delivery_assignment_status in ('accepted','picked_up','out_for_delivery','delivered');
  end if;
  if needs_check and worker is not null then
    perform public.detect_overdue_operations(worker);
    if exists(
      select 1 from public.operation_incidents
      where assignee_id=worker and recovered_at is null and reason_submitted_at is null
    ) then
      raise exception 'Submit a delay reason in Operations before closing work or starting another job.' using errcode='P0001';
    end if;
  end if;
  return new;
end $$;
