#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HardwareSerial.h>
#include <time.h>
#include "secrets.h"

// ===== EDIT THESE SETTINGS =====
// Calibrate ADC values in dry and wet soil (often dry > wet, but varies).
const int SOIL_DRY_ADC = 3000;
const int SOIL_WET_ADC = 1300;
// The read/send interval is set by admins in Settings > Sensors. This default
// is used until the first config fetch succeeds (and is kept in flash after).
const uint32_t DEFAULT_READ_INTERVAL_S = 10;
const uint32_t MIN_READ_INTERVAL_S = 10;
const uint32_t MAX_READ_INTERVAL_S = 86400;  // 1 day
const unsigned long CONFIG_POLL_INTERVAL_MS = 60000UL;
const unsigned long SYNC_INTERVAL_MS = 1000UL;
const unsigned long WIFI_OFFLINE_GRACE_MS = 10000UL;
const unsigned long OFFLINE_SMS_INTERVAL_MS = 10000UL;

#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_ADC_PIN 34
#define DS18B20_PIN 18
const bool SOIL_TEMP_SENSOR_CONNECTED = true;
#define SIM_RX_PIN 16
#define SIM_TX_PIN 17

DHT dht(DHT_PIN, DHT_TYPE);
OneWire oneWire(DS18B20_PIN);
DallasTemperature soilThermometer(&oneWire);
HardwareSerial modem(2);
Preferences prefs;

// Use a fresh queue for the corrected Supabase payload. The old queue is retained.
const char* QUEUE_FILE = "/pending-v2.jsonl";
const char* FRESH_QUEUE_FILE = "/pending-live-v1.jsonl";
uint32_t ackOffset = 0;
uint32_t freshAckOffset = 0;
uint64_t sequenceNo = 0;
unsigned long lastRead = 0, lastSync = 0;
unsigned long readIntervalMs = DEFAULT_READ_INTERVAL_S * 1000UL;
unsigned long lastConfigPoll = 0;
bool hasPolledConfig = false;
unsigned long lastSensorPrint = 0;
unsigned long lastOfflineSMS = 0;
unsigned long wifiDisconnectedSince = 0;
bool hasPrintedSensors = false;
bool hasRead = false;
bool hasAttemptedOfflineSMS = false;
bool clockReady = false;

String jsonEscape(const String &s) {
  String r;
  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    if (c == '"' || c == '\\') { r += '\\'; r += c; }
    else if (c == '\n') r += "\\n";
    else if ((uint8_t)c >= 32) r += c;
  }
  return r;
}

bool getISOTime(String &out) {
  struct tm tmNow;
  if (!getLocalTime(&tmNow, 50)) return false;
  time_t now = time(nullptr);
  if (now < 1700000000) return false;
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
  out = buf;
  return true;
}

bool syncClock() {
  String currentTime;
  if (getISOTime(currentTime)) { clockReady = true; return true; }
  if (WiFi.status() != WL_CONNECTED) return false;
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  for (int i = 0; i < 15; i++) {
    String ts;
    if (getISOTime(ts)) { clockReady = true; return true; }
    delay(200);
  }
  return false;
}

void ensureWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool sendSMS(const String &message);
bool uploadSensorReading(const String &json);

bool enqueue(const char* path, const String &line) {
  File f = LittleFS.open(path, "a");
  if (!f) return false;
  size_t written = f.println(line);
  f.flush();
  f.close();
  return written == line.length() + 2 || written == line.length() + 1;
}

int readSoilRaw() {
  uint32_t total = 0;
  for (int i = 0; i < 16; ++i) {
    total += analogRead(SOIL_ADC_PIN);
    delay(2);
  }
  return int(total / 16);
}
float readSoilTemperature() {
  if (!SOIL_TEMP_SENSOR_CONNECTED) return NAN;
  soilThermometer.begin();  // Rescan: the probe may become ready after ESP32 startup.
  if (soilThermometer.getDS18Count() == 0) return NAN;
  soilThermometer.requestTemperatures();
  const float value = soilThermometer.getTempCByIndex(0);
  return (isnan(value) || value == DEVICE_DISCONNECTED_C) ? NAN : value;
}
void printSensorReadings() {
  const int raw = readSoilRaw();
  const float airTemp = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const float soilTemp = readSoilTemperature();

  Serial.printf("Sensors | moisture: %d raw", raw);
  if (SOIL_DRY_ADC != SOIL_WET_ADC) {
    const float percent = constrain(100.0f * (SOIL_DRY_ADC - raw) /
                                    float(SOIL_DRY_ADC - SOIL_WET_ADC), 0.0f, 100.0f);
    Serial.printf(" (%.1f%%)", percent);
  } else {
    Serial.print(" (calibration ERROR)");
  }
  Serial.print(" | air temp: ");
  if (isnan(airTemp)) Serial.print("ERROR");
  else Serial.printf("%.1f C", airTemp);
  Serial.print(" | humidity: ");
  if (isnan(humidity)) Serial.print("ERROR");
  else Serial.printf("%.1f%%", humidity);
  Serial.print(" | soil temp: ");
  if (!SOIL_TEMP_SENSOR_CONNECTED) Serial.println("NOT CONNECTED");
  else if (isnan(soilTemp)) Serial.println("ERROR");
  else Serial.printf("%.1f C\n", soilTemp);
}

