const assert = require("node:assert/strict");
const test = require("node:test");
const { sensorConfig } = require("../lib/sensor-supabase");

test("sensor client reuses the server key only for the same project", () => {
  const shared = sensorConfig({
    SUPABASE_URL: "https://main.supabase.co/",
    SUPABASE_SERVICE_ROLE_KEY: "main-secret",
    SENSOR_SUPABASE_URL: "https://main.supabase.co",
  });
  assert.equal(shared.key, "main-secret");

  const separate = sensorConfig({
    SUPABASE_URL: "https://main.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "main-secret",
    SENSOR_SUPABASE_URL: "https://sensor.supabase.co",
  });
  assert.equal(separate.key, undefined);

  const explicit = sensorConfig({
    SUPABASE_URL: "https://main.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "main-secret",
    SENSOR_SUPABASE_URL: "https://sensor.supabase.co",
    SENSOR_SUPABASE_SECRET_KEY: "sensor-secret",
  });
  assert.equal(explicit.key, "sensor-secret");
});
