const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

router.post("/", async (req, res, next) => {
  try {
    const deliveryMethod = String(req.body.delivery_method || "");
    const paymentMethod = String(req.body.payment_method || "");
    const note = String(req.body.customer_note || "").trim();
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!['delivery', 'pickup'].includes(deliveryMethod)) throw httpError(400, "Select a valid delivery method");
    if (!['cash', 'bank', 'gcash'].includes(paymentMethod)) throw httpError(400, "Select a valid payment method");
    if (note.length > 1000) throw httpError(400, "Additional information must not exceed 1000 characters");
    if (items.length < 1 || items.length > 20) throw httpError(400, "The shopping cart is empty or invalid");

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
    });

    if (error) {
      if (/insufficient stock/i.test(error.message || "")) throw httpError(409, error.message);
      if (/shopping cart|quantity|product|delivery method|payment method/i.test(error.message || "")) {
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
