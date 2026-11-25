# Field B local backend test

Use `esp32_field_b_local_test.ino` only while testing the website and backend
on your laptop. It is a separate copy of the Field B sketch, changed to send
plain HTTP to the laptop. It does not modify Field A or the hosted Field B
sketch. The local `secrets.h` is ignored by Git. On another laptop, copy
`secrets.example.h` to `secrets.h` and fill in the Wi-Fi credentials, backend
URL, and Field B device token. Use `ESP32_002` as the device ID; the token must
match `SENSOR_DEVICE_2_TOKEN` in that laptop's backend `.env`.

1. Connect the laptop and second ESP32 to the **same 2.4 GHz Wi-Fi or phone
   hotspot**. The ESP32 uses the Wi-Fi name and password in this folder's
   `secrets.h`. A guest Wi-Fi that isolates devices may prevent this test.
2. On the laptop, run `ipconfig` in PowerShell and find the **IPv4 Address**
   under the Wi-Fi adapter connected to that same network.
3. In this folder's `secrets.h`, replace `YOUR_LAPTOP_WIFI_IP` in `API_URL` with
   that address. Example: `http://192.168.43.100:5000`. Keep `http://` and
   `:5000`. Do not use `localhost` or `127.0.0.1` on the ESP32.
4. Start the backend from the repo's `backend` directory with `npm run dev`.
   On this laptop, the local `.env` already contains Field B's device ID and
   token. On another laptop, set `SENSOR_DEVICE_2_ID=ESP32_002` and the matching
   `SENSOR_DEVICE_2_TOKEN` in its local backend `.env`. If Windows Firewall
   asks, allow Node.js on the network being used.
5. Start the website from the repo's `web` directory with `npm run dev`. The
   local website uses `http://localhost:5000` for the backend.
6. Upload this local-test sketch to the **second** ESP32. In Serial Monitor at
   115200 baud, look for `Current reading uploaded` with `ESP32_002`.
   Select **Field B** in Environmental Monitoring.

When testing is done, upload `firmware/esp32_field_b/esp32_field_b.ino` back to
the second ESP32. That sketch sends to the hosted HTTPS backend.
