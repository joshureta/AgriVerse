const { createClient } = require("@supabase/supabase-js");

function validateSupabaseConfig(env = process.env) {
  const url = env.SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (
    !url ||
    !serviceRoleKey ||
    serviceRoleKey === "PASTE_YOUR_FULL_sb_secret_KEY_HERE"
  ) {
    return {
      valid: false,
      error: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    };
  }

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("unsupported protocol");
    }
  } catch {
    return {
      valid: false,
      error: "SUPABASE_URL must be a valid HTTP(S) URL",
    };
  }

  return { valid: true, url, serviceRoleKey };
}

const config = validateSupabaseConfig();

const supabase = config.valid
  ? createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

function getSupabase() {
  if (!supabase) {
    const error = new Error(config.error);
    error.status = 503;
    throw error;
  }

  return supabase;
}

module.exports = {
  getSupabase,
  supabase,
  supabaseConfig: config,
  validateSupabaseConfig,
};
