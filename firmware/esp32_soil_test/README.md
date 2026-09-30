# ESP32 capacitive soil-moisture calibration test

This sketch tests the soil sensor separately. It does not modify or replace the
saved DHT22 source code, connect to Wi-Fi, or write to Supabase.

## Wiring

Disconnect USB power before changing wires. Connect the sensor's labeled pins:

- VCC to ESP32 3V3
- GND to ESP32 GND
- AOUT to ESP32 GPIO 34

Power the sensor from 3.3 V. Do not submerge the connector or electronics at the
top of the probe.

## Test

1. Open `esp32_soil_test.ino` in Arduino IDE.
2. Select ESP32 Dev Module and the ESP32 serial port.
3. Upload the sketch and open Serial Monitor at 115200 baud.
4. Leave the probe dry and record a stable raw value.
5. Insert only the sensing portion into wet soil and record a stable raw value.

The current provisional calibration uses 2800 as dry and 1150 as wet, based on
the first observed test range. The Serial Monitor prints the averaged raw value,
calculated percentage, and Dry, Moist, or Wet classification once per second.

Uploading this sketch temporarily stops DHT22 transmissions because an ESP32
runs one sketch at a time. Upload `esp32_dht22_supabase.ino` again to restore the
temperature and humidity firmware.
