#include <Arduino.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include "secrets.h"

constexpr uint8_t DHT_PIN = 27;
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t SOIL_SAMPLE_COUNT = 20;

// Replace these after calibrating the probe in dry air and wet soil/water.
constexpr int SOIL_DRY_VALUE = 2800;
constexpr int SOIL_WET_VALUE = 1150;

constexpr unsigned long READ_INTERVAL_MS = 2000;
constexpr unsigned long SEND_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;
constexpr unsigned long TIME_TIMEOUT_MS = 15000;

DHT dht(DHT_PIN, DHT22);
unsigned long lastReadMs = 0;
unsigned long lastSendMs = 0;
bool wifiStarted = false;

int readAverageSoilValue() {
  uint32_t total = 0;
  for (uint8_t index = 0; index < SOIL_SAMPLE_COUNT; ++index) {
    total += analogRead(SOIL_PIN);
    delay(10);
  }
  return total / SOIL_SAMPLE_COUNT;
}

float moisturePercentage(int rawValue) {
  const float percentage =
    100.0f * (SOIL_DRY_VALUE - rawValue) / (SOIL_DRY_VALUE - SOIL_WET_VALUE);
  return constrain(percentage, 0.0f, 100.0f);
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  if (!wifiStarted) {
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    wifiStarted = true;
  }

  Serial.print("Waiting for Wi-Fi");
  const unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("Wi-Fi not connected (status %d); will retry.\n", WiFi.status());
    return false;
  }

  Serial.println("Wi-Fi connected.");
  return true;
}

bool syncClock() {
  if (time(nullptr) > 1700000000) return true;

  configTime(0, 0, "pool.ntp.org", "time.google.com");
  const unsigned long started = millis();
  while (time(nullptr) <= 1700000000 && millis() - started < TIME_TIMEOUT_MS) {
    delay(500);
  }

  if (time(nullptr) <= 1700000000) {
    Serial.println("Clock sync failed; will retry.");
    return false;
  }
  return true;
}

int postJson(const char *tableName, const String &payload) {
  WiFiClientSecure client;
  client.useBuiltinCACertBundle();

  HTTPClient http;
  const String url = String(SUPABASE_URL) + "/rest/v1/" + tableName;
  if (!http.begin(client, url)) {
    Serial.printf("Could not start HTTPS request for %s.\n", tableName);
    return -1;
  }

  http.setTimeout(10000);
  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  const int status = http.POST(payload);
  if (status != 201 && status != 204) {
    if (status > 0) {
      Serial.printf("Supabase rejected %s (HTTP %d): %s\n",
                    tableName, status, http.getString().c_str());
    } else {
      Serial.printf("HTTPS request for %s failed (%d): %s\n",
                    tableName, status, http.errorToString(status).c_str());
    }
  }
  http.end();
  return status;
}

void sendDhtReading(float temperature, float humidity) {
  const String payload = String("{\"device_id\":\"") + DEVICE_ID +
                         "\",\"temperature_c\":" + String(temperature, 1) +
                         ",\"humidity_percent\":" + String(humidity, 1) + "}";
  const int status = postJson("sensor_readings", payload);
  if (status == 201 || status == 204) {
    Serial.printf("DHT22 saved: %.1f C, %.1f%% humidity (HTTP %d)\n",
                  temperature, humidity, status);
  }
}

void sendSoilReading(int rawValue, float moisture) {
  const String payload = String("{\"device_id\":\"") + DEVICE_ID +
                         "\",\"moisture_raw\":" + String(rawValue) +
                         ",\"moisture_percent\":" + String(moisture, 1) + "}";
  const int status = postJson("soil_readings", payload);
  if (status == 201 || status == 204) {
    Serial.printf("Soil saved: %d raw, %.1f%% (HTTP %d)\n",
                  rawValue, moisture, status);
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  dht.begin();
  delay(2000);
  Serial.println("=== AgriVerse Combined Environmental Sensor ===");
}

void loop() {
  if (lastReadMs != 0 && millis() - lastReadMs < READ_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastReadMs = millis();

  const float temperature = dht.readTemperature();
  const float humidity = dht.readHumidity();
  const bool dhtValid = !isnan(temperature) && !isnan(humidity);

  const int soilRaw = readAverageSoilValue();
  const float soilMoisture = moisturePercentage(soilRaw);

  if (dhtValid) {
    Serial.printf("Temperature: %.1f C | Humidity: %.1f%%\n", temperature, humidity);
  } else {
    Serial.println("DHT22 reading failed; soil reading will continue.");
  }
  Serial.printf("Soil raw: %d | Moisture: %.1f%%\n----------------------\n",
                soilRaw, soilMoisture);

  if (lastSendMs != 0 && millis() - lastSendMs < SEND_INTERVAL_MS) return;
  lastSendMs = millis();

  if (!connectWifi() || !syncClock()) return;

  if (dhtValid) sendDhtReading(temperature, humidity);
  sendSoilReading(soilRaw, soilMoisture);
}
