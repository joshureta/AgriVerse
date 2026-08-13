const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const inventorySelect = [
  "id, inventory_category_id, item_name, quantity, unit_id, created_at, updated_at, archived_at",
  "category:inventory_categories!inventory_items_inventory_category_id_fkey(id, category_name, code, status)",
  "unit:measurement_units!inventory_items_unit_id_fkey(id, unit_name, abbreviation, status)",
  "pineapple_inventory(inventory_id, size_id, harvest_date, size:pineapple_sizes!pineapple_inventory_size_id_fkey(id, size_name, status))",
  "fertilizer_inventory(inventory_id, formulation, expiration_date)",
  "pesticide_inventory(inventory_id, pesticide_type, expiration_date)",
  "equipment_inventory(inventory_id, equipment_type_id, condition, availability, last_maintenance, equipment_type:equipment_types!equipment_inventory_equipment_type_id_fkey(id, type_name, status))",
].join(",");

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readText(value, label, maxLength = 100, optional = false) {
  const text = String(value || "").trim();
  if ((!optional && !text) || text.length > maxLength) {
    throw httpError(400, `${label}${optional ? "" : " is required and"} must not exceed ${maxLength} characters`);
  }
  return text || null;
}

function readQuantity(value, { allowZero = true } = {}) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < (allowZero ? 0 : 1)) {
    throw httpError(400, allowZero
      ? "Stock quantity must be a whole number of zero or greater"
      : "Stock quantity must be a whole number greater than zero");
  }
  return quantity;
}

function readId(value, label = "Inventory item ID") {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, `Invalid ${label.toLowerCase()}`);
  return id;
}

function readDate(value, label) {
  if (!value) return null;
  const date = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
    throw httpError(400, `${label} must be a valid date`);
  }
  return date;
}

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function serializeItem(item) {
  const pineapple = one(item.pineapple_inventory);
  const fertilizer = one(item.fertilizer_inventory);
  const pesticide = one(item.pesticide_inventory);
  const equipment = one(item.equipment_inventory);
  const variant = pineapple?.size?.size_name || fertilizer?.formulation || pesticide?.pesticide_type
    || equipment?.equipment_type?.type_name || "—";
  return {
    ...item,
    pineapple_inventory: undefined,
    fertilizer_inventory: undefined,
    pesticide_inventory: undefined,
    equipment_inventory: undefined,
    item_type: item.category?.category_name || "",
    category_code: item.category?.code || "",
    stock_quantity: item.quantity,
    variant,
    unit_label: item.unit?.abbreviation || "",
    details: pineapple || fertilizer || pesticide || equipment || null,
  };
}

async function fetchItem(id) {
  const { data, error } = await getSupabase().from("inventory_items").select(inventorySelect)
    .eq("id", id).single();
  if (error) throwDatabaseError(error);
  return serializeItem(data);
}

async function ensureActive(table, id, label, select = "id") {
  const { data, error } = await getSupabase().from(table).select(select)
    .eq("id", readId(id, label)).eq("status", true).single();
  if (error || !data) throw httpError(400, `The selected ${label.toLowerCase()} is unavailable`);
  return data;
}

async function inventoryPayload(body, { requireQuantity = true } = {}) {
  const category = await ensureActive("inventory_categories", body.inventory_category_id, "Inventory category", "id, code");
  const unit = await ensureActive("measurement_units", body.unit_id, "Unit");
  const common = {
    inventory_category_id: category.id,
    unit_id: unit.id,
    item_name: readText(body.item_name, "Item name", 100),
  };
  const suppliedQuantity = body.stock_quantity ?? body.quantity;
  if (requireQuantity || suppliedQuantity !== undefined) {
    common.quantity = readQuantity(suppliedQuantity);
  }

  let detail = null;
  if (category.code === "pineapple") {
    const size = await ensureActive("pineapple_sizes", body.size_id, "Pineapple size");
    detail = { table: "pineapple_inventory", values: { size_id: size.id, harvest_date: readDate(body.harvest_date, "Harvest date") } };
  } else if (category.code === "fertilizer") {
    detail = { table: "fertilizer_inventory", values: { formulation: readText(body.formulation, "Formulation", 120), expiration_date: readDate(body.expiration_date, "Expiration date") } };
  } else if (category.code === "pesticide") {
    detail = { table: "pesticide_inventory", values: { pesticide_type: readText(body.pesticide_type, "Pesticide type", 120), expiration_date: readDate(body.expiration_date, "Expiration date") } };
  } else if (category.code === "equipment") {
    const equipmentType = await ensureActive("equipment_types", body.equipment_type_id, "Equipment type");
    detail = { table: "equipment_inventory", values: {
      equipment_type_id: equipmentType.id,
      condition: readText(body.condition, "Condition", 80),
      availability: readText(body.availability, "Availability", 80),
      last_maintenance: readDate(body.last_maintenance, "Last maintenance"),
    } };
  }
  return { common, detail };
}

