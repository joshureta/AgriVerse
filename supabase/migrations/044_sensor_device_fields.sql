-- Run this migration in the sensor Supabase project. Assign each installed
-- device to its physical field in the SQL editor after confirming its location.
create table if not exists public.sensor_device_fields (
  device_id text primary key,
  field_name text not null check (field_name in ('Field A', 'Field B', 'Field C', 'Field D'))
);

alter table public.sensor_device_fields enable row level security;
revoke all on public.sensor_device_fields from anon;
grant select on public.sensor_device_fields to anon;

drop policy if exists "Website can view device fields" on public.sensor_device_fields;
create policy "Website can view device fields"
on public.sensor_device_fields
for select
to anon
using (true);

alter table public.sensor_readings add column if not exists field_name text;
alter table public.soil_readings add column if not exists field_name text;

-- Store the field at measurement time. Reassigning a device later must not
-- silently move its earlier measurements to the new field.
create or replace function public.set_sensor_reading_field()
returns trigger
language plpgsql
as $$
begin
  new.field_name := (
    select field_name from public.sensor_device_fields
    where device_id = new.device_id
  );
  return new;
end;
$$;

drop trigger if exists sensor_readings_set_field on public.sensor_readings;
create trigger sensor_readings_set_field
before insert on public.sensor_readings
for each row execute function public.set_sensor_reading_field();

drop trigger if exists soil_readings_set_field on public.soil_readings;
create trigger soil_readings_set_field
before insert on public.soil_readings
for each row execute function public.set_sensor_reading_field();

create index if not exists sensor_readings_device_time_idx
  on public.sensor_readings (device_id, created_at desc);
create index if not exists soil_readings_device_time_idx
  on public.soil_readings (device_id, created_at desc);

-- Example after verifying where the ESP32 is installed:
-- insert into public.sensor_device_fields (device_id, field_name)
-- values ('esp32-01', 'Field A')
-- on conflict (device_id) do update set field_name = excluded.field_name;
-- Existing readings remain unassigned. Backfill them only after verifying
-- that the device was in the same field for the entire historical period.
