const crypto = require("node:crypto");
const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSensorSupabase } = require("../lib/sensor-supabase");
const {
  DEFAULT_INTERVAL_SECONDS,
  MAX_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  parseIntervalSeconds,
} = require("../lib/sensor-interval");

const router = express.Router();
const tables = new Set(["sensor_readings", "soil_readings", "sensor_device_fields"]);
const readingFields = {
  sensor_readings: ["temperature_c", "soil_temperature_c", "humidity_percent", "soil_moisture"],
  soil_readings: ["moisture_raw", "moisture_percent"],
};

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)
    && Number.isFinite(Date.parse(value));
}

function deviceAuthorized(req) {
  const expected = process.env.SENSOR_DEVICE_TOKEN?.trim();
  const supplied = req.get("x-device-token") || "";
  if (!expected || expected.length < 32 || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// The ESP32 polls this to learn how often it should read and send data.
router.get("/config", async (req, res, next) => {
  try {
    if (!deviceAuthorized(req)) return res.status(401).json({ error: "Invalid device token" });
    const configuredDevice = process.env.SENSOR_DEVICE_ID?.trim();
    if (!configuredDevice || req.query.device_id !== configuredDevice) {
      return res.status(400).json({ error: "Unknown device" });
    }
    const { data, error } = await getSensorSupabase().from("sensor_device_settings")
      .select("read_interval_seconds").eq("device_id", configuredDevice).maybeSingle();
    if (error) throw error;
    return res.json({
      read_interval_seconds: data?.read_interval_seconds ?? DEFAULT_INTERVAL_SECONDS,
    });
  } catch (error) { return next(error); }
});

// Lists every known device with its send interval for the admin Settings page.
async function listDeviceSettings() {
  const db = getSensorSupabase();
  const [fields, settings] = await Promise.all([
    db.from("sensor_device_fields").select("device_id, field_name"),
    db.from("sensor_device_settings").select("*"),
  ]);
  if (fields.error) throw fields.error;
  if (settings.error) throw settings.error;
  const devices = new Map();
  const configuredDevice = process.env.SENSOR_DEVICE_ID?.trim();
  if (configuredDevice) devices.set(configuredDevice, { device_id: configuredDevice, field_name: null });
  for (const row of fields.data || []) devices.set(row.device_id, { ...row });
  for (const row of settings.data || []) {
    devices.set(row.device_id, { field_name: null, ...devices.get(row.device_id), ...row });
  }
  return [...devices.values()]
    .map((device) => ({
      read_interval_seconds: DEFAULT_INTERVAL_SECONDS,
      updated_at: null,
      updated_by_name: null,
      ...device,
    }))
    .sort((a, b) => a.device_id.localeCompare(b.device_id));
}

router.get("/settings", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    return res.json({ devices: await listDeviceSettings() });
  } catch (error) { return next(error); }
});

router.put("/settings/:deviceId", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const interval = parseIntervalSeconds(req.body?.read_interval_seconds);
    if (interval == null) {
      return res.status(400).json({
        error: `Send interval must be ${MIN_INTERVAL_SECONDS} seconds to ${MAX_INTERVAL_SECONDS / 86400} day.`,
      });
    }
    const { deviceId } = req.params;
    const devices = await listDeviceSettings();
    if (!devices.some((device) => device.device_id === deviceId)) {
      return res.status(404).json({ error: "Sensor device not found" });
    }
    const { data, error } = await getSensorSupabase().from("sensor_device_settings")
      .upsert({
        device_id: deviceId,
        read_interval_seconds: interval,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id,
        updated_by_name: req.profile?.full_name || null,
      }, { onConflict: "device_id" })
      .select().single();
    if (error) throw error;
    return res.json({ device: data });
  } catch (error) { return next(error); }
});

router.get("/:table", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { table } = req.params;
    if (!tables.has(table)) return res.status(404).json({ error: "Sensor table not found" });
    const limit = Number(req.query.limit || 1000);
    const offset = Number(req.query.offset || 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000 ||
        !Number.isInteger(offset) || offset < 0 || offset > 1000000 ||
        (req.query.start && !validDate(req.query.start)) ||
        (req.query.end && !validDate(req.query.end))) {
      return res.status(400).json({ error: "Invalid sensor query" });
    }
    let query = getSensorSupabase().from(table).select("*");
    if (table !== "sensor_device_fields") {
      if (req.query.start) query = query.gte("created_at", req.query.start);
      if (req.query.end) query = query.lt("created_at", req.query.end);
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
    }
    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return res.json({ data: data || [] });
  } catch (error) { return next(error); }
});

router.post("/ingest/:table", async (req, res, next) => {
  try {
    if (!deviceAuthorized(req)) return res.status(401).json({ error: "Invalid device token" });
    const { table } = req.params;
    const fields = readingFields[table];
    if (!fields) return res.status(404).json({ error: "Sensor table not found" });
    const body = req.body;
    const configuredDevice = process.env.SENSOR_DEVICE_ID?.trim();
    if (!configuredDevice || !body || Array.isArray(body) ||
        body.device_id !== configuredDevice ||
        Object.keys(body).some((key) => !["device_id", "created_at", ...fields].includes(key)) ||
        (body.created_at !== undefined && !validDate(body.created_at))) {
      return res.status(400).json({ error: "Invalid sensor reading" });
    }
    const allowed = {
      temperature_c: [-40, 85], soil_temperature_c: [-40, 85],
      humidity_percent: [0, 100], soil_moisture: [0, 100],
      moisture_raw: [0, 4095], moisture_percent: [0, 100],
    };
    if (!fields.some((key) => body[key] != null) || fields.some((key) => {
      const value = body[key];
      return value != null && (typeof value !== "number" || !Number.isFinite(value) ||
        value < allowed[key][0] || value > allowed[key][1]);
    })) return res.status(400).json({ error: "Invalid sensor reading" });
    const { error } = await getSensorSupabase().from(table).insert(body);
    if (error) throw error;
    return res.status(201).json({ saved: true });
  } catch (error) { return next(error); }
});

module.exports = router;
