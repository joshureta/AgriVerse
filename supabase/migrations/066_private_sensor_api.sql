-- Apply in the Supabase project containing public.sensor_readings.
-- Monitoring and uploads pause until the updated backend and firmware are live.
alter table public.sensor_readings enable row level security;
alter table public.soil_readings enable row level security;
alter table public.sensor_device_fields enable row level security;

revoke all on public.sensor_readings, public.soil_readings, public.sensor_device_fields
  from public, anon, authenticated;

drop policy if exists "ESP32 can insert readings" on public.sensor_readings;
drop policy if exists "Website can view readings" on public.sensor_readings;
drop policy if exists "ESP32 can insert soil readings" on public.soil_readings;
drop policy if exists "Website can view soil readings" on public.soil_readings;
drop policy if exists "Website can view device fields" on public.sensor_device_fields;
