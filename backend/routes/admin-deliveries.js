const express = require("express");
const { randomUUID } = require("node:crypto");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { createDeliveryAssignedNotification, createDeliveryScheduleUpdatedNotification, createDisputeResolvedNotification, createRefundRejectedNotification } = require("../lib/order-notifications");
const { paymongoGet } = require("../lib/paymongo");
const { refundCentavos, resolvePaidPayment, submitApprovedRefund, applyRefundResource, getRefundResource } = require("../lib/order-refunds");
const { httpError } = require("../lib/http-error");

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

function orderId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid order ID"); return id; }
function driverId(value) { const id = String(value || "").trim(); if (!/^[0-9a-f-]{36}$/i.test(id)) throw httpError(400, "Select a valid driver"); return id; }
function date(value) { const result = String(value || "").trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw httpError(400, "Select a delivery date"); return result; }
function time(value) { const result = String(value || "").trim(); if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(result)) throw httpError(400, "Select a valid delivery time"); return result; }
function vehicleRecordId(value) { const id = Number(value); if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Invalid vehicle ID"); return id; }

const VEHICLE_STATUSES = ["available", "in_use", "maintenance", "inactive"];
function vehicleName(value) { const result = String(value || "").trim(); if (!result) throw httpError(400, "Enter a vehicle name"); if (result.length > 120) throw httpError(400, "Vehicle name must not exceed 120 characters"); return result; }
function plateNumber(value) { const result = String(value || "").trim(); if (!result) throw httpError(400, "Enter a plate number"); if (result.length > 30) throw httpError(400, "Plate number must not exceed 30 characters"); return result; }

function readSchedule(body) {
  const scheduleDate = date(body.delivery_date);
  const start = time(body.start_time);
  const end = time(body.end_time);
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  if (startMinutes < 420 || endMinutes > 1080 || endMinutes <= startMinutes) {
    throw httpError(400, "Deliveries must be scheduled between 7:00 AM and 6:00 PM");
  }
  return { start: `${scheduleDate}T${start}:00+08:00`, end: `${scheduleDate}T${end}:00+08:00` };
}

router.get("/ready-orders", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, delivery_full_name, delivery_mobile_number, delivery_city_municipality, delivery_barangay, order_status")
      .eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").is("assigned_driver_id", null)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.get("/vehicles", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("delivery_vehicles")
      .select("id, vehicle_name, plate_number, status").order("vehicle_name");
    if (error) throw error;
    return res.json({ vehicles: data || [] });
  } catch (error) { return next(error); }
});

router.post("/vehicles", async (req, res, next) => {
  try {
    const insert = {
      vehicle_name: vehicleName(req.body.vehicle_name),
      plate_number: plateNumber(req.body.plate_number),
      status: VEHICLE_STATUSES.includes(req.body.status) ? req.body.status : "available",
    };
    const { data, error } = await getSupabase().from("delivery_vehicles").insert(insert)
      .select("id, vehicle_name, plate_number, status").single();
    if (error) {
      if (error.code === "23505") throw httpError(409, "A vehicle with this plate number already exists");
      throw error;
    }
    return res.status(201).json({ vehicle: data });
  } catch (error) { return next(error); }
});

router.patch("/vehicles/:id", async (req, res, next) => {
  try {
    const id = vehicleRecordId(req.params.id);
    const update = {};
    if (req.body.vehicle_name !== undefined) update.vehicle_name = vehicleName(req.body.vehicle_name);
    if (req.body.plate_number !== undefined) update.plate_number = plateNumber(req.body.plate_number);
    if (req.body.status !== undefined) {
      if (!VEHICLE_STATUSES.includes(req.body.status)) throw httpError(400, "Select a valid status");
      update.status = req.body.status;
    }
    if (!Object.keys(update).length) throw httpError(400, "Nothing to update");
    const { data, error } = await getSupabase().from("delivery_vehicles").update(update)
      .eq("id", id).select("id, vehicle_name, plate_number, status").maybeSingle();
    if (error) {
      if (error.code === "23505") throw httpError(409, "A vehicle with this plate number already exists");
      throw error;
    }
    if (!data) throw httpError(404, "Vehicle not found");
    return res.json({ vehicle: data });
  } catch (error) { return next(error); }
});

