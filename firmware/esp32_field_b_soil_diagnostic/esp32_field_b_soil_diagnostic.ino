#include <Arduino.h>

// Field B soil-moisture sensor: VCC -> 3V3, GND -> GND, AOUT -> D34.
// This diagnostic deliberately does not turn raw ADC values into a percentage.
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t SAMPLE_COUNT = 16;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);  // Raw range: 0 to 4095.
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  delay(1000);
  Serial.println("Field B soil-moisture diagnostic on D34/GPIO34");
  Serial.println("Move the probe between air and damp soil; watch the RAW value.");
}

void loop() {
  uint32_t sum = 0;
  int lowest = 4095;
  int highest = 0;

  for (uint8_t i = 0; i < SAMPLE_COUNT; ++i) {
    const int sample = analogRead(SOIL_PIN);
    sum += sample;
    if (sample < lowest) lowest = sample;
    if (sample > highest) highest = sample;
    delay(10);
  }

  const int average = sum / SAMPLE_COUNT;
  Serial.printf("D34 raw: %d  (samples %d-%d)", average, lowest, highest);
  if (average <= 10) {
    Serial.print(" | Near zero: check sensor power, AOUT wire, and D34 terminal");
  } else if (average >= 4085) {
    Serial.print(" | Near maximum: check AOUT wire and sensor output");
  } else {
    Serial.print(" | Signal present; check that it changes with soil conditions");
  }
  Serial.println();
  delay(2000);
}