String buildOfflineSMS() {
  const int raw = readSoilRaw();
  const float airTemp = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const float soilTemp = readSoilTemperature();

  String message = String("AgriVerse ") + FIELD_NAME + "\nSoil moisture: ";
  if (SOIL_DRY_ADC == SOIL_WET_ADC) {
    message += "ERROR";
  } else {
    const float moisture = constrain(
      100.0f * (SOIL_DRY_ADC - raw) / float(SOIL_DRY_ADC - SOIL_WET_ADC),
      0.0f, 100.0f);
    message += String(moisture, 1) + "%";
  }
  message += "\nAir temp: ";
  message += isnan(airTemp) ? String("ERROR") : String(airTemp, 1) + " C";
  message += "\nHumidity: ";
  message += isnan(humidity) ? String("ERROR") : String(humidity, 1) + "%";
  message += "\nSoil temp: ";
  message += !SOIL_TEMP_SENSOR_CONNECTED ? String("NOT CONNECTED")
    : (isnan(soilTemp) ? String("ERROR") : String(soilTemp, 1) + " C");
  return message;
}

bool uploadSensorReading(const String &json);

void captureReading() {
  String timestamp;
  if (!getISOTime(timestamp)) {
    Serial.println("No valid clock: reading not saved. Add DS3231 for offline startup.");
    return;
  }
  float airT = dht.readTemperature();
  float humidity = dht.readHumidity();
  float soilT = readSoilTemperature();
  int raw = readSoilRaw();
  const bool soilTempValid = !isnan(soilT) && soilT != DEVICE_DISCONNECTED_C;
  if (SOIL_DRY_ADC == SOIL_WET_ADC) {
    Serial.println("Missing soil calibration; skipping record.");
    return;
  }
  float moisture = 100.0f * (SOIL_DRY_ADC - raw) / (float)(SOIL_DRY_ADC - SOIL_WET_ADC);
  moisture = constrain(moisture, 0.0f, 100.0f);
  sequenceNo++;
  prefs.putULong64("seq", sequenceNo);
  String uid = String(DEVICE_ID) + "-" + String((unsigned long)(sequenceNo >> 32), HEX) +
               String((unsigned long)(sequenceNo & 0xFFFFFFFF), HEX);
  // Requires soil_temperature_c to be a writable column in Supabase.
  // temperature_c is the DHT22 air temperature.
  String line = "{\"device_id\":\"" + jsonEscape(DEVICE_ID) +
    "\",\"temperature_c\":" + (isnan(airT) ? String("null") : String(airT, 2)) +
    ",\"soil_temperature_c\":" + (soilTempValid ? String(soilT, 2) : String("null")) +
    ",\"humidity_percent\":" + (isnan(humidity) ? String("null") : String(humidity, 2)) +
    ",\"soil_moisture\":" + String(moisture, 2) +
    ",\"created_at\":\"" + timestamp + "\"}";
  // Send the newest reading now so an old backlog does not make the dashboard
  // appear offline. If the upload fails, keep the reading for later retry.
  if (WiFi.status() == WL_CONNECTED && uploadSensorReading(line)) {
    Serial.println("Current reading uploaded: " + line);
    return;
  }
  const char* queue = WiFi.status() == WL_CONNECTED ? FRESH_QUEUE_FILE : QUEUE_FILE;
  if (!enqueue(queue, line)) {
    Serial.println("ERROR: queue write failed; check flash capacity.");
  } else {
    Serial.println("Saved locally: " + line);
  }
}