router.get("/assigned-orders", async (req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("buyer_orders")
      .select("id, order_number, total_amount, payment_method, payment_status, order_status, assigned_driver_id, assigned_vehicle_id, delivery_assignment_status, delivery_full_name, delivery_mobile_number, delivery_region, delivery_province, delivery_city_municipality, delivery_barangay, delivery_scheduled_at, delivery_window_end_at, driver_assigned_at, delivery_accepted_at, delivery_picked_up_at, delivered_at, delivery_proof_image_url, delivery_proof_notes, delivery_proof_submitted_at, assigned_driver:profiles!buyer_orders_assigned_driver_id_fkey(id, full_name), assigned_vehicle:delivery_vehicles(id, vehicle_name, plate_number), items:buyer_order_items!buyer_order_items_order_id_fkey(id, product_name, weight_label, quantity, unit_price, line_total)")
      .not("assigned_driver_id", "is", null).order("delivery_scheduled_at", { ascending: true });
    if (error) throw error;
    return res.json({ orders: data || [] });
  } catch (error) { return next(error); }
});

router.post("/:id/assign", async (req, res, next) => {
  try {
    const assignedDriverId = driverId(req.body.driver_id);
    const schedule = readSchedule(req.body);
    const { data: driver, error: driverError } = await getSupabase().from("profiles").select("id")
      .eq("id", assignedDriverId).eq("role", "farm_worker").eq("worker_category", "driver").single();
    if (driverError || !driver) throw httpError(400, "The selected worker is not a driver");
    const { data, error } = await getSupabase().from("buyer_orders")
      .update({ assigned_driver_id: assignedDriverId, assigned_vehicle_id: null, delivery_assignment_status: 'assigned', delivery_accepted_at: null, delivery_picked_up_at: null, delivery_scheduled_at: schedule.start, delivery_window_end_at: schedule.end, driver_assigned_at: new Date().toISOString() })
      .eq("id", orderId(req.params.id)).eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").is("assigned_driver_id", null)
      .select("id, order_number, assigned_driver_id, delivery_scheduled_at, delivery_window_end_at").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This order is no longer ready for driver assignment");
    await createDeliveryAssignedNotification({ driverId: data.assigned_driver_id, orderId: data.id, orderNumber: data.order_number });
    return res.status(201).json({ order: data });
  } catch (error) { return next(error); }
});

const disputeSelect = [
  "id, order_number, total_amount, payment_method, payment_status, order_status, refund_status, refund_reference, refund_error, refund_decision_notes, refund_decided_at, paymongo_payment_id, paymongo_refund_id",
  "delivery_full_name, delivery_mobile_number, delivery_city_municipality, delivery_barangay, cancelled_at",
  "delivery_proof_image_url, delivery_proof_notes, delivery_proof_submitted_at",
  "delivery_dispute_reason, delivery_dispute_created_at, delivery_dispute_category, delivery_dispute_affected_quantity",
  "delivery_dispute_photo_urls, delivery_dispute_responsible_role, delivery_dispute_responder_id, delivery_dispute_response, delivery_dispute_response_at",
  "delivery_dispute_status, delivery_dispute_resolution, delivery_dispute_resolution_notes, delivery_dispute_resolved_at, refund_amount",
  "assigned_driver:profiles!buyer_orders_assigned_driver_id_fkey(id, full_name)",
  "disputed_item:buyer_order_items!buyer_orders_delivery_dispute_item_id_fkey(id, product_name, quantity, unit_price)",
].join(",");

const legacyDisputeSelect = disputeSelect.split(",").filter((field) => ![
  "refund_status", "refund_error", "refund_decision_notes", "refund_decided_at", "paymongo_payment_id", "paymongo_refund_id",
].includes(field.trim())).join(",");

async function hasRefundSchema(supabase) {
  const { error } = await supabase.from("buyer_orders").select("refund_status").limit(1);
  if (error?.code === "42703") {
    console.warn("Refund review fields are unavailable. Apply migration 042_admin_paymongo_refunds.sql:", error);
    return false;
  }
  if (error) throw error;
  return true;
}

