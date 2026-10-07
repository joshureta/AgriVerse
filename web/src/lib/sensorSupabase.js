import { createClient } from '@supabase/supabase-js'

const sensorSupabaseUrl = import.meta.env.VITE_SENSOR_SUPABASE_URL
const sensorSupabasePublishableKey = import.meta.env.VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY

// Sensor telemetry is optional for the rest of the web app. Missing sensor
// credentials should be reported on the monitoring page, not crash startup.
export const sensorSupabase = sensorSupabaseUrl && sensorSupabasePublishableKey
  ? createClient(sensorSupabaseUrl, sensorSupabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
  : null
