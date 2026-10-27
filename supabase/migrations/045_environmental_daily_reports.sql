-- Apply in the main AgriVerse Supabase project, not the sensor project.
-- Only the backend service role can read or write these generated reports.
create table if not exists public.environmental_daily_reports (
  id uuid primary key default gen_random_uuid(),
  field_name text not null check (field_name in ('Field A', 'Field B', 'Field C', 'Field D')),
  report_date date not null,
  status text not null check (status in ('preview', 'final')),
  metrics jsonb not null,
  summary text not null,
  suggested_check text not null default '',
  model text not null,
  generated_at timestamptz not null default now(),
  unique (field_name, report_date)
);

alter table public.environmental_daily_reports enable row level security;
revoke all on public.environmental_daily_reports from anon, authenticated;