async function requireRefundSchema(supabase) {
  if (!await hasRefundSchema(supabase)) {
    throw httpError(503, "Refund reviews need database update 042 before they can be used");
  }
}

router.get("/disputes", async (req, res, next) => {
  try {
    const supabase = getSupabase();
    const refundSchemaReady = await hasRefundSchema(supabase);
    const select = refundSchemaReady ? disputeSelect : legacyDisputeSelect;
    // Open and resolved disputes share one list (the page filters by delivery_dispute_status).
    // Open ones are never capped; resolved history is limited to the most recent.
    const [openResult, resolvedResult, cancellationResult] = await Promise.all([
      supabase.from("buyer_orders").select(select)
        .eq("delivery_dispute_status", "open").order("delivery_dispute_created_at", { ascending: false }),
      supabase.from("buyer_orders").select(select)
        .eq("delivery_dispute_status", "resolved").order("delivery_dispute_resolved_at", { ascending: false }).limit(100),
      refundSchemaReady
        ? supabase.from("buyer_orders").select(select)
          .eq("order_status", "cancelled").not("refund_status", "is", null)
          .order("cancelled_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (openResult.error) throw openResult.error;
    if (resolvedResult.error) throw resolvedResult.error;
    if (cancellationResult.error) throw cancellationResult.error;
    const cancellations = cancellationResult.data || [];
    const cancellationIds = cancellations.map((order) => order.id);
    const cancellationReasons = {};
    if (cancellationIds.length) {
      const { data: history, error } = await supabase.from("buyer_order_status_history")
        .select("order_id, note").in("order_id", cancellationIds).eq("new_status", "cancelled");
      if (error) throw error;
      for (const entry of history || []) cancellationReasons[entry.order_id] = entry.note;
    }
    const orders = [
      ...(openResult.data || []),
      ...(resolvedResult.data || []),
      ...cancellations.map((order) => ({ ...order, cancellation_reason: cancellationReasons[order.id] || null, review_type: "cancellation" })),
    ];

    // Local test backends may not have a public webhook URL. Refresh in-flight
    // refunds when an admin opens the review queue so their outcome is visible.
    await Promise.allSettled(orders.filter((order) => order.refund_status === "processing" && order.paymongo_refund_id).slice(0, 10)
      .map(async (order) => {
        const refund = await getRefundResource(order);
        await applyRefundResource(order.id, refund.data);
        const { data: refreshed, error } = await supabase.from("buyer_orders")
          .select(disputeSelect).eq("id", order.id).single();
        if (error) throw error;
        Object.assign(order, refreshed);
      }));

    // The driver comes straight off the order, but there's no per-order seller
    // column — so "who prepared this" is read off the status-history trail instead.
    const sellerOrderIds = orders.filter((order) => order.delivery_dispute_responsible_role === "seller").map((order) => order.id);
    const sellerByOrderId = {};
    if (sellerOrderIds.length > 0) {
      const { data: history, error: historyError } = await supabase.from("buyer_order_status_history")
        .select("order_id, created_at, seller:profiles!buyer_order_status_history_changed_by_fkey(id, full_name)")
        .in("order_id", sellerOrderIds).in("new_status", ["confirmed", "preparing"]).not("changed_by", "is", null)
        .order("created_at", { ascending: true });
      if (historyError) throw historyError;
      for (const row of history || []) {
        if (!sellerByOrderId[row.order_id] && row.seller) sellerByOrderId[row.order_id] = row.seller;
      }
    }

    return res.json({ refund_setup_required: !refundSchemaReady, orders: orders.map((order) => ({ ...order, responsible_seller: sellerByOrderId[order.id] || null })) });
  } catch (error) { return next(error); }
});

router.post("/:id/resolve-cancellation-refund", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const decision = String(req.body.decision || "").trim();
    if (!["approved", "rejected"].includes(decision)) throw httpError(400, "Select a refund decision");
    const notes = String(req.body.notes || "").trim();
    if (!notes || notes.length > 1000) throw httpError(400, "Enter a decision note of up to 1000 characters");
    const supabase = getSupabase();
    await requireRefundSchema(supabase);
    const { data: order, error: lookupError } = await supabase.from("buyer_orders")
      .select("id, buyer_id, order_number, order_status, payment_method, payment_status, total_amount, refund_amount, refund_status, paymongo_payment_intent_id, paymongo_payment_id")
      .eq("id", id).eq("order_status", "cancelled").eq("refund_status", "requested").maybeSingle();
    if (lookupError) throw lookupError;
    if (!order) throw httpError(409, "This cancellation refund is no longer awaiting review");
    if (!["gcash", "qrph"].includes(order.payment_method) || Number(order.refund_amount) !== Number(order.total_amount)) {
      throw httpError(409, "This cancellation refund needs manual review");
    }

    const update = {
      refund_status: decision === "approved" ? "submitting" : "rejected",
      refund_decided_by: req.user.id,
      refund_decided_at: new Date().toISOString(),
      refund_decision_notes: notes,
      refund_error: null,
    };
    if (decision === "approved") {
      update.paymongo_payment_id = await resolvePaidPayment(order, refundCentavos(order.refund_amount));
      update.refund_idempotency_key = randomUUID();
    }
    const { data: claimed, error } = await supabase.from("buyer_orders").update(update)
      .eq("id", id).eq("order_status", "cancelled").eq("refund_status", "requested")
      .select("id, order_number, order_status, payment_method, refund_amount, refund_status, refund_idempotency_key, paymongo_payment_id")
      .maybeSingle();
    if (error) throw error;
    if (!claimed) throw httpError(409, "Another admin already reviewed this refund");
    if (decision === "rejected") {
      try {
        await createRefundRejectedNotification({ buyerId: order.buyer_id, orderId: id, orderNumber: order.order_number });
      } catch (notificationError) {
        console.error("Failed to notify buyer of rejected refund:", notificationError.message);
      }
      return res.json({ order: claimed });
    }
    const result = await submitApprovedRefund(claimed);
    return res.json({ order: result });
  } catch (error) { return next(error); }
});

router.post("/:id/retry-refund", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const supabase = getSupabase();
    await requireRefundSchema(supabase);
    const { data: order, error } = await supabase.from("buyer_orders")
      .select("id, order_number, order_status, payment_method, payment_status, refund_amount, refund_status, refund_error, refund_decided_at, refund_idempotency_key, paymongo_payment_intent_id, paymongo_payment_id, paymongo_refund_id")
      .eq("id", id).in("refund_status", ["failed", "review_required", "submitting"]).maybeSingle();
    if (error) throw error;
    if (!order) throw httpError(409, "This refund cannot be retried");

    if (order.paymongo_refund_id) {
      const response = await getRefundResource(order);
      if (response?.data?.attributes?.status !== "failed") {
        const updated = await applyRefundResource(id, response.data);
        return res.json({ order: updated });
      }
    }
    const legacyApproval = order.refund_status === "review_required" && !order.refund_idempotency_key
      && order.refund_error === "Previous application recorded approval without sending a PayMongo refund";
    const uncertain = ["review_required", "submitting"].includes(order.refund_status) && !order.paymongo_refund_id && !legacyApproval;
    const elapsed = Date.now() - new Date(order.refund_decided_at).getTime();
    if (order.refund_status === "submitting" && elapsed < 2 * 60 * 1000) {
      throw httpError(409, "This refund is still being submitted. Check again shortly");
    }
    if (order.payment_method === "qrph" && uncertain) {
      throw httpError(409, "Check the QR Ph payment in PayMongo before another refund attempt. Its refund API does not safely deduplicate retries.");
    }
    const paymentId = await resolvePaidPayment(order, refundCentavos(order.refund_amount));
    const keyExpired = !Number.isFinite(elapsed) || elapsed > 23 * 60 * 60 * 1000;
    if (legacyApproval || (uncertain && keyExpired)) {
      const payment = await paymongoGet(`/payments/${encodeURIComponent(paymentId)}`);
      const refundIds = (payment?.data?.attributes?.refunds || []).map((refund) => typeof refund === "string" ? refund : refund?.id).filter(Boolean);
      if (refundIds.length === 1) {
        const existing = await paymongoGet(`/refunds/${encodeURIComponent(refundIds[0])}`);
        return res.json({ order: await applyRefundResource(id, existing.data) });
      }
      if (refundIds.length > 1) {
        throw httpError(409, "Multiple PayMongo refunds exist for this payment. Review them before retrying");
      }
    }
    const update = {
      refund_status: "submitting",
      refund_error: null,
      paymongo_payment_id: paymentId,
      paymongo_refund_id: null,
      refund_reference: null,
      refund_idempotency_key: uncertain && !keyExpired ? order.refund_idempotency_key : randomUUID(),
    };
    const { data: claimed, error: claimError } = await supabase.from("buyer_orders").update(update)
      .eq("id", id).eq("refund_status", order.refund_status)
      .select("id, order_number, order_status, payment_method, refund_amount, refund_status, refund_idempotency_key, paymongo_payment_id")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) throw httpError(409, "Another admin is already retrying this refund");
    return res.json({ order: await submitApprovedRefund(claimed) });
  } catch (error) { return next(error); }
});

