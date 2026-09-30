import { createClient } from '@supabase/supabase-js'

const sensorSupabaseUrl = import.meta.env.VITE_SENSOR_SUPABASE_URL
const sensorSupabasePublishableKey = import.meta.env.VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY

if (!sensorSupabaseUrl || !sensorSupabasePublishableKey) {
  throw new Error(
    'Missing VITE_SENSOR_SUPABASE_URL or VITE_SENSOR_SUPABASE_PUBLISHABLE_KEY in web/.env.local',
  )
}

export const sensorSupabase = createClient(
  sensorSupabaseUrl,
  sensorSupabasePublishableKey,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
)
