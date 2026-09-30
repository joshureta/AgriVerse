# ESP32 soil moisture to Supabase

This separate sketch reads the capacitive sensor on GPIO 34, converts the raw
value using the provisional 2800 dry and 1150 wet calibration, and inserts a row
into `public.soil_readings` every 30 seconds.

Before uploading:

1. Run `supabase/migrations/038_soil_readings.sql` in the sensor project's SQL Editor.
2. Fill in the Wi-Fi values in this folder's ignored `secrets.h`.
3. Keep VCC on 3V3, GND on GND, and AOUT on GPIO 34.

Open Serial Monitor at 115200 baud. HTTP 201 or 204 confirms that Supabase saved
the reading. Upload the DHT22 sketch again whenever you want to restore
temperature and humidity transmission.
