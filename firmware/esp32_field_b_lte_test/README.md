# Field B LTE AT test

Upload `esp32_field_b_lte_test.ino` to the **second** ESP32 and open Serial
Monitor at **115200 baud**. This separate sketch sends `AT` every three seconds
at **115200 baud only**. `LTE OK: modem replied to AT.` appears only when the
LTE module actually sends back `OK`. A SIM card is not needed for this check.

Connect **LTE TX to ESP32 D16**, **LTE RX to ESP32 D17**, and **LTE GND to ESP32
GND**. Power the LTE module using the same working supply as before; do not
power it from the ESP32's 3V3 pin.

If it keeps saying `No OK reply yet`, check LTE power and the crossed TX/RX
wires. This test does not use Wi-Fi, Supabase, sensors, or SMS. When finished,
re-upload `firmware/esp32_field_b/esp32_field_b.ino` to restore normal sensor
reporting.