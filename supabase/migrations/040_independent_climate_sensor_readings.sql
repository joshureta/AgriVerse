-- Let the ESP32 report a healthy climate sensor when the other one fails.
alter table public.sensor_readings
  alter column temperature_c drop not null,
  alter column humidity_percent drop not null;

alter table public.sensor_readings
  add constraint sensor_readings_has_climate_value
  check (temperature_c is not null or humidity_percent is not null);
