# Field B soil-moisture diagnostic

This is a separate, raw-reading test for the Field B ESP32. It uses D34/GPIO34,
the same pin as the Field B production sketch. It does not use Wi-Fi, LTE, or
Supabase. It does not change either production sketch.

With power off, connect the capacitive sensor's **VCC to 3V3**, **GND to GND**,
and **AOUT to D34**. Use AOUT, not a digital-output pin. Keep the electronics at
the top of the probe dry.

Open `esp32_field_b_soil_diagnostic.ino` in Arduino IDE, select the **second**
ESP32's COM port, upload, and open Serial Monitor at **115200 baud**. It prints
the raw reading every two seconds. Move the probe from air into damp soil. A
working sensor should produce a nonzero raw value that changes. The exact value
depends on the sensor and soil; this test makes no percentage claim.

If it stays near **0**, turn power off and disconnect the sensor's AOUT wire.
Temporarily connect **D34 to 3V3** with a jumper, then power on. A reading near
**4095** means the ESP32 pin works and the sensor or its wiring is the likely
problem. If it still reads near **0**, check the D34 terminal and ESP32 pin.
**Never connect D34 to 5V or VIN.** Turn power off before restoring the sensor.

After testing, upload `firmware/esp32_field_b/esp32_field_b.ino` back to the
second ESP32 to restore normal reporting.
