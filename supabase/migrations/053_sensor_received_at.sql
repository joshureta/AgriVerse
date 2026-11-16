-- created_at is when the ESP32 measured the reading.
-- received_at is when Supabase accepted the insert. Older rows remain NULL
-- because their true arrival time cannot be recovered.
alter table public.sensor_readings
  add column if not exists received_at timestamptz;

alter table public.soil_readings
  add column if not exists received_at timestamptz;

alter table public.sensor_readings
  alter column received_at set default now();

alter table public.soil_readings
  alter column received_at set default now();

-- Ignore a timestamp supplied by a client so received_at always reflects
-- the database's own clock, including when an offline reading is uploaded later.
create or replace function public.stamp_sensor_received_at()
returns trigger
language plpgsql
as $$
begin
  new.received_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists sensor_readings_stamp_received_at on public.sensor_readings;
create trigger sensor_readings_stamp_received_at
before insert on public.sensor_readings
for each row execute function public.stamp_sensor_received_at();

drop trigger if exists soil_readings_stamp_received_at on public.soil_readings;
create trigger soil_readings_stamp_received_at
before insert on public.soil_readings
for each row execute function public.stamp_sensor_received_at();