String modemRead(const String &expected, unsigned long timeoutMs) {
  String r;
  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (modem.available()) r += char(modem.read());
    if (r.indexOf(expected) >= 0 ||
        r.indexOf("\r\nERROR\r\n") >= 0 ||
        r.indexOf("+CMS ERROR:") >= 0 ||
        r.indexOf("+CME ERROR:") >= 0) break;
    delay(5);
  }
  return r;
}

bool modemAT(const String &command, const String &expected, unsigned long timeoutMs) {
  while (modem.available()) modem.read();
  modem.print(command);
  modem.print('\r');
  String response = modemRead(expected, timeoutMs);
  if (response.indexOf(expected) >= 0) return true;
  Serial.print("LTE command failed: ");
  Serial.println(command);
  Serial.print("LTE reply: ");
  Serial.println(response.length() ? response : String("(none)"));
  return false;
}

bool detectModemBaud() {
  const uint32_t rates[] = {115200, 9600, 57600, 38400, 19200};
  for (uint32_t rate : rates) {
    modem.end();
    delay(200);
    modem.begin(rate, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
    delay(500);
    while (modem.available()) modem.read();
    for (int attempt = 0; attempt < 2; ++attempt) {
      modem.print("AT\r");
      if (modemRead("OK", 2000).indexOf("OK") >= 0) {
        Serial.printf("LTE responding at %lu baud\n", (unsigned long)rate);
        return true;
      }
      delay(300);
    }
  }
  modem.end();
  modem.begin(115200, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  Serial.println("LTE not responding on GPIO16/17 at any tested baud.");
  return false;
}

bool sendSMS(const String &message) {
  if (!modemAT("AT", "OK", 2000) && !detectModemBaud()) {
    Serial.println("SMS modem not ready: no AT response");
    return false;
  }
  if (!modemAT("AT+CPIN?", "+CPIN: READY", 5000)) {
    Serial.println("SMS modem not ready: SIM not ready");
    return false;
  }
  if (!modemAT("AT+CMGF=1", "OK", 5000)) {
    Serial.println("SMS modem not ready: SMS text mode failed");
    return false;
  }
  while (modem.available()) modem.read();
  modem.print("AT+CMGS=\""); modem.print(ALERT_PHONE); modem.print("\"\r");
  String prompt = modemRead(">", 10000);
  if (prompt.indexOf('>') < 0) {
    Serial.println("No SMS prompt. LTE reply: " + prompt);
    return false;
  }
  modem.print(message); modem.write(26);
  String result = modemRead("\r\nOK", 30000);
  bool ok = result.indexOf("+CMGS:") >= 0 && result.indexOf("OK") >= 0;
  Serial.println(ok ? "SMS accepted by modem" : "SMS failed");
  if (!ok) Serial.println("LTE reply: " + result);
  return ok;
}

bool uploadSensorReading(const String &json) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.useBuiltinCACertBundle();
  HTTPClient http;
  String endpoint = String(API_URL) + "/api/sensors/ingest/sensor_readings";
  if (!endpoint.startsWith("https://")) return false;
  if (!http.begin(client, endpoint)) return false;
  http.setTimeout(10000);
  http.addHeader("x-device-token", DEVICE_TOKEN);
  http.addHeader("Content-Type", "application/json");
  int status = http.POST(json);
  String response = http.getString();
  http.end();
  if (status >= 200 && status < 300) return true;
  Serial.printf("Sensor API HTTP error: %d (%s)\n", status,
                http.errorToString(status).c_str());
  Serial.println(response);
  return false;
}

uint32_t clampInterval(uint32_t seconds) {
  if (seconds < MIN_READ_INTERVAL_S) return MIN_READ_INTERVAL_S;
  if (seconds > MAX_READ_INTERVAL_S) return MAX_READ_INTERVAL_S;
  return seconds;
}

// Asks the backend how often to read and send data. Keeps the current interval
// when offline or when the reply is not understood.
void fetchConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.useBuiltinCACertBundle();
  HTTPClient http;
  String endpoint = String(API_URL) + "/api/sensors/config?device_id=" + DEVICE_ID;
  if (!endpoint.startsWith("https://")) return;
  if (!http.begin(client, endpoint)) return;
  http.setTimeout(5000);
  http.addHeader("x-device-token", DEVICE_TOKEN);
  int status = http.GET();
  String body = http.getString();
  http.end();
  if (status != 200) {
    Serial.printf("Config fetch failed: HTTP %d\n", status);
    return;
  }
  const char* key = "\"read_interval_seconds\":";
  int at = body.indexOf(key);
  if (at < 0) return;
  long seconds = body.substring(at + strlen(key)).toInt();
  if (seconds <= 0) return;
  uint32_t clamped = clampInterval((uint32_t)seconds);
  unsigned long nextMs = clamped * 1000UL;
  if (nextMs == readIntervalMs) return;
  readIntervalMs = nextMs;
  prefs.putUInt("interval-s", clamped);  // Only written on change to save flash wear.
  Serial.printf("Send interval changed to %lu seconds\n", (unsigned long)clamped);
}

