# ESP32 combined soil temperature, humidity, and moisture sensors

This is the sketch to upload when all three sensors are connected to the same
ESP32. It sends DS18B20 soil temperature, DHT22 humidity, and capacitive soil
moisture to `public.sensor_readings` through the authenticated backend sensor
endpoint. It sends every 10 seconds by default.

## Changing the send interval

Admins set how often each device reads and sends data in **Settings → Sensors**
(10 seconds to 1 day). Run `supabase/migrations/067_sensor_device_settings.sql`
in the sensor Supabase project first. The sketch checks
`GET /api/sensors/config` every minute, so a change takes effect within about a
minute. The last value is kept in flash, so the device keeps using it after a
reboot without Wi-Fi. The serial monitor prints `Send interval changed to N seconds`
when it picks up a new value. The website widens its offline window to match:
two missed readings plus one minute, and never less than two minutes.

Run `supabase/migrations/040_independent_climate_sensor_readings.sql` in the
sensor Supabase project before uploading this version. It allows a valid
temperature or humidity reading to be saved even when the other sensor fails.
The website shows an offline alert for each sensor without a valid reading in
its offline window (two minutes at the default interval).

For field-specific monitoring, also run `supabase/migrations/044_sensor_device_fields.sql`
in the sensor Supabase project. It assigns `esp32-01` to **Field A**. Other
devices must also be assigned to a field before their readings appear on the
monitoring page.
The field is saved on each new reading, so moving a device later does not
relabel its earlier data. Existing readings stay unassigned unless you verify
their historical location and backfill them separately.

The capacitive probe uses an analog signal. The firmware rejects readings near
the ADC rails, but an unplugged probe can sometimes produce a plausible
number. Its website status means "recent valid reading received," not proof of
a physical electrical connection.

## Wiring

All sensors share the ESP32's `3V3` and `GND` connections.

| Sensor pin | ESP32 pin |
| --- | --- |
| DHT22 VCC / `+` | `3V3` |
| DHT22 GND / `-` | `GND` |
| DHT22 DATA / `S` / `OUT` | `GPIO 27` |
| DS18B20 red / VCC | `3V3` |
| DS18B20 black / GND | `GND` |
| DS18B20 yellow / DATA | `GPIO 26` |
| Capacitive soil sensor VCC | `3V3` |
| Capacitive soil sensor GND | `GND` |
| Capacitive soil sensor AOUT | `GPIO 34` |

Connect a `4.7K` to `5.1K` pull-up resistor between the DS18B20 DATA wire and
`3V3`.

Do not connect the soil sensor's digital output. Follow the labels printed on
each module instead of relying on wire colors.

## Upload steps

1. Copy `secrets.example.h` to `secrets.h` in this folder. It is ignored by Git.
   Set `API_URL` to the HTTPS backend origin, `DEVICE_TOKEN` to the backend's
   `SENSOR_DEVICE_TOKEN`, and `DEVICE_ID` to the backend's `SENSOR_DEVICE_ID`.
2. Open `esp32_combined_supabase.ino` in Arduino IDE.
3. Install **DHT sensor library by Adafruit**, **OneWire**, and
   **DallasTemperature by Miles Burton** if they are not already installed.
4. Select **ESP32 Dev Module** and the ESP32's COM port.
5. Upload the sketch.
6. Open Serial Monitor at **115200 baud**.

A successful cycle prints both:

```text
Climate readings saved (HTTP 201).
Soil saved: ... (HTTP 201)
```

Keep the ESP32 powered and connected to its configured 2.4 GHz Wi-Fi.
