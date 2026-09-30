create table if not exists public.soil_readings (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  moisture_raw integer not null check (moisture_raw between 0 and 4095),
  moisture_percent real not null check (moisture_percent between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.soil_readings enable row level security;

revoke all on public.soil_readings from anon;
grant select, insert on public.soil_readings to anon;

drop policy if exists "ESP32 can insert soil readings" on public.soil_readings;
create policy "ESP32 can insert soil readings"
on public.soil_readings
for insert
to anon
with check (device_id = 'esp32-01');

drop policy if exists "Website can view soil readings" on public.soil_readings;
create policy "Website can view soil readings"
on public.soil_readings
for select
to anon
using (true);

do $$
begin
  alter publication supabase_realtime add table public.soil_readings;
exception
  when duplicate_object then null;
end $$;