bool syncQueue(const char* path, uint32_t &offset, const char* ackKey, int maxRecords) {
  File f = LittleFS.open(path, "r");
  if (!f) return true;
  if (offset > f.size()) {
    Serial.println("Queue cursor inconsistent; resetting to 0.");
    offset = 0; prefs.putUInt(ackKey, offset);
  }
  f.seek(offset);
  int sent = 0;
  while (f.available() && sent < maxRecords) {
    String line = f.readStringUntil('\n');
    uint32_t nextOffset = f.position();
    line.trim();
    if (!line.length()) { offset = nextOffset; prefs.putUInt(ackKey, offset); continue; }
    if (!uploadSensorReading(line)) { f.close(); return false; }
    offset = nextOffset;
    prefs.putUInt(ackKey, offset);
    sent++;
  }
  const bool drained = offset == f.size();
  f.close();
  if (sent) Serial.printf("Synced %d records from %s\n", sent, path);
  if (drained && LittleFS.remove(path)) {
    offset = 0;
    prefs.putUInt(ackKey, offset);
  }
  return true;
}

void syncPending() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!syncQueue(FRESH_QUEUE_FILE, freshAckOffset, "ack-live-v1", 2)) return;
  syncQueue(QUEUE_FILE, ackOffset, "ack-v2", 2);
}

void setup() {
  Serial.begin(115200);
  dht.begin(); soilThermometer.begin();
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_ADC_PIN, ADC_11db);
  modem.begin(115200, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  if (!LittleFS.begin(true)) { Serial.println("LittleFS mount failed"); while (true) delay(1000); }
  prefs.begin("soilmon", false);
  ackOffset = prefs.getUInt("ack-v2", 0);
  freshAckOffset = prefs.getUInt("ack-live-v1", 0);
  sequenceNo = prefs.getULong64("seq", 0);
  readIntervalMs = clampInterval(prefs.getUInt("interval-s", DEFAULT_READ_INTERVAL_S)) * 1000UL;
  Serial.printf("Send interval: %lu seconds\n", readIntervalMs / 1000UL);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  ensureWiFi();
  Serial.println("ESP32 soil monitoring + Supabase store-and-forward started");
  Serial.println("Requires valid time before first capture; use DS3231 for offline cold start.");
}

void loop() {
  unsigned long now = millis();
  if (!hasPrintedSensors || now - lastSensorPrint >= 5000UL) {
    lastSensorPrint = now;
    hasPrintedSensors = true;
    printSensorReadings();
  }
  if (!clockReady) {
    String ts;
    clockReady = getISOTime(ts);
    if (!clockReady && WiFi.status() == WL_CONNECTED) syncClock();
  }
  if (WiFi.status() == WL_CONNECTED &&
      (!hasPolledConfig || now - lastConfigPoll >= CONFIG_POLL_INTERVAL_MS)) {
    lastConfigPoll = now; hasPolledConfig = true;
    fetchConfig();
    now = millis();
  }
  if (!hasRead || now - lastRead >= readIntervalMs) {
    lastRead = now; hasRead = true;
    captureReading();
  }
  if (now - lastSync >= SYNC_INTERVAL_MS) {
    lastSync = now;
    syncPending();
  }
  if (WiFi.status() != WL_CONNECTED) {
    if (!wifiDisconnectedSince) wifiDisconnectedSince = millis();
    if (millis() - wifiDisconnectedSince >= WIFI_OFFLINE_GRACE_MS &&
        (!hasAttemptedOfflineSMS ||
         millis() - lastOfflineSMS >= OFFLINE_SMS_INTERVAL_MS)) {
      hasAttemptedOfflineSMS = true;
      Serial.printf("Wi-Fi disconnected for 10 seconds (status %d); sending sensor SMS\n", WiFi.status());
      sendSMS(buildOfflineSMS());
      lastOfflineSMS = millis();
    }
  } else {
    wifiDisconnectedSince = 0;
    hasAttemptedOfflineSMS = false;
  }
  delay(100);
}
