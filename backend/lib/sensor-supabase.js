const { createClient } = require("@supabase/supabase-js");

let sensorClient;

function sensorConfig(env = process.env) {
  const url = env.SENSOR_SUPABASE_URL?.trim();
  const mainUrl = env.SUPABASE_URL?.trim();
  const sameProject = url && mainUrl && url.replace(/\/$/, "") === mainUrl.replace(/\/$/, "");
  const key = env.SENSOR_SUPABASE_SECRET_KEY?.trim() ||
    (sameProject ? env.SUPABASE_SERVICE_ROLE_KEY?.trim() : undefined);
  return { url, key };
}

function getSensorSupabase() {
  if (sensorClient) return sensorClient;
  const { url, key } = sensorConfig();
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

module.exports = { getSensorSupabase, sensorConfig };
