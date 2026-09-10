const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();

router.use(requireAuth, requireRole("buyer"));

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

router.get("/pineapples", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const [sizesResult, inventoryResult] = await Promise.all([
      supabase
        .from("pineapple_sizes")
        .select("id, size_name, weight_label, description, selling_price, display_order")
        .eq("status", true)
        .eq("marketplace_enabled", true)
        .order("display_order"),
      supabase
        .from("inventory_items")
        .select([
          "id, item_name, quantity, unit:measurement_units!inventory_items_unit_id_fkey(abbreviation)",
          "category:inventory_categories!inventory_items_inventory_category_id_fkey!inner(code)",
          "pineapple_inventory!inner(size_id)",
        ].join(","))
        .eq("category.code", "pineapple")
        .is("archived_at", null),
    ]);

    if (sizesResult.error) throw sizesResult.error;
    if (inventoryResult.error) throw inventoryResult.error;

    const inventoryBySize = new Map();
    for (const item of inventoryResult.data || []) {
      const detail = one(item.pineapple_inventory);
      if (!detail?.size_id) continue;
      const current = inventoryBySize.get(detail.size_id) || {
        stock_quantity: 0,
        inventory_item_ids: [],
        unit_label: one(item.unit)?.abbreviation || "",
      };
      current.stock_quantity += Number(item.quantity) || 0;
      current.inventory_item_ids.push(item.id);
      if (!current.unit_label) current.unit_label = one(item.unit)?.abbreviation || "";
      inventoryBySize.set(detail.size_id, current);
    }

    const products = (sizesResult.data || []).map((size) => {
      const inventory = inventoryBySize.get(size.id) || {
        stock_quantity: 0,
        inventory_item_ids: [],
        unit_label: "",
      };
      return {
        id: size.id,
        name: `${size.size_name} Pineapple`,
        size_name: size.size_name,
        weight: size.weight_label,
        description: size.description,
        price: Number(size.selling_price),
        stock_quantity: inventory.stock_quantity,
        unit_label: inventory.unit_label,
        inventory_item_ids: inventory.inventory_item_ids,
        available: inventory.stock_quantity > 0,
      };
    });

    return res.json({ products });
  } catch (error) {
    return next(error);
  }
});

router.get("/reviews", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .select("id, buyer_rating, buyer_rating_comment, buyer_rated_at, items:buyer_order_items!buyer_order_items_order_id_fkey(product_name, weight_label), buyer:profiles!buyer_orders_buyer_id_fkey(full_name)")
      .not("buyer_rating", "is", null)
      .eq("order_status", "completed")
      .order("buyer_rated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const reviews = (data || []).map((order) => {
      const name = String(order.buyer?.full_name || "Verified buyer").trim();
      const parts = name.split(/\s+/).filter(Boolean);
      const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0] || "Verified buyer";
      return {
        id: order.id,
        name: displayName,
        rating: order.buyer_rating,
        text: order.buyer_rating_comment || "Verified purchase",
        date: order.buyer_rated_at,
        productSize: order.items?.[0]?.weight_label || "Pineapple",
      };
    });
    return res.json({ reviews });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
