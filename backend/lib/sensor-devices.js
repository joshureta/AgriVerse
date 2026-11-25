const crypto = require("node:crypto");

function configuredDevices(env = process.env) {
  const devices = [];
  const add = (id, token) => {
    const deviceId = id?.trim();
    const deviceToken = token?.trim();
    if (deviceId && deviceToken?.length >= 32 &&
        !devices.some((device) => device.id === deviceId)) {
      devices.push({ id: deviceId, token: deviceToken });
    }
  };

  // Keep the first ESP32's existing Hostinger settings working.
  add(env.SENSOR_DEVICE_ID, env.SENSOR_DEVICE_TOKEN);
  for (const key of Object.keys(env).sort()) {
    const match = /^SENSOR_DEVICE_(\d+)_ID$/.exec(key);
    if (match) add(env[key], env[`SENSOR_DEVICE_${match[1]}_TOKEN`]);
  }
  return devices;
}

function deviceIdForToken(supplied, env = process.env) {
  if (typeof supplied !== "string" || !supplied) return null;
  const actual = Buffer.from(supplied);
  for (const device of configuredDevices(env)) {
    const expected = Buffer.from(device.token);
    if (actual.length === expected.length && crypto.timingSafeEqual(actual, expected)) {
      return device.id;
    }
  }
  return null;
}

module.exports = { configuredDevices, deviceIdForToken };
