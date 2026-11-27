#include <Arduino.h>
#include <HardwareSerial.h>

// Match the Field B production sketch. Connect LTE TX -> ESP32 D16 (RX),
// LTE RX -> ESP32 D17 (TX), and connect the grounds.
constexpr int LTE_RX_PIN = 16;
constexpr int LTE_TX_PIN = 17;
constexpr uint32_t BAUD_RATES[] = {115200, 9600, 57600, 38400, 19200};

HardwareSerial lte(2);
String serialCommand;
bool modemReady = false;
unsigned long lastRetry = 0;

// Print the complete modem reply, stopping after OK, ERROR, or a timeout.
bool printReply(unsigned long timeoutMs) {
  String reply;
  const unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    while (lte.available()) {
      const char c = char(lte.read());
      Serial.write(c);
      if (reply.length() < 256) reply += c;
    }
    if (reply.indexOf("\r\nOK\r\n") >= 0) return true;
    if (reply.indexOf("\r\nERROR\r\n") >= 0 ||
        reply.indexOf("+CME ERROR:") >= 0 ||
        reply.indexOf("+CMS ERROR:") >= 0) return false;
    delay(5);
  }
  if (!reply.length()) Serial.println("(no reply)");
  else Serial.println();
  return false;
}

void sendAT(const char *command, unsigned long timeoutMs = 3000) {
  while (lte.available()) Serial.write(lte.read());
  Serial.print("\n> ");
  Serial.println(command);
  lte.print(command);
  lte.print('\r');
  printReply(timeoutMs);
}

bool findModem() {
  for (uint32_t rate : BAUD_RATES) {
    lte.end();
    delay(150);
    lte.begin(rate, SERIAL_8N1, LTE_RX_PIN, LTE_TX_PIN);
    delay(300);
    while (lte.available()) lte.read();
    Serial.printf("Trying LTE at %lu baud...\n", (unsigned long)rate);
    for (int attempt = 0; attempt < 2; ++attempt) {
      lte.print("AT\r");
      String reply;
      const unsigned long start = millis();
      while (millis() - start < 2000) {
        while (lte.available()) {
          const char c = char(lte.read());
          if (reply.length() < 128) reply += c;
        }
        if (reply.indexOf("\r\nOK\r\n") >= 0 || reply == "OK\r\n") {
          Serial.printf("LTE RESPONDING at %lu baud: OK\n", (unsigned long)rate);
          return true;
        }
        delay(5);
      }
    }
  }
  Serial.println("NO AT RESPONSE. Check LTE power, common GND, and crossed TX/RX wires.");
  return false;
}

void runChecks() {
  sendAT("AT");
  sendAT("AT+CPIN?");  // +CPIN: READY means the SIM is detected.
  sendAT("AT+CSQ");    // +CSQ: 99,99 means signal is unknown/unavailable.
  sendAT("AT+CEREG?"); // Registration status 1 or 5 means registered.
  Serial.println("\nType an AT command in Serial Monitor and press Enter to test more.");
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=== Field B LTE UART test (ESP32 D16/D17) ===");
  Serial.println("Waiting 5 seconds for the separately powered LTE board...");
  delay(5000);
  modemReady = findModem();
  if (modemReady) runChecks();
  lastRetry = millis();
}

void loop() {
  if (!modemReady && millis() - lastRetry >= 10000UL) {
    lastRetry = millis();
    modemReady = findModem();
    if (modemReady) runChecks();
  }

  while (Serial.available()) {
    const char c = char(Serial.read());
    if (c == '\r' || c == '\n') {
      serialCommand.trim();
      if (serialCommand.length()) {
        if (modemReady) sendAT(serialCommand.c_str(), 5000);
        else Serial.println("LTE has not responded yet; waiting to retry.");
        serialCommand = "";
      }
    } else if (serialCommand.length() < 100) {
      serialCommand += c;
    }
  }

  // Show unsolicited modem messages such as *ATREADY and +CPIN: READY.
  while (modemReady && lte.available()) Serial.write(lte.read());
  delay(10);
}
