#include <Arduino.h>
#include <HardwareSerial.h>

// LTE TX -> ESP32 D16 (RX), LTE RX -> ESP32 D17 (TX), GND -> GND.
constexpr int LTE_RX_PIN = 16;
constexpr int LTE_TX_PIN = 17;
constexpr unsigned long AT_INTERVAL_MS = 3000;
constexpr unsigned long REPLY_TIMEOUT_MS = 2000;

HardwareSerial lte(2);
unsigned long lastAT = 0;
bool waitingForReply = false;
String reply;

void sendAT() {
  while (lte.available()) lte.read();
  reply = "";
  Serial.println("\nSending AT...");
  lte.print("AT\r");
  lastAT = millis();
  waitingForReply = true;
}

void setup() {
  Serial.begin(115200);
  lte.begin(115200, SERIAL_8N1, LTE_RX_PIN, LTE_TX_PIN);
  delay(2000);
  Serial.println("Field B LTE test: 115200 baud, D16/D17");
  sendAT();
}

void loop() {
  while (lte.available()) {
    const char c = char(lte.read());
    Serial.write(c);  // Show the actual modem response.
    if (reply.length() < 128) reply += c;
  }

  if (waitingForReply && reply.indexOf("\r\nOK") >= 0) {
    Serial.println("LTE OK: modem replied to AT.");
    waitingForReply = false;
  } else if (waitingForReply && millis() - lastAT >= REPLY_TIMEOUT_MS) {
    Serial.println("No OK reply yet. Check LTE power, GND, TX and RX.");
    waitingForReply = false;
  }

  if (!waitingForReply && millis() - lastAT >= AT_INTERVAL_MS) sendAT();
  delay(5);
}