const express = require("express");
const { requireAuth } = require("../middleware/auth");
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

function requireInventoryAccess(req, res, next) {
  const isAdminEndpoint = req.baseUrl.startsWith("/api/admin/");
  const allowed = isAdminEndpoint
    ? req.profile?.role === "admin"
    : req.profile?.role === "farm_worker" && req.profile?.worker_category === "seller";
  if (!allowed) return res.status(403).json({ error: "You do not have access to this resource" });
  return next();
}

function limitSellerInventory(req, res, next) {
  if (req.baseUrl.startsWith("/api/admin/")) return next();

  const readsPineappleStock = req.method === "GET" && req.path === "/";
  const readsStockHistory = req.method === "GET" && req.path === "/stock-history";
  const addsStock = req.method === "POST" && /^\/\d+\/stock$/.test(req.path);
  const addsPineappleSizeStock = req.method === "POST" && /^\/pineapple-sizes\/\d+\/stock$/.test(req.path);
  if (!readsPineappleStock && !readsStockHistory && !addsStock && !addsPineappleSizeStock) {
    return res.status(403).json({ error: "Sellers can only manage pineapple stock" });
  }

  return next();
}

router.use(requireAuth, requireInventoryAccess, limitSellerInventory);

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

router.get("/stock-history", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
    const supabase = getSupabase();
    const { data: category, error: categoryError } = await supabase
      .from("inventory_categories").select("id").eq("code", "pineapple").maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return res.json({ movements: [] });

    const { data: pineappleItems, error: itemsError } = await supabase
      .from("inventory_items").select(inventorySelect).eq("inventory_category_id", category.id);
    if (itemsError) throw itemsError;
    const serializedItems = (pineappleItems || []).map(serializeItem);
    const itemMap = new Map(serializedItems.map((item) => [item.id, item]));
    const itemIds = serializedItems.map((item) => item.id);
    if (!itemIds.length) return res.json({ movements: [] });

    const { data, error } = await supabase.from("inventory_stock_movements")
      .select("id, inventory_item_id, movement_type, quantity, quantity_before, quantity_after, created_at")
      .in("inventory_item_id", itemIds).order("created_at", { ascending: false }).limit(limit);
    if (error) {
      if (error.code === "42P01" || error.code === "PGRST205") {
        throw httpError(503, "Apply migration 010_inventory_stock_movements.sql to enable stock history");
      }
      throw error;
    }
    return res.json({
      movements: (data || []).map((movement) => {
        const item = itemMap.get(movement.inventory_item_id);
        return { ...movement, pineapple_size: item?.variant || "Unknown", unit: item?.unit_label || "" };
      }),
    });
  } catch (error) { return next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const sellerEndpoint = req.baseUrl.startsWith("/api/seller/");
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 5, 1), 50);
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const categoryId = !sellerEndpoint && req.query.categoryId ? readId(req.query.categoryId, "Inventory category") : null;
    const archived = !sellerEndpoint && String(req.query.archived || "false").toLowerCase() === "true";
    const pineappleOnly = sellerEndpoint || String(req.query.pineappleOnly || "false").toLowerCase() === "true";
    const excludePineapple = !sellerEndpoint && String(req.query.excludePineapple || "false").toLowerCase() === "true";
    const from = (page - 1) * pageSize;
    const { data: pineappleCategory, error: pineappleCategoryError } = await getSupabase()
      .from("inventory_categories").select("id").eq("code", "pineapple").maybeSingle();
    if (pineappleCategoryError) throw pineappleCategoryError;
    const pineappleCategoryId = pineappleCategory?.id || null;
    let query = getSupabase().from("inventory_items").select(inventorySelect, { count: "exact" })
      .order(archived ? "archived_at" : "updated_at", { ascending: false }).range(from, from + pageSize - 1);
    query = archived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
    if (search) query = query.ilike("item_name", `%${search}%`);
    if (categoryId) query = query.eq("inventory_category_id", categoryId);
    if (pineappleOnly) {
      query = pineappleCategoryId
        ? query.eq("inventory_category_id", pineappleCategoryId)
        : query.eq("inventory_category_id", -1);
    }
    if (excludePineapple && pineappleCategoryId) query = query.neq("inventory_category_id", pineappleCategoryId);
    let activeItemsCountQuery = getSupabase()
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null);
    if (pineappleCategoryId) {
      activeItemsCountQuery = activeItemsCountQuery.neq("inventory_category_id", pineappleCategoryId);
    }
    const pineappleCountQuery = pineappleCategoryId
      ? getSupabase().from("inventory_items").select("id", { count: "exact", head: true })
        .eq("inventory_category_id", pineappleCategoryId).is("archived_at", null)
      : Promise.resolve({ count: 0, error: null });
    const [{ data, error, count }, activeCountResult, archivedCountResult, pineappleCountResult] = await Promise.all([
      query,
      activeItemsCountQuery,
      getSupabase().from("inventory_items").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
      pineappleCountQuery,
    ]);
    if (error) throw error;
    if (activeCountResult.error) throw activeCountResult.error;
    if (archivedCountResult.error) throw archivedCountResult.error;
    if (pineappleCountResult.error) throw pineappleCountResult.error;
    let items = (data || []).map(serializeItem);
    let total = count || 0;

    if (pineappleOnly && !archived && !search && page === 1) {
      const { data: sizes, error: sizesError } = await getSupabase()
        .from("pineapple_sizes").select("id, size_name").eq("status", true).order("size_name");
      if (sizesError) throw sizesError;
      const stockedSizeIds = new Set(items.map((item) => item.details?.size_id).filter(Boolean));
      const missingSizes = (sizes || []).filter((size) => !stockedSizeIds.has(size.id));
      const placeholders = missingSizes.map((size) => serializeItem({
        id: null,
        item_name: `${size.size_name} Pineapple`,
        quantity: 0,
        created_at: null,
        updated_at: null,
        archived_at: null,
        category: { id: pineappleCategoryId, category_name: "Pineapple", code: "pineapple", status: true },
        unit: null,
        pineapple_inventory: [{ inventory_id: null, size_id: size.id, harvest_date: null, size: { id: size.id, size_name: size.size_name, status: true } }],
      }));
      items = [...items, ...placeholders];
      total += placeholders.length;
    }

    return res.json({
      items,
      pagination: { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) },
      viewCounts: {
        items: activeCountResult.count || 0,
        stock: pineappleCountResult.count || 0,
        archive: archivedCountResult.count || 0,
      },
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

router.post("/pineapple-sizes/:sizeId/stock", async (req, res, next) => {
  try {
    const sizeId = readId(req.params.sizeId, "Pineapple size");
    const quantity = readQuantity(req.body.quantity, { allowZero: false });
    const supabase = getSupabase();

    const { data: size, error: sizeError } = await supabase
      .from("pineapple_sizes").select("id, size_name").eq("id", sizeId).eq("status", true).single();
    if (sizeError || !size) throw httpError(400, "The selected pineapple size is unavailable");

    const { data: category, error: categoryError } = await supabase
      .from("inventory_categories").select("id").eq("code", "pineapple").single();
    if (categoryError || !category) throw httpError(500, "Pineapple inventory category is not configured");

    const { data: existingItems, error: existingItemsError } = await supabase
      .from("inventory_items")
      .select("id, pineapple_inventory!inner(size_id)")
      .eq("inventory_category_id", category.id)
      .eq("pineapple_inventory.size_id", sizeId)
      .is("archived_at", null)
      .limit(1);
    if (existingItemsError) throw existingItemsError;
    const existingItem = (existingItems || [])[0] || null;

    let itemId;
    if (existingItem) {
      itemId = existingItem.id;
      const { error } = await supabase.rpc("add_inventory_stock", { p_item_id: itemId, p_quantity: quantity });
      if (error) throw error;
    } else {
      const { data: unit, error: unitError } = await supabase
        .from("measurement_units").select("id").eq("abbreviation", "pcs").eq("status", true).single();
      if (unitError || !unit) throw httpError(500, "Default pineapple unit is not configured");

      const { data: created, error: createError } = await supabase
        .from("inventory_items")
        .insert({
          inventory_category_id: category.id,
          unit_id: unit.id,
          item_name: `${size.size_name} Pineapple`,
          quantity,
          created_by: req.user.id,
        })
        .select("id").single();
      if (createError) throwDatabaseError(createError);
      itemId = created.id;

      const { error: linkError } = await supabase
        .from("pineapple_inventory").insert({ inventory_id: itemId, size_id: sizeId });
      if (linkError) throw linkError;
    }

    return res.json({ item: await fetchItem(itemId) });
  } catch (error) { return next(error); }
});

router.post("/:id/stock", async (req, res, next) => {
  try {
    const id = readId(req.params.id);
    if (req.baseUrl.startsWith("/api/seller/")) {
      const item = await fetchItem(id);
      if (item.category_code !== "pineapple" || item.archived_at) {
        throw httpError(403, "Sellers can only add pineapple stock");
      }
    }
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
