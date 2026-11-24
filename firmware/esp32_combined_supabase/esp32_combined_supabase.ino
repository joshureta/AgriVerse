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
const unsigned long READ_INTERVAL_MS = 10000UL;
const unsigned long SYNC_INTERVAL_MS = 1000UL;
const unsigned long WIFI_OFFLINE_GRACE_MS = 30000UL;
const unsigned long OFFLINE_SMS_INTERVAL_MS = 30000UL;

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
uint32_t ackOffset = 0;
uint64_t sequenceNo = 0;
unsigned long lastRead = 0, lastSync = 0;
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

bool enqueue(const String &line) {
  File f = LittleFS.open(QUEUE_FILE, "a");
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
  if (!enqueue(line)) Serial.println("ERROR: queue write failed; check flash capacity.");
  else Serial.println("Saved locally: " + line);
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

void syncPending() {
  if (WiFi.status() != WL_CONNECTED) return;
  File f = LittleFS.open(QUEUE_FILE, "r");
  if (!f) return;
  if (ackOffset > f.size()) {
    Serial.println("Queue cursor inconsistent; resetting to 0 (upsert prevents duplicates).");
    ackOffset = 0; prefs.putUInt("ack-v2", ackOffset);
  }
  f.seek(ackOffset);
  int sent = 0;
  while (f.available() && sent < 10) {
    String line = f.readStringUntil('\n');
    uint32_t nextOffset = f.position();
    line.trim();
    if (!line.length()) { ackOffset = nextOffset; prefs.putUInt("ack-v2", ackOffset); continue; }
    if (!uploadSensorReading(line)) break;
    ackOffset = nextOffset;
    prefs.putUInt("ack-v2", ackOffset);
    sent++;
  }
  f.close();
  if (sent) Serial.printf("Synced %d queued records\n", sent);
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
  sequenceNo = prefs.getULong64("seq", 0);
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
  if (!hasRead || now - lastRead >= READ_INTERVAL_MS) {
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
      Serial.printf("Wi-Fi disconnected for 30 seconds (status %d); sending sensor SMS\n", WiFi.status());
      sendSMS(buildOfflineSMS());
      lastOfflineSMS = millis();
    }
  } else {
    wifiDisconnectedSince = 0;
    hasAttemptedOfflineSMS = false;
  }
  delay(100);
}
