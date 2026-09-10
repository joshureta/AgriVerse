const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { paymongoGet } = require("../lib/paymongo");
const { uploadImage } = require("../lib/storage");

const router = express.Router();
router.use(requireAuth, requireRole("buyer"));

const orderSelect = [
  "id, order_number, delivery_method, payment_method, payment_status, order_status",
  "subtotal, shipping_fee, total_amount, customer_note",
  "delivery_full_name, delivery_mobile_number, delivery_country, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay",
  "estimated_delivery_at, confirmed_at, preparing_at, ready_for_delivery_at, out_for_delivery_at, delivered_at, cancelled_at, created_at, updated_at",
  "paymongo_payment_intent_id",
  "delivery_proof_image_url, delivery_proof_notes, delivery_proof_submitted_at",
  "buyer_confirmed_at, delivery_dispute_status, delivery_dispute_reason, delivery_dispute_created_at, delivery_dispute_resolution, delivery_dispute_resolution_notes",
  "delivery_dispute_category, delivery_dispute_item_id, delivery_dispute_affected_quantity, delivery_dispute_photo_urls, delivery_dispute_responsible_role",
  "delivery_dispute_responder_id, delivery_dispute_response, delivery_dispute_response_at",
  "refund_amount, refund_reference, refunded_at",
  "buyer_rating, buyer_rating_comment, buyer_rated_at",
  "completed_at, completed_via",
  "items:buyer_order_items!buyer_order_items_order_id_fkey(id, pineapple_size_id, product_name, weight_label, quantity, unit_price, line_total)",
].join(",");

// A delivered order auto-completes if the buyer never confirms or disputes it.
const AUTO_COMPLETE_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

// Webhooks are the primary way payment_status gets updated, but they can't reach a
// backend that PayMongo can't route to (e.g. local dev without a public tunnel) and
// can occasionally be missed in production. As a fallback, whenever a buyer looks up
// a still-pending GCash order we also ask PayMongo directly and reconcile.
async function reconcileGcashPaymentStatus(order) {
  if (order.payment_method !== "gcash" || order.payment_status !== "pending" || !order.paymongo_payment_intent_id) {
    return order;
  }
  try {
    const intent = await paymongoGet(`/payment_intents/${order.paymongo_payment_intent_id}`);
    const attributes = intent?.data?.attributes;
    const nextStatus = attributes?.status === "succeeded"
      ? "paid"
      : attributes?.status === "awaiting_payment_method" && attributes?.last_payment_error
        ? "failed"
        : null;
    if (!nextStatus) return order;

    const { data: updated, error } = await getSupabase()
      .from("buyer_orders")
      .update({ payment_status: nextStatus })
      .eq("id", order.id)
      .eq("payment_status", "pending")
      .select(orderSelect)
      .single();
    return error ? order : updated;
  } catch {
    return order;
  }
}