router.post("/:id/check-refund", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    await requireRefundSchema(getSupabase());
    const { data: order, error } = await getSupabase().from("buyer_orders")
      .select("id, payment_method, paymongo_payment_id, paymongo_refund_id, refund_status")
      .eq("id", id).in("refund_status", ["processing", "failed", "review_required"]).maybeSingle();
    if (error) throw error;
    if (!order?.paymongo_refund_id) throw httpError(409, "No PayMongo refund reference is available to check");
    const refund = await getRefundResource(order);
    return res.json({ order: await applyRefundResource(id, refund.data) });
  } catch (error) { return next(error); }
});

router.post("/:id/resolve-dispute", async (req, res, next) => {
  try {
    const id = orderId(req.params.id);
    const resolution = String(req.body.resolution || "").trim();
    if (!["refunded", "dismissed"].includes(resolution)) throw httpError(400, "Select a valid resolution");
    const notes = String(req.body.notes || "").trim();
    if (!notes) throw httpError(400, "A resolution note is required");
    if (notes.length > 1000) throw httpError(400, "Resolution note must not exceed 1000 characters");

    const supabase = getSupabase();
    const refundSchemaReady = await hasRefundSchema(supabase);
    const disputeOrderSelect = "id, order_number, buyer_id, order_status, total_amount, payment_method, payment_status, paymongo_payment_intent_id, delivery_dispute_affected_quantity, disputed_item:buyer_order_items!buyer_orders_delivery_dispute_item_id_fkey(unit_price)"
      + (refundSchemaReady ? ", paymongo_payment_id" : "");
    const { data: order, error: orderError } = await supabase.from("buyer_orders")
      .select(disputeOrderSelect)
      // A buyer can also open a dispute on an already-completed order, so both statuses are resolvable.
      .eq("id", id).in("order_status", ["delivered", "completed"]).eq("delivery_dispute_status", "open").maybeSingle();
    if (orderError) throw orderError;
    if (!order) throw httpError(409, "This dispute is no longer open");

    const now = new Date().toISOString();
    const update = {
      delivery_dispute_status: "resolved",
      delivery_dispute_resolution: resolution,
      delivery_dispute_resolved_by: req.user.id,
      delivery_dispute_resolved_at: now,
      delivery_dispute_resolution_notes: notes,
    };
    // Only a still-"delivered" order gets closed out here; a completed order keeps its original completion details.
    if (order.order_status === "delivered") {
      update.order_status = "completed";
      update.completed_at = now;
      update.completed_via = "dispute_resolved";
    }

    if (resolution === "refunded") {
      if (["gcash", "qrph"].includes(order.payment_method) && !refundSchemaReady) {
        throw httpError(503, "Online dispute refunds need database update 042 before they can be approved");
      }
      const defaultAmount = order.disputed_item ? Number(order.disputed_item.unit_price) * Number(order.delivery_dispute_affected_quantity || 0) : NaN;
      const refundAmount = req.body.refund_amount != null && req.body.refund_amount !== "" ? Number(req.body.refund_amount) : defaultAmount;
      if (!Number.isFinite(refundAmount) || refundAmount <= 0) throw httpError(400, "Enter a valid refund amount");
      const orderTotal = Number(order.total_amount);
      if (Number.isFinite(orderTotal) && refundAmount > orderTotal) {
        throw httpError(400, `Refund can't be more than the order total (PHP ${orderTotal.toLocaleString()})`);
      }

      update.refund_amount = refundAmount;
      if (refundSchemaReady) {
        update.refund_decided_by = req.user.id;
        update.refund_decided_at = now;
        update.refund_decision_notes = notes;
      }
      if (["gcash", "qrph"].includes(order.payment_method)) {
        const paymentId = await resolvePaidPayment(order, refundCentavos(refundAmount));
        update.paymongo_payment_id = paymentId;
        update.refund_status = "submitting";
        update.refund_idempotency_key = randomUUID();
        update.refund_reference = null;
        update.refunded_at = null;
        update.refund_error = null;
      } else {
        const refundReference = String(req.body.refund_reference || "").trim();
        if (!refundReference) throw httpError(400, "Add a reference for the completed manual refund before confirming");
        if (refundReference.length > 300) throw httpError(400, "Refund reference must not exceed 300 characters");
        update.payment_status = "refunded";
        if (refundSchemaReady) update.refund_status = "succeeded";
        update.refund_reference = refundReference;
        update.refunded_at = now;
      }
    }

    const { data, error } = await supabase.from("buyer_orders").update(update)
      .eq("id", id).eq("order_status", order.order_status).eq("delivery_dispute_status", "open")
      .select("id, order_number, order_status, payment_method, payment_status, delivery_dispute_status, delivery_dispute_resolution, refund_amount, refund_reference"
        + (refundSchemaReady ? ", refund_status, refund_idempotency_key, paymongo_payment_id" : ""))
      .maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "This dispute is no longer open");

    await supabase.from("buyer_order_status_history").insert({
      order_id: id, previous_status: order.order_status, new_status: "completed", changed_by: req.user.id, note: notes,
    });

    // The decision is already saved, so a failed notification shouldn't turn this into an error response.
    try {
      await createDisputeResolvedNotification({
        buyerId: order.buyer_id, orderId: id, orderNumber: order.order_number, resolution, refundAmount: data.refund_amount,
      });
    } catch (notificationError) {
      console.error("Failed to notify buyer of dispute resolution:", notificationError.message);
    }
    const result = resolution === "refunded" && ["gcash", "qrph"].includes(order.payment_method)
      ? await submitApprovedRefund(data)
      : data;
    return res.json({ order: result });
  } catch (error) { return next(error); }
});

