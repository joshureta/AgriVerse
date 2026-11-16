-- Keep the existing ESP32 payload and add the requested field names for
-- current and historical rows. The database computes these values from the
-- columns that the firmware already sends.
alter table public.sensor_readings
  add column if not exists soil_temperature_c double precision
    generated always as (temperature_c) stored;

alter table public.sensor_readings
  add column if not exists recorded_at timestamptz
    generated always as (created_at) stored;

alter table public.sensor_readings
  add column if not exists recorded_uid text
    generated always as (device_id) stored;

alter table public.soil_readings
  add column if not exists recorded_at timestamptz
    generated always as (created_at) stored;

alter table public.soil_readings
  add column if not exists recorded_uid text
    generated always as (device_id) stored;

comment on column public.sensor_readings.soil_temperature_c is
  'Alias of temperature_c; the DS18B20 soil temperature in Celsius.';
comment on column public.sensor_readings.recorded_at is
  'Alias of created_at; the ESP32 measurement time when provided.';
comment on column public.sensor_readings.recorded_uid is
  'Alias of device_id; identifies the ESP32 device, not a Supabase user.';
comment on column public.soil_readings.recorded_at is
  'Alias of created_at; the ESP32 measurement time when provided.';
comment on column public.soil_readings.recorded_uid is
  'Alias of device_id; identifies the ESP32 device, not a Supabase user.';
