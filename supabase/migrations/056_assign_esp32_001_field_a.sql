-- The combined firmware identifies this installation as ESP32_001 in Field A.
-- Register it so the existing insert triggers assign future sensor readings.
insert into public.sensor_device_fields (device_id, field_name)
values ('ESP32_001', 'Field A')
on conflict (device_id) do update set field_name = excluded.field_name;

-- Restore field association for readings inserted before the registration.
update public.sensor_readings
set field_name = 'Field A'
where device_id = 'ESP32_001' and field_name is null;

update public.soil_readings
set field_name = 'Field A'
where device_id = 'ESP32_001' and field_name is null;
