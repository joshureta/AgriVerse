const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const inventorySelect =
  "id, item_type, item_name, variant, stock_quantity, created_at, updated_at, archived_at";

router.use(requireAuth, requireRole("admin"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readText(value, label, maxLength = 100) {
  const text = String(value || "").trim();
  if (!text || text.length > maxLength) {
    throw httpError(400, `${label} is required and must not exceed ${maxLength} characters`);
  }
  return text;
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

function readId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid inventory item ID");
  return id;
}

function inventoryFields(body) {
  return {
    item_type: readText(body.item_type, "Item type", 60),
    item_name: readText(body.item_name, "Item name", 100),
    variant: readText(body.variant, "Variant", 100),
    stock_quantity: readQuantity(body.stock_quantity),
  };
}

function throwDatabaseError(error) {
  if (error?.code === "23505") {
    throw httpError(409, "An active inventory item with the same name and variant already exists");
  }
  if (error?.code === "PGRST116") throw httpError(404, "Inventory item was not found");
  throw error;
}

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 5, 1), 50);
    const search = String(req.query.search || "").trim().replace(/[,%()]/g, "");
    const type = String(req.query.type || "").trim();
    const from = (page - 1) * pageSize;

    let query = getSupabase()
      .from("inventory_items")
      .select(inventorySelect, { count: "exact" })
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (search) {
      query = query.or(
        `item_name.ilike.%${search}%,item_type.ilike.%${search}%,variant.ilike.%${search}%`,
      );
    }
    if (type) query = query.eq("item_type", readText(type, "Item type", 60));

    const { data, error, count } = await query;
    if (error) throw error;

    const total = count || 0;
    return res.json({
      items: data || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .insert({ ...inventoryFields(req.body), created_by: req.user.id })
      .select(inventorySelect)
      .single();
    if (error) throwDatabaseError(error);
    return res.status(201).json({ item: data });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .update(inventoryFields(req.body))
      .eq("id", readId(req.params.id))
      .is("archived_at", null)
      .select(inventorySelect)
      .single();
    if (error) throwDatabaseError(error);
    return res.json({ item: data });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/stock", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().rpc("add_inventory_stock", {
      p_item_id: readId(req.params.id),
      p_quantity: readQuantity(req.body.quantity, { allowZero: false }),
    });
    if (error) {
      if (error.message?.includes("not found")) throw httpError(404, "Inventory item was not found");
      throw error;
    }
    return res.json({ item: Array.isArray(data) ? data[0] : data });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/archive", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("inventory_items")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", readId(req.params.id))
      .is("archived_at", null)
      .select(inventorySelect)
      .single();
    if (error) throwDatabaseError(error);
    return res.json({ item: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
