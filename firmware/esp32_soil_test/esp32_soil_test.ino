#include <Arduino.h>

// Capacitive soil-moisture sensor wiring:
// VCC  -> ESP32 3V3
// GND  -> ESP32 GND
// AOUT -> ESP32 GPIO 34
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t SAMPLE_COUNT = 20;
constexpr unsigned long SAMPLE_INTERVAL_MS = 1000;

// Provisional calibration from the observed test range. Fine-tune later if
// your normal dry and saturated-soil readings settle outside these values.
constexpr int DRY_VALUE = 2800;
constexpr int WET_VALUE = 1150;

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

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // ESP32 readings range from 0 to 4095.
  delay(1000);

  Serial.println("=== AgriVerse Soil Moisture Calibration Test ===");
  Serial.println("Record a stable dry value, then a stable wet-soil value.");
}

void loop() {
  const int rawValue = readAverageSoilValue();
  const float moisture = moisturePercentage(rawValue);

  Serial.printf("Soil raw value: %d | Moisture: %.1f%%", rawValue, moisture);
  if (moisture < 30.0f) {
    Serial.println(" | Dry");
  } else if (moisture < 70.0f) {
    Serial.println(" | Moist");
  } else {
    Serial.println(" | Wet");
  }

  delay(SAMPLE_INTERVAL_MS);
}
