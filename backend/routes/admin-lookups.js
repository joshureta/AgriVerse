const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();

const resources = {
  "task-categories": { table: "task_categories", name: "category_name", description: true },
  "task-priorities": { table: "task_priorities", name: "priority_name", code: true, sort: true },
  "task-statuses": { table: "task_statuses", name: "status_name", code: true, sort: true },
  "schedule-statuses": { table: "schedule_statuses", name: "status_name", code: true, sort: true },
  fields: { table: "farm_fields", name: "field_name", description: true },
  "inventory-categories": { table: "inventory_categories", name: "category_name", code: true, description: true },
  units: { table: "measurement_units", name: "unit_name", abbreviation: true },
  "pineapple-sizes": { table: "pineapple_sizes", name: "size_name" },
  "equipment-types": { table: "equipment_types", name: "type_name" },
};

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getResource(key) {
  const resource = resources[key];
  if (!resource) throw httpError(404, "Lookup resource was not found");
  return resource;
}

function readId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid lookup ID");
  return id;
}

function readText(value, label, maxLength = 120) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) {
    throw httpError(400, `${label} is required and must not exceed ${maxLength} characters`);
  }
  return text;
}

function readOptionalText(value, maxLength = 500) {
  const text = String(value || "").trim();
  if (text.length > maxLength) throw httpError(400, `Description must not exceed ${maxLength} characters`);
  return text || null;
}

function lookupPayload(resource, body, { partial = false } = {}) {
  const payload = {};
  if (!partial || body[resource.name] !== undefined) {
    payload[resource.name] = readText(body[resource.name], "Name");
  }
  if (resource.description && (!partial || body.description !== undefined)) {
    payload.description = readOptionalText(body.description);
  }
  if (resource.code && (!partial || body.code !== undefined)) {
    payload.code = readText(body.code, "Code", 60).toLowerCase().replace(/[^a-z0-9]+/g, "_");
  }
  if (resource.abbreviation && (!partial || body.abbreviation !== undefined)) {
    payload.abbreviation = readText(body.abbreviation, "Abbreviation", 20);
  }
  if (resource.sort && (!partial || body.sort_order !== undefined)) {
    const order = Number(body.sort_order || 0);
    if (!Number.isSafeInteger(order)) throw httpError(400, "Sort order must be a whole number");
    payload.sort_order = order;
  }
  if (body.status !== undefined) payload.status = Boolean(body.status);
  return payload;
}

function throwDatabaseError(error) {
  if (error?.code === "23505") throw httpError(409, "A lookup value with this name or code already exists");
  if (error?.code === "PGRST116") throw httpError(404, "Lookup value was not found");
  throw error;
}

router.get("/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource);
    let query = getSupabase().from(resource.table).select("*");
    if (req.query.includeInactive !== "true") query = query.eq("status", true);
    query = query.order(resource.sort ? "sort_order" : resource.name, { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ values: data || [] });
  } catch (error) {
    return next(error);
  }
});

router.post("/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource);
    const { data, error } = await getSupabase()
      .from(resource.table)
      .insert({ ...lookupPayload(resource, req.body), status: req.body.status !== false })
      .select("*")
      .single();
    if (error) throwDatabaseError(error);
    return res.status(201).json({ value: data });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource);
    const payload = lookupPayload(resource, req.body, { partial: true });
    if (!Object.keys(payload).length) throw httpError(400, "No lookup changes were supplied");
    const { data, error } = await getSupabase()
      .from(resource.table)
      .update(payload)
      .eq("id", readId(req.params.id))
      .select("*")
      .single();
    if (error) throwDatabaseError(error);
    return res.json({ value: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