// If the buyer never confirms or disputes a delivered order within the window,
// it auto-completes the next time they look at it (same idea as reconcileGcashPaymentStatus above).
async function reconcileDeliveryCompletion(order) {
  if (order.order_status !== "delivered" || order.delivery_dispute_status || order.buyer_confirmed_at || !order.delivery_proof_submitted_at) {
    return order;
  }
  const submittedAt = new Date(order.delivery_proof_submitted_at).getTime();
  if (Number.isNaN(submittedAt) || Date.now() - submittedAt < AUTO_COMPLETE_AFTER_MS) return order;

  const now = new Date().toISOString();
  const { data: updated, error } = await getSupabase()
    .from("buyer_orders")
    .update({ order_status: "completed", completed_at: now, completed_via: "auto_timeout" })
    .eq("id", order.id)
    .eq("order_status", "delivered")
    .is("delivery_dispute_status", null)
    .select(orderSelect)
    .single();
  if (error || !updated) return order;

  await getSupabase().from("buyer_order_status_history").insert({
    order_id: order.id,
    previous_status: "delivered",
    new_status: "completed",
    changed_by: null,
    note: "Auto-completed: buyer did not respond within the confirmation window",
  });
  return updated;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function serializeOrder(order) {
  const { paymongo_payment_intent_id, ...rest } = order;
  return {
    ...rest,
    subtotal: Number(order.subtotal),
    shipping_fee: Number(order.shipping_fee),
    total_amount: Number(order.total_amount),
    refund_amount: order.refund_amount == null ? null : Number(order.refund_amount),
    items: (order.items || []).map((item) => ({
      ...item,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })),
  };
}

// Handling problems happened after pickup, so the driver has context to add.
// Quality/fulfillment problems happened before dispatch, so the seller does instead.
const DISPUTE_CATEGORIES = {
  damaged: "driver",
  wrong_item: "driver",
  missing_item: "driver",
  spoiled_rotten: "seller",
  wrong_quantity: "seller",
};

const addressFields = ['full_name', 'mobile_number', 'country', 'region', 'province', 'city_municipality', 'barangay'];

function readDeliveryAddress(body) {
  const address = Object.fromEntries(addressFields.map((field) => [field, String(body?.[field] || "").trim()]));
  if (addressFields.some((field) => address[field].length > 150)) throw httpError(400, "A delivery address field is too long");
  if (['full_name', 'mobile_number', 'country', 'region', 'city_municipality', 'barangay'].some((field) => !address[field])) {
    throw httpError(400, "Complete the recipient and delivery address");
  }
  return address;
}

router.get("/addresses", async (req, res, next) => {
  try {
    const [{ data, error }, { data: preference, error: preferenceError }] = await Promise.all([
      getSupabase()
      .from("buyer_delivery_addresses")
      .select("id, label, full_name, mobile_number, country, region, province, city_municipality, barangay, created_at")
      .eq("buyer_id", req.user.id)
      .order("created_at", { ascending: true }),
      getSupabase()
        .from("profiles")
        .select("default_delivery_address_id, delivery_address_confirmed_at")
        .eq("id", req.user.id)
        .single(),
    ]);
    if (error) throw error;
    if (preferenceError) throw preferenceError;
    return res.json({
      addresses: data || [],
      default_address_id: preference.default_delivery_address_id,
      address_confirmed_at: preference.delivery_address_confirmed_at,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/addresses", async (req, res, next) => {
  try {
    const address = readDeliveryAddress(req.body);
    const label = String(req.body?.label || "New address").trim().slice(0, 50) || "New address";
    const { data, error } = await getSupabase()
      .from("buyer_delivery_addresses")
      .insert({ buyer_id: req.user.id, label, ...address })
      .select("id, label, full_name, mobile_number, country, region, province, city_municipality, barangay, created_at")
      .single();
    if (error?.code === "23505") throw httpError(409, "This delivery address is already saved");
    if (error) throw error;
    return res.status(201).json({ address: data });
  } catch (error) {
    return next(error);
  }
});

router.post("/addresses/default", async (req, res, next) => {
  try {
    const requestedId = req.body?.address_id;
    let defaultAddressId = null;
    if (requestedId !== "saved") {
      const { data: address, error: addressError } = await getSupabase()
        .from("buyer_delivery_addresses")
        .select("id")
        .eq("id", String(requestedId || ""))
        .eq("buyer_id", req.user.id)
        .single();
      if (addressError?.code === "PGRST116") throw httpError(404, "Delivery address not found");
      if (addressError) throw addressError;
      defaultAddressId = address.id;
    }
    const confirmedAt = new Date().toISOString();
    const { error } = await getSupabase()
      .from("profiles")
      .update({ default_delivery_address_id: defaultAddressId, delivery_address_confirmed_at: confirmedAt })
      .eq("id", req.user.id);
    if (error) throw error;
    return res.json({ default_address_id: defaultAddressId, address_confirmed_at: confirmedAt });
  } catch (error) {
    return next(error);
  }
});

router.delete("/addresses/:addressId", async (req, res, next) => {
  try {
    const addressId = String(req.params.addressId || "");
    const { data: profile, error: profileError } = await getSupabase()
      .from("profiles")
      .select("default_delivery_address_id")
      .eq("id", req.user.id)
      .single();
    if (profileError) throw profileError;
    const { error } = await getSupabase()
      .from("buyer_delivery_addresses")
      .delete()
      .eq("id", addressId)
      .eq("buyer_id", req.user.id);
    if (error) throw error;
    if (profile.default_delivery_address_id === addressId) {
      const { error: resetError } = await getSupabase()
        .from("profiles")
        .update({ default_delivery_address_id: null, delivery_address_confirmed_at: null })
        .eq("id", req.user.id);
      if (resetError) throw resetError;
    }
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

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
    const paymentReconciledOrder = await reconcileGcashPaymentStatus(data);
    const reconciledOrder = await reconcileDeliveryCompletion(paymentReconciledOrder);
    return res.json({ order: serializeOrder(reconciledOrder) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/confirm-receipt", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID");
    const now = new Date().toISOString();
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .update({ order_status: "completed", buyer_confirmed_at: now, completed_at: now, completed_via: "buyer_confirmed" })
      .eq("id", id)
      .eq("buyer_id", req.user.id)
      .eq("order_status", "delivered")
      .is("delivery_dispute_status", null)
      .select(orderSelect)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This order cannot be confirmed right now");

    await getSupabase().from("buyer_order_status_history").insert({
      order_id: id,
      previous_status: "delivered",
      new_status: "completed",
      changed_by: req.user.id,
      note: "Buyer confirmed receipt",
    });
    return res.json({ order: serializeOrder(data) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/dispute", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID");

    const category = String(req.body.category || "").trim();
    if (!Object.prototype.hasOwnProperty.call(DISPUTE_CATEGORIES, category)) {
      throw httpError(400, "Select what happened to this order");
    }
    const responsibleRole = DISPUTE_CATEGORIES[category];

    const reason = String(req.body.reason || "").trim();
    if (!reason) throw httpError(400, "Describe what went wrong with this delivery");
    if (reason.length > 1000) throw httpError(400, "Description must not exceed 1000 characters");

    const itemId = Number(req.body.item_id);
    if (!Number.isSafeInteger(itemId) || itemId < 1) throw httpError(400, "Select which item this affects");

    const affectedQuantity = Number(req.body.affected_quantity);
    if (!Number.isSafeInteger(affectedQuantity) || affectedQuantity < 1) throw httpError(400, "Enter how many were affected");

    const photos = Array.isArray(req.body.photos) ? req.body.photos.slice(0, 6) : [];
    if (photos.length === 0) throw httpError(400, "At least one photo is required for this request");

    const supabase = getSupabase();

    const { data: item, error: itemError } = await supabase
      .from("buyer_order_items")
      .select("id, order_id, quantity")
      .eq("id", itemId)
      .eq("order_id", id)
      .maybeSingle();
    if (itemError) throw itemError;
    if (!item) throw httpError(400, "That item isn't part of this order");
    if (affectedQuantity > item.quantity) throw httpError(400, `Only ${item.quantity} were ordered — affected quantity can't be more than that`);

    const { data: order, error: orderLookupError } = await supabase
      .from("buyer_orders")
      .select("id, order_number, order_status, delivery_dispute_status")
      .eq("id", id)
      .eq("buyer_id", req.user.id)
      .maybeSingle();
    if (orderLookupError) throw orderLookupError;
    if (!order || !["delivered", "completed"].includes(order.order_status) || order.delivery_dispute_status) {
      throw httpError(409, "This order cannot be reported right now");
    }

    const photoUrls = [];
    for (const photo of photos) {
      const rawImage = String(photo?.data || "").trim();
      if (!rawImage) continue;
      const mimeType = String(photo?.mime || "image/jpeg");
      const base64Data = rawImage.replace(/^data:[^;]+;base64,/, "").trim();
      if (!base64Data) continue;
      const uploadResult = await uploadImage("dispute-evidence", base64Data, mimeType, order.order_number);
      if (uploadResult?.imageUrl) photoUrls.push(uploadResult.imageUrl);
    }
    if (photoUrls.length === 0) throw httpError(502, "Could not upload the photo evidence, please try again");

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("buyer_orders")
      .update({
        delivery_dispute_status: "open",
        delivery_dispute_reason: reason,
        delivery_dispute_created_at: now,
        delivery_dispute_category: category,
        delivery_dispute_item_id: itemId,
        delivery_dispute_affected_quantity: affectedQuantity,
        delivery_dispute_photo_urls: photoUrls,
        delivery_dispute_responsible_role: responsibleRole,
      })
      .eq("id", id)
      .eq("buyer_id", req.user.id)
      .in("order_status", ["delivered", "completed"])
      .is("delivery_dispute_status", null)
      .select(orderSelect)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This order cannot be reported right now");
    return res.json({ order: serializeOrder(data) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/rating", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID");
    const rating = Number(req.body.rating);
    if (!Number.isSafeInteger(rating) || rating < 1 || rating > 5) throw httpError(400, "Choose a rating from 1 to 5");
    const comment = String(req.body.comment || "").trim();
    if (comment.length > 500) throw httpError(400, "Rating comment must not exceed 500 characters");
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .update({ buyer_rating: rating, buyer_rating_comment: comment || null, buyer_rated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("buyer_id", req.user.id)
      .eq("order_status", "completed")
      .select(orderSelect)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Only completed orders can be rated");
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
      const fields = addressFields;
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

    const orderArguments = {
      p_buyer_id: req.user.id,
      p_delivery_method: deliveryMethod,
      p_payment_method: paymentMethod,
      p_customer_note: note || null,
      p_items: normalizedItems,
      p_delivery_address: deliveryAddress,
    };
    let { data, error } = await getSupabase().rpc("place_buyer_order", orderArguments);

    const missingNewOrderFunction = error && (
      error.code === "PGRST202"
      || (/place_buyer_order/i.test(error.message || "")
        && /p_delivery_address|schema cache|could not find/i.test(error.message || ""))
    );
    if (missingNewOrderFunction && deliveryAddress == null) {
      const legacyArguments = { ...orderArguments };
      delete legacyArguments.p_delivery_address;
      ({ data, error } = await getSupabase().rpc("place_buyer_order", legacyArguments));
    } else if (missingNewOrderFunction) {
      throw httpError(503, "Run Supabase migration 009_buyer_alternate_delivery_address.sql to use another delivery address");
    }

    if (error) {
      if (/insufficient stock/i.test(error.message || "")) throw httpError(409, error.message);
      if (error.code === "PGRST202" || /place_buyer_order.*schema cache/i.test(error.message || "")) {
        throw httpError(503, "The Supabase order function is not installed. Run buyer order migrations 006 through 009, then restart the backend");
      }
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
