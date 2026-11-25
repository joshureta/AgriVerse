const test = require("node:test");
const assert = require("node:assert/strict");
const { configuredDevices, deviceIdForToken } = require("../lib/sensor-devices");

const fieldAToken = "a".repeat(64);
const fieldBToken = "b".repeat(64);
const env = {
  SENSOR_DEVICE_ID: "ESP32_001",
  SENSOR_DEVICE_TOKEN: fieldAToken,
  SENSOR_DEVICE_2_ID: "ESP32_002",
  SENSOR_DEVICE_2_TOKEN: fieldBToken,
};

test("both ESP32 devices have separate valid credentials", () => {
  assert.deepEqual(configuredDevices(env).map((device) => device.id),
    ["ESP32_001", "ESP32_002"]);
  assert.equal(deviceIdForToken(fieldAToken, env), "ESP32_001");
  assert.equal(deviceIdForToken(fieldBToken, env), "ESP32_002");
  assert.equal(deviceIdForToken("wrong-token", env), null);
});

test("an incomplete second device does not replace the first device", () => {
  const incomplete = { ...env, SENSOR_DEVICE_2_TOKEN: "short" };
  assert.deepEqual(configuredDevices(incomplete).map((device) => device.id), ["ESP32_001"]);
  assert.equal(deviceIdForToken(fieldBToken, incomplete), null);
  assert.equal(deviceIdForToken(fieldAToken, incomplete), "ESP32_001");
});
