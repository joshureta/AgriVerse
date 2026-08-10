-- Completion information submitted by farm workers.
alter table public.tasks
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists completion_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tasks_completion_notes_length'
  ) then
    alter table public.tasks
      add constraint tasks_completion_notes_length
      check (completion_notes is null or char_length(completion_notes) <= 2000);
  end if;
end $$;

grant all on table public.tasks to service_role;
