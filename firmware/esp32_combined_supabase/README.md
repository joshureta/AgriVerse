# ESP32 combined DHT22 and soil sensor

This is the sketch to upload when both sensors are connected to the same ESP32.
It sends DHT22 data to `public.sensor_readings` and soil data to
`public.soil_readings` every 30 seconds.

## Wiring

Both sensors share the ESP32's `3V3` and `GND` connections.

| Sensor pin | ESP32 pin |
| --- | --- |
| DHT22 VCC / `+` | `3V3` |
| DHT22 GND / `-` | `GND` |
| DHT22 DATA / `S` / `OUT` | `GPIO 27` |
| Soil VCC | `3V3` |
| Soil GND | `GND` |
| Soil AOUT | `GPIO 34` |

Do not connect the soil sensor's digital output. Follow the labels printed on
each module instead of relying on wire colors.

## Upload steps

1. Copy an already configured `secrets.h` from either Supabase firmware folder
   into this folder. It is ignored by Git.
2. Open `esp32_combined_supabase.ino` in Arduino IDE.
3. Install **DHT sensor library by Adafruit** if it is not already installed.
4. Select **ESP32 Dev Module** and the ESP32's COM port.
5. Upload the sketch.
6. Open Serial Monitor at **115200 baud**.

A successful cycle prints both:

```text
DHT22 saved: ... (HTTP 201)
Soil saved: ... (HTTP 201)
```

The website reads the same two Supabase tables, so no website code change is
needed. Keep the ESP32 powered and connected to its configured 2.4 GHz Wi-Fi.
