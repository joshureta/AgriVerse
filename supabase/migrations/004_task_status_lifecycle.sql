-- Lifecycle support for the existing normalized AgriVerse task schema.
alter table public.tasks
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists tasks_worker_status_created_idx
  on public.tasks (assigned_worker_id, status_id, created_at);

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
  elsif status_code = 'completed' then
    new.started_at = coalesce(new.started_at, now());
    new.completed_at = coalesce(new.completed_at, now());
  else
    raise exception 'Unknown task status ID %', new.status_id using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_set_lifecycle_timestamps on public.tasks;
create trigger tasks_set_lifecycle_timestamps
  before insert or update of status_id on public.tasks
  for each row execute procedure public.set_normalized_task_lifecycle_timestamps();

update public.tasks as task
set
  started_at = case when status.code in ('in_progress', 'completed') then coalesce(task.started_at, task.updated_at, task.created_at) else null end,
  completed_at = case when status.code = 'completed' then coalesce(task.completed_at, task.updated_at, task.created_at) else null end
from public.task_statuses as status
where status.id = task.status_id;

grant all on table public.tasks to service_role;
