#include <Arduino.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#include "secrets.h"

// Matches the working Arduino sketch supplied by the user.
constexpr uint8_t DHT_PIN = 27;
constexpr unsigned long READ_INTERVAL_MS = 2000;
constexpr unsigned long SEND_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_TIMEOUT_MS = 15000;
constexpr unsigned long TIME_TIMEOUT_MS = 15000;

DHT dht(DHT_PIN, DHT22);
unsigned long lastReadMs = 0;
unsigned long lastSendMs = 0;
bool wifiStarted = false;

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  // Configure the station only once. Calling begin() again while an earlier
  // attempt is still active causes "sta is connecting, cannot set config".
  if (!wifiStarted) {
    WiFi.mode(WIFI_STA);
    const int networkCount = WiFi.scanNetworks();
    if (networkCount >= 0) {
      bool hotspotVisible = false;
      for (int i = 0; i < networkCount; ++i) {
        if (WiFi.SSID(i) == WIFI_SSID) hotspotVisible = true;
      }
      Serial.println(hotspotVisible ? "Configured hotspot is visible."
                                    : "Configured hotspot is not visible; check 2.4 GHz mode and name.");
      WiFi.scanDelete();
    }
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
  // TLS certificate checks require a valid clock after each cold boot.
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

void sendReading(float temperature, float humidity) {
  WiFiClientSecure client;
  client.useBuiltinCACertBundle(); // Verify Supabase's TLS certificate.

  HTTPClient http;
  const String url = String(SUPABASE_URL) + "/rest/v1/sensor_readings";
  if (!http.begin(client, url)) {
    Serial.println("Could not start HTTPS request.");
    return;
  }

  http.setTimeout(10000);
  http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  // The database supplies id and created_at. DHT22 has no soil moisture reading.
  const String payload = String("{\"device_id\":\"") + DEVICE_ID +
                         "\",\"temperature_c\":" + String(temperature, 1) +
                         ",\"humidity_percent\":" + String(humidity, 1) + "}";

  const int status = http.POST(payload);
  if (status == 201 || status == 204) {
    Serial.printf("Reading saved: %.1f C, %.1f %% humidity (HTTP %d)\n",
                  temperature, humidity, status);
  } else if (status > 0) {
    Serial.printf("Supabase rejected reading (HTTP %d): %s\n",
                  status, http.getString().c_str());
  } else {
    Serial.printf("HTTPS request failed (%d): %s\n",
                  status, http.errorToString(status).c_str());
  }
  http.end();
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000); // DHT22 needs time after power-up before the first read.
  Serial.println("=== AgriLink Environmental Sensor ===");
}

void loop() {
  if (lastReadMs != 0 && millis() - lastReadMs < READ_INTERVAL_MS) {
    delay(100);
    return;
  }
  lastReadMs = millis();

  const float temperature = dht.readTemperature(); // Celsius
  const float humidity = dht.readHumidity();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT22 reading failed!");
    return;
  }

  Serial.printf("Temperature: %.1f C\nHumidity: %.1f %%\n----------------------\n",
                temperature, humidity);
  if (lastSendMs != 0 && millis() - lastSendMs < SEND_INTERVAL_MS) return;
  lastSendMs = millis();
  if (!connectWifi() || !syncClock()) return;
  sendReading(temperature, humidity);
}
