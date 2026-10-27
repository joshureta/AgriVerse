const { createClient } = require("@supabase/supabase-js");

let sensorClient;

function getSensorSupabase() {
  if (sensorClient) return sensorClient;
  const url = process.env.SENSOR_SUPABASE_URL?.trim();
  const key = process.env.SENSOR_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    const error = new Error("Sensor database is not configured");
    error.status = 503;
    throw error;
  }
  sensorClient = createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  return sensorClient;
}

module.exports = { getSensorSupabase };
