-- A DHT22 failure must not block a valid capacitive soil-moisture reading.
-- Keep all readings in sensor_readings, including moisture-only rows.
alter table public.sensor_readings
  add column if not exists soil_moisture double precision;

-- Air and soil temperature are now separate firmware measurements.
alter table public.sensor_readings
  alter column soil_temperature_c drop expression if exists;

alter table public.sensor_readings
  drop constraint if exists sensor_readings_has_climate_value;

alter table public.sensor_readings
  add constraint sensor_readings_has_climate_value
  check (
    temperature_c is not null
    or humidity_percent is not null
    or soil_moisture is not null
    or soil_temperature_c is not null
  );

comment on column public.sensor_readings.temperature_c is
  'DHT22 air temperature in Celsius.';
comment on column public.sensor_readings.soil_temperature_c is
  'DS18B20 soil temperature in Celsius; NULL when the probe is disconnected.';
