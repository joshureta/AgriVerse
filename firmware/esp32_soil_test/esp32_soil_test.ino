#include <Arduino.h>

// Capacitive soil-moisture sensor wiring:
// VCC  -> ESP32 3V3
// GND  -> ESP32 GND
// AOUT -> ESP32 GPIO 34
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t SAMPLE_COUNT = 20;
constexpr unsigned long SAMPLE_INTERVAL_MS = 1000;

int readAverageSoilValue() {
  uint32_t total = 0;
  for (uint8_t index = 0; index < SAMPLE_COUNT; ++index) {
    total += analogRead(SOIL_PIN);
    delay(10);
  }
  return total / SAMPLE_COUNT;
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // ESP32 readings range from 0 to 4095.
  delay(1000);

  Serial.println("=== AgriVerse Soil Moisture Calibration Test ===");
  Serial.println("Record a stable dry value, then a stable wet-soil value.");
}

void loop() {
  const int rawValue = readAverageSoilValue();
  Serial.printf("Soil raw value: %d\n", rawValue);
  delay(SAMPLE_INTERVAL_MS);
}
