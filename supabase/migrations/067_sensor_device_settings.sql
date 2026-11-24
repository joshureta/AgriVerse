-- Apply in the Supabase project containing public.sensor_readings.
-- Admins set how often each ESP32 reads and sends data. The device polls
-- /api/sensors/config through the backend, so no direct client access is needed.
create table if not exists public.sensor_device_settings (
  device_id text primary key,
  read_interval_seconds integer not null default 10
    check (read_interval_seconds between 10 and 86400),
  updated_at timestamptz not null default now(),
  -- The sensor project may be separate from the main project, so this is not
  -- a foreign key to profiles.
  updated_by uuid,
  updated_by_name text
);

alter table public.sensor_device_settings enable row level security;
revoke all on public.sensor_device_settings from public, anon, authenticated;

-- Keep today's 10-second behavior for every known device.
insert into public.sensor_device_settings (device_id)
select device_id from public.sensor_device_fields
on conflict (device_id) do nothing;
