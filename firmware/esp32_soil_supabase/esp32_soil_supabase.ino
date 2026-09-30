#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include "secrets.h"

constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t SAMPLE_COUNT = 20;
constexpr int DRY_VALUE = 2800;
constexpr int WET_VALUE = 1150;
constexpr unsigned long READ_INTERVAL_MS = 1000;
constexpr unsigned long SEND_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;
constexpr unsigned long TIME_TIMEOUT_MS = 15000;

unsigned long lastReadMs = 0;
unsigned long lastSendMs = 0;
bool wifiStarted = false;

int readAverageSoilValue() {
  uint32_t total = 0;
  for (uint8_t index = 0; index < SAMPLE_COUNT; ++index) {
    total += analogRead(SOIL_PIN);
    delay(10);
  }
  return total / SAMPLE_COUNT;
}

float moisturePercentage(int rawValue) {
  const float percentage =
    100.0f * (DRY_VALUE - rawValue) / (DRY_VALUE - WET_VALUE);
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

void sendReading(int rawValue, float moisture) {
  WiFiClientSecure client;
  client.useBuiltinCACertBundle();

  HTTPClient http;
  const String url = String(SUPABASE_URL) + "/rest/v1/soil_readings";
  if (!http.begin(client, url)) {
    Serial.println("Could not start HTTPS request.");
    return;
  }

  http.setTimeout(10000);
  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  const String payload = String("{\"device_id\":\"") + DEVICE_ID +
                         "\",\"moisture_raw\":" + String(rawValue) +
                         ",\"moisture_percent\":" + String(moisture, 1) + "}";

  const int status = http.POST(payload);
  if (status == 201 || status == 204) {
    Serial.printf("Soil reading saved: %d raw, %.1f%% (HTTP %d)\n",
                  rawValue, moisture, status);
  } else if (status > 0) {
    Serial.printf("Supabase rejected soil reading (HTTP %d): %s\n",
                  status, http.getString().c_str());
  } else {
    Serial.printf("HTTPS request failed (%d): %s\n",
                  status, http.errorToString(status).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  delay(1000);
  Serial.println("=== AgriVerse Soil Moisture Sensor ===");
}

void loop() {
  if (lastReadMs != 0 && millis() - lastReadMs < READ_INTERVAL_MS) {
    delay(50);
    return;
  }
  lastReadMs = millis();

  const int rawValue = readAverageSoilValue();
  const float moisture = moisturePercentage(rawValue);
  Serial.printf("Soil raw: %d | Moisture: %.1f%%\n", rawValue, moisture);

  if (lastSendMs != 0 && millis() - lastSendMs < SEND_INTERVAL_MS) return;
  lastSendMs = millis();

  if (!connectWifi() || !syncClock()) return;
  sendReading(rawValue, moisture);
}
