#include <Arduino.h>
#include <DallasTemperature.h>
#include <OneWire.h>

constexpr uint8_t DS18B20_PIN = 26;
constexpr unsigned long READ_INTERVAL_MS = 2000;

OneWire oneWire(DS18B20_PIN);
DallasTemperature soilTemperatureSensor(&oneWire);

void setup() {
  Serial.begin(115200);
  soilTemperatureSensor.begin();
  delay(1000);

  Serial.println("=== DS18B20 Soil Temperature Test ===");
  Serial.printf("Sensors found: %d\n", soilTemperatureSensor.getDeviceCount());
}

void loop() {
  soilTemperatureSensor.requestTemperatures();
  const float temperatureC = soilTemperatureSensor.getTempCByIndex(0);

  if (temperatureC == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 not detected. Check DATA on GPIO 26, power, ground, and pull-up resistor.");
  } else {
    Serial.printf("Soil temperature: %.2f C\n", temperatureC);
  }

  delay(READ_INTERVAL_MS);
}
