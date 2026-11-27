# Field B LTE test

Open `esp32_field_b_lte_test.ino` in Arduino IDE and upload it to the **second**
ESP32. This is a separate test sketch. Uploading it temporarily replaces the
sensor sketch on that board; it does not edit the production files.

Use the same LTE power arrangement that already worked. Connect **LTE TX to
ESP32 D16**, **LTE RX to ESP32 D17**, and **LTE GND to ESP32 GND**. The LTE board
needs its own suitable power supply; the ESP32's 3V3 pin should not power it.

Open Serial Monitor at **115200 baud**. After a short wait, look for
`LTE RESPONDING ... OK`. The sketch tries several UART baud rates, then prints
the replies to `AT`, `AT+CPIN?`, `AT+CSQ`, and `AT+CEREG?`.

- `OK` after `AT` means the ESP32 can communicate with the LTE module. A SIM
  card is not required for this first check.
- `+CPIN: READY` means the SIM is detected.
- `+CSQ: 99,99` means signal information is unavailable; other first values
  indicate a measured signal.
- A `+CEREG` status of `1` or `5` means registered on the mobile network.

To send another AT command manually, set Serial Monitor's line ending to
**Newline**, type the command (for example `AT+CSQ`), and press Enter. This
sketch does **not** send SMS or use Wi-Fi/Supabase.

When done, re-upload `firmware/esp32_field_b/esp32_field_b.ino` (or the local
test version) to restore sensor reporting.
