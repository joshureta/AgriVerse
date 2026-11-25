# Field B ESP32

Use `esp32_field_b.ino` for the **second** ESP32. It has the same DHT22,
capacitive soil sensor, DS18B20, and LTE wiring as the Field A sketch. Keep
the two sketches' shared sensor logic in sync when making future fixes.

The local `secrets.h` in this folder is ignored by Git. Its device ID is
`ESP32_002`, its SMS field label is `Field B`, and its device token is different
from Field A's. Never upload this sketch to the Field A ESP32.

## Connections

| Connection | ESP32 pin |
| --- | --- |
| DHT22 data | GPIO 4 |
| DS18B20 data | GPIO 18 |
| Capacitive soil sensor AOUT | GPIO 34 |
| LTE TX | GPIO 16 (ESP32 RX) |
| LTE RX | GPIO 17 (ESP32 TX) |

The three sensors use `3V3` and `GND`. Put a 4.7K–5.1K resistor between
DS18B20 data and `3V3`. The LTE board shares ground with the ESP32 but needs
its own suitable power supply, following the tested Field A wiring.

## Connect Field B

1. Deploy the backend code that accepts a second device. In the **backend**
   Hostinger environment variables, keep Field A's existing values and add:

   ```text
   SENSOR_DEVICE_2_ID=ESP32_002
   SENSOR_DEVICE_2_TOKEN=<DEVICE_TOKEN from this folder's secrets.h>
   ```

   Use the full token value without quotes, apply changes, and restart the
   backend app. The backend uses a separate token for each ESP32.
2. In the **sensor** Supabase project, assign the second device to Field B:

   ```sql
   insert into public.sensor_device_fields (device_id, field_name)
   values ('ESP32_002', 'Field B')
   on conflict (device_id) do update set field_name = excluded.field_name;
   ```

   `FIELD_NAME` in `secrets.h` labels SMS messages; this database mapping
   controls which field the website shows. Do not copy Field A's ID into the
   second sketch.
3. Plug in the **second** ESP32, select its COM port and **ESP32 Dev Module** in
   Arduino IDE, then upload `esp32_field_b.ino`. Open Serial Monitor at 115200.
   Look for `Current reading uploaded` with `"device_id":"ESP32_002"`.
4. Check Supabase for a new `sensor_readings` row with device ID `ESP32_002`
   and field name `Field B`, then check Field B in Environmental Monitoring.

The ESP32 uploads to the backend over its configured 2.4 GHz Wi-Fi. The LTE
module sends SMS when Wi-Fi is offline; it does not provide Wi-Fi to the ESP32.
