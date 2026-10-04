# ESP32 DHT22 to Supabase: first device test

This sketch sends one temperature and humidity reading every 30 seconds to
`public.sensor_readings` using the publishable (or legacy anon) key. It does not
send `soil_moisture`; a DHT22 cannot measure it. It assumes `id` and `created_at`
have database defaults and writes the `temperature_c` and `humidity_percent`
columns used by the AgriVerse monitoring page.

Run `supabase/migrations/039_dht22_sensor_readings.sql` in the **sensor** Supabase
project's SQL Editor before uploading the sketch. Use that project's URL and
publishable key in both `secrets.h` and `web/.env.local` (the
`VITE_SENSOR_SUPABASE_URL` and `VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY` settings).
The SQL permits the `esp32-01` device ID used by the local sketch.

## Wiring

The working Arduino sketch uses GPIO 27 for the DHT22 DATA line. The photographed
ESP32 board labels this pin `G27` on the left edge when the USB socket is at the
bottom. It labels `3V3` at the top left and `GND` at the top right. The
photographed white DHT22-style sensor is a three-pin module. Connect its
**labeled** VCC/+ pin to `3V3`, GND/- pin to `GND`, and DATA/S pin to `G27`.
Do not rely on jumper-wire colors or the module's left-to-right pin order;
check the printed labels before powering it. This module appears to have its
own support components, so start without the loose resistor. A bare four-pin
DHT22 requires a 10 kΩ pull-up between DATA and 3V3. If DATA uses another GPIO,
change `DHT_PIN` in the sketch.

The kit also includes a capacitive soil-moisture probe, LED, and buzzer. Leave
them disconnected for this first DHT22 test. The probe can be added on an
ESP32 ADC1 input such as `G34` after the first temperature/humidity row arrives;
it will need dry/wet calibration before a percentage is meaningful.

## Arduino IDE

1. Install **esp32 by Espressif Systems** board package version **3.3.12** or
   newer. For the photographed ESP32 development board, start with **ESP32 Dev
   Module** and select its serial port.
2. In Library Manager, install **DHT sensor library by Adafruit** and
   **Adafruit Unified Sensor**.
3. Edit the local `secrets.h` in this folder. For a fresh checkout, first copy
   `secrets.example.h` to `secrets.h`. Fill in the Wi-Fi name/password,
   Supabase Project URL, publishable (or legacy anon) key, and a device ID.
   Use a 2.4 GHz Wi-Fi network. Never put a service-role/secret key or database
   password on the ESP32.
4. Open `esp32_dht22_supabase.ino`, upload it, and open Serial Monitor at
   **115200 baud**. It prints sensor readings about every two seconds and sends
   one row every 30 seconds. A successful insert prints `Reading saved` with
   HTTP 201 or 204. Refresh Supabase Table Editor → `sensor_readings` to see the
   new row.

If the serial monitor shows an HTTP error, copy the status and message but
remove credentials before sharing it. HTTP 401/403 suggests key, grant, or RLS
access; HTTP 400 often means a column name or table constraint differs from
the assumptions above. A TLS or clock error points to Wi-Fi, time sync, or the
certificate bundle.

If it stays at `Waiting for Wi-Fi`, check that the phone hotspot is on, is set
to 2.4 GHz or compatibility mode, and that `WIFI_SSID` and `WIFI_PASSWORD`
exactly match it. `Configured hotspot is not visible` means the ESP32 did not
detect that Wi-Fi name on a scan. After changing those values, upload the sketch
again. The sketch enables the board's automatic Wi-Fi reconnection without
starting a second connection while one is already in progress.

The RLS insert policy checks the device ID and DHT22 measurement ranges, but a
device ID is not proof of identity. Anyone with the public key can claim that
ID and submit plausible readings. Use this for the first hardware test, then
move ingestion behind a device-authenticated backend endpoint and remove the
public insert policy.
