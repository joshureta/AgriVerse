create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  temperature_c double precision not null,
  humidity_percent double precision not null,
  created_at timestamptz not null default now()
);

alter table public.sensor_readings enable row level security;

revoke all on public.sensor_readings from anon;
grant select, insert on public.sensor_readings to anon;

drop policy if exists "ESP32 can insert readings" on public.sensor_readings;
create policy "ESP32 can insert readings"
on public.sensor_readings
for insert
to anon
with check (device_id = 'esp32-01');

drop policy if exists "Website can view readings" on public.sensor_readings;
create policy "Website can view readings"
on public.sensor_readings
for select
to anon
using (true);

-- Realtime drives instant dashboard updates; polling remains as a fallback.
do $$
begin
  alter publication supabase_realtime add table public.sensor_readings;
exception
  when duplicate_object then null;
end $$;