router.patch("/:id/assignment", async (req, res, next) => {
  try {
    const assignedDriverId = driverId(req.body.driver_id);
    const schedule = readSchedule(req.body);
    const { data: driver, error: driverError } = await getSupabase().from("profiles").select("id")
      .eq("id", assignedDriverId).eq("role", "farm_worker").eq("worker_category", "driver").single();
    if (driverError || !driver) throw httpError(400, "The selected worker is not a driver");
    const { data, error } = await getSupabase().from("buyer_orders")
      .update({ assigned_driver_id: assignedDriverId, delivery_scheduled_at: schedule.start, delivery_window_end_at: schedule.end })
      .eq("id", orderId(req.params.id)).eq("delivery_method", "delivery").eq("order_status", "ready_for_delivery").eq("delivery_assignment_status", "assigned")
      .select("id, order_number, assigned_driver_id, delivery_scheduled_at, delivery_window_end_at").maybeSingle();
    if (error) throw error;
    if (!data) throw httpError(409, "Only unaccepted ready-for-delivery orders can be edited");
    await createDeliveryScheduleUpdatedNotification({ driverId: data.assigned_driver_id, orderId: data.id, orderNumber: data.order_number });
    return res.json({ order: data });
  } catch (error) { return next(error); }
});

module.exports = router;
