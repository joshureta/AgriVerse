# DS18B20 soil-temperature test

Use this sketch to verify the waterproof DS18B20 probe before adding it to the
combined Supabase firmware.

## Wiring

| DS18B20 connection | ESP32 |
| --- | --- |
| VCC | `3V3` |
| GND | `GND` |
| DATA | `GPIO 26` |

Unless the probe adapter already contains one, connect a 4.7 kΩ resistor
between DATA and `3V3`. Follow the labels or datasheet for the specific probe;
wire colors are not guaranteed.

## Test

1. Install the **OneWire** and **DallasTemperature** libraries in Arduino IDE.
2. Open `esp32_ds18b20_test.ino`.
3. Select **ESP32 Dev Module** and the correct COM port, then upload.
4. Open Serial Monitor at **115200 baud**.

Working output shows `Sensors found: 1` and a realistic temperature. Hold the
metal probe to make the value rise, then place only the stainless-steel section
in cool water to make it fall. `-127 C` or `Sensors found: 0` indicates a wiring
or pull-up problem; a persistent `85 C` usually indicates a communication or
power problem.
