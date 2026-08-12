const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

const orderSelect = [
  "id, order_number, delivery_method, payment_method, payment_status, order_status",
  "subtotal, shipping_fee, total_amount, customer_note",
  "delivery_full_name, delivery_mobile_number, delivery_country, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay",
  "estimated_delivery_at, confirmed_at, preparing_at, out_for_delivery_at, delivered_at, cancelled_at, created_at, updated_at",
  "items:buyer_order_items(id, pineapple_size_id, product_name, weight_label, quantity, unit_price, line_total)",
].join(",");

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function serializeOrder(order) {
  return {
    ...order,
    subtotal: Number(order.subtotal),
    shipping_fee: Number(order.shipping_fee),
    total_amount: Number(order.total_amount),
    items: (order.items || []).map((item) => ({
      ...item,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })),
  };
}

router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .select(orderSelect)
      .eq("buyer_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return res.json({ orders: (data || []).map(serializeOrder) });
  } catch (error) {
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID");
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .select(orderSelect)
      .eq("id", id)
      .eq("buyer_id", req.user.id)
      .single();
    if (error?.code === "PGRST116") throw httpError(404, "Order not found");
    if (error) throw error;
    return res.json({ order: serializeOrder(data) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const deliveryMethod = String(req.body.delivery_method || "");
    const paymentMethod = String(req.body.payment_method || "");
    const note = String(req.body.customer_note || "").trim();
    const requestedAddress = req.body.delivery_address;
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!['delivery', 'pickup'].includes(deliveryMethod)) throw httpError(400, "Select a valid delivery method");
    if (!['cash', 'bank', 'gcash'].includes(paymentMethod)) throw httpError(400, "Select a valid payment method");
    if (note.length > 1000) throw httpError(400, "Additional information must not exceed 1000 characters");
    if (items.length < 1 || items.length > 20) throw httpError(400, "The shopping cart is empty or invalid");

    let deliveryAddress = null;
    if (requestedAddress != null) {
      if (!requestedAddress || typeof requestedAddress !== "object" || Array.isArray(requestedAddress)) {
        throw httpError(400, "The delivery address is invalid");
      }
      const fields = ['full_name', 'mobile_number', 'country', 'region', 'province', 'city_municipality', 'barangay'];
      deliveryAddress = Object.fromEntries(fields.map((field) => [field, String(requestedAddress[field] || "").trim()]));
      if (fields.some((field) => deliveryAddress[field].length > 150)) throw httpError(400, "A delivery address field is too long");
      if (deliveryMethod === 'delivery' && ['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay'].some((field) => !deliveryAddress[field])) {
        throw httpError(400, "Complete the recipient and delivery address");
      }
    }

    const productIds = new Set();
    const normalizedItems = items.map((item) => {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isSafeInteger(productId) || productId < 1 || !Number.isSafeInteger(quantity) || quantity < 1) {
        throw httpError(400, "The shopping cart contains an invalid product or quantity");
      }
      if (productIds.has(productId)) throw httpError(400, "The shopping cart contains a duplicate product");
      productIds.add(productId);
      return { product_id: productId, quantity };
    });

    const { data, error } = await getSupabase().rpc("place_buyer_order", {
      p_buyer_id: req.user.id,
      p_delivery_method: deliveryMethod,
      p_payment_method: paymentMethod,
      p_customer_note: note || null,
      p_items: normalizedItems,
      p_delivery_address: deliveryAddress,
    });

    if (error) {
      if (/insufficient stock/i.test(error.message || "")) throw httpError(409, error.message);
      if (/shopping cart|quantity|product|delivery method|payment method|delivery address|recipient/i.test(error.message || "")) {
        throw httpError(400, error.message);
      }
      throw error;
    }

    return res.status(201).json({ order: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
