# ESP32 soil moisture to Supabase

This separate sketch reads the capacitive sensor on GPIO 34, converts the raw
value using the provisional 2800 dry and 1150 wet calibration, and inserts a row
into `public.soil_readings` every 30 seconds.

Before uploading:

1. Ensure the sensor tables exist and apply `066_private_sensor_api.sql` in the
   sensor project's SQL Editor.
2. Fill in Wi-Fi, backend `API_URL`, shared `DEVICE_TOKEN`, and `DEVICE_ID` in
   this folder's ignored `secrets.h`. Configure the matching token and device ID
   on the backend as described in the root README.
3. Keep VCC on 3V3, GND on GND, and AOUT on GPIO 34.

Open Serial Monitor at 115200 baud. HTTP 201 or 204 confirms that Supabase saved
the reading. Upload the DHT22 sketch again whenever you want to restore
temperature and humidity transmission.
