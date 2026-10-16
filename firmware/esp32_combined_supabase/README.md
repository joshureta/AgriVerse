# ESP32 combined soil temperature, humidity, and moisture sensors

This is the sketch to upload when all three sensors are connected to the same
ESP32. It sends DS18B20 soil temperature and DHT22 humidity to
`public.sensor_readings`, and capacitive soil moisture to
`public.soil_readings`, every 30 seconds.

Run `supabase/migrations/040_independent_climate_sensor_readings.sql` in the
sensor Supabase project before uploading this version. It allows a valid
temperature or humidity reading to be saved even when the other sensor fails.
The website shows an offline alert for each sensor without a valid reading in
the last two minutes.

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

1. Copy an already configured `secrets.h` from either Supabase firmware folder
   into this folder. It is ignored by Git.
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