async function replaceDetails(inventoryId, detail) {
  const tables = ["pineapple_inventory", "fertilizer_inventory", "pesticide_inventory", "equipment_inventory"];
  for (const table of tables) {
    const { error } = await getSupabase().from(table).delete().eq("inventory_id", inventoryId);
    if (error) throw error;
  }
  if (detail) {
    const { error } = await getSupabase().from(detail.table).insert({ inventory_id: inventoryId, ...detail.values });
    if (error) throw error;
  }
}

function throwDatabaseError(error) {
  if (error?.code === "23505") throw httpError(409, "An active inventory item with the same name and category already exists");
  if (error?.code === "23503") throw httpError(400, "A selected inventory option is invalid");
  if (error?.code === "PGRST116") throw httpError(404, "Inventory item was not found");
  throw error;
}

router.get("/options", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const [categories, units, pineappleSizes, equipmentTypes] = await Promise.all([
      supabase.from("inventory_categories").select("id, category_name, code").eq("status", true).order("category_name"),
      supabase.from("measurement_units").select("id, unit_name, abbreviation").eq("status", true).order("unit_name"),
      supabase.from("pineapple_sizes").select("id, size_name").eq("status", true).order("size_name"),
      supabase.from("equipment_types").select("id, type_name").eq("status", true).order("type_name"),
    ]);
    for (const result of [categories, units, pineappleSizes, equipmentTypes]) if (result.error) throw result.error;
    return res.json({
      categories: categories.data || [], units: units.data || [],
      pineappleSizes: pineappleSizes.data || [], equipmentTypes: equipmentTypes.data || [],
    });
  } catch (error) { return next(error); }
});

router.post("/categories", async (req, res, next) => {
  try {
    const categoryName = readText(req.body.category_name, "Category name", 80);
    const description = readText(req.body.description, "Description", 300, true);
    const code = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!code) throw httpError(400, "Category name must contain letters or numbers");
    const { data, error } = await getSupabase().from("inventory_categories")
      .insert({ category_name: categoryName, code, description }).select("id, category_name, code").single();
    if (error?.code === "23505") throw httpError(409, "That inventory category already exists");
    if (error) throw error;
    return res.status(201).json({ category: data });
  } catch (error) { return next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 5, 1), 50);
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const categoryId = req.query.categoryId ? readId(req.query.categoryId, "Inventory category") : null;
    const archived = String(req.query.archived || "false").toLowerCase() === "true";
    const from = (page - 1) * pageSize;
    let query = getSupabase().from("inventory_items").select(inventorySelect, { count: "exact" })
      .order(archived ? "archived_at" : "updated_at", { ascending: false }).range(from, from + pageSize - 1);
    query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
    if (search) query = query.ilike("item_name", `%${search}%`);
    if (categoryId) query = query.eq("inventory_category_id", categoryId);
    const { data, error, count } = await query;
    if (error) throw error;
    const total = count || 0;
    return res.json({
      items: (data || []).map(serializeItem),
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
    });
  } catch (error) { return next(error); }
});

router.post("/", async (req, res, next) => {
  let itemId = null;
  try {
    const payload = await inventoryPayload(req.body);
    const { data, error } = await getSupabase().from("inventory_items")
      .insert({ ...payload.common, created_by: req.user.id }).select("id").single();
    if (error) throwDatabaseError(error);
    itemId = data.id;
    await replaceDetails(itemId, payload.detail);
    return res.status(201).json({ item: await fetchItem(itemId) });
  } catch (error) {
    if (itemId) await getSupabase().from("inventory_items").delete().eq("id", itemId);
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const id = readId(req.params.id);
    const payload = await inventoryPayload(req.body, { requireQuantity: false });
    const { error } = await getSupabase().from("inventory_items").update(payload.common)
      .eq("id", id).is("archived_at", null);
    if (error) throwDatabaseError(error);
    await replaceDetails(id, payload.detail);
    return res.json({ item: await fetchItem(id) });
  } catch (error) { return next(error); }
});

router.post("/:id/stock", async (req, res, next) => {
  try {
    const id = readId(req.params.id);
    const { error } = await getSupabase().rpc("add_inventory_stock", {
      p_item_id: id, p_quantity: readQuantity(req.body.quantity, { allowZero: false }),
    });
    if (error) {
      if (error.message?.includes("not found")) throw httpError(404, "Inventory item was not found");
      throw error;
    }
    return res.json({ item: await fetchItem(id) });
  } catch (error) { return next(error); }
});

router.post("/:id/archive", async (req, res, next) => {
  try {
    const id = readId(req.params.id);
    const { error } = await getSupabase().from("inventory_items")
      .update({ archived_at: new Date().toISOString() }).eq("id", id).is("archived_at", null);
    if (error) throwDatabaseError(error);
    return res.json({ item: await fetchItem(id) });
  } catch (error) { return next(error); }
});

router.post("/:id/restore", async (req, res, next) => {
  try {
    const id = readId(req.params.id);
    const { error } = await getSupabase().from("inventory_items")
      .update({ archived_at: null }).eq("id", id).not("archived_at", "is", null);
    if (error) throwDatabaseError(error);
    return res.json({ item: await fetchItem(id) });
  } catch (error) { return next(error); }
});

module.exports = router;
