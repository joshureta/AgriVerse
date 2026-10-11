const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const SELLER_ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready_for_delivery", "ready_for_pickup"];
const PAID_STATUSES = ["paid", "refunded"];
const MONTHS_TO_SHOW = 7;

router.use(requireAuth, requireRole("farm_worker"));
router.use((req, res, next) => {
  if (req.profile.worker_category !== "seller") {
    return res.status(403).json({ error: "Only seller accounts can view this dashboard" });
  }
  return next();
});

function monthStart(year, month) {
  return new Date(Date.UTC(year, month, 1));
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function monthSeries(now = new Date()) {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const current = monthStart(local.getUTCFullYear(), local.getUTCMonth());
  return Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const start = monthStart(current.getUTCFullYear(), current.getUTCMonth() - (MONTHS_TO_SHOW - 1 - index));
    const end = monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1);
    return {
      start,
      end,
      label: new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "Asia/Manila" }).format(start),
      gross: 0,
      refunds: 0,
      net: 0,
    };
  });
}

function applyRevenue(series, orders) {
  for (const order of orders || []) {
    const gross = money(order.total_amount);
    const refund = order.payment_status === "refunded"
      ? money(order.refund_amount == null ? gross : order.refund_amount)
      : 0;
    const createdAt = new Date(order.created_at).getTime();
    const bucket = series.find((item) => createdAt >= item.start.getTime() && createdAt < item.end.getTime());
    if (!bucket) continue;
    bucket.gross += gross;
    bucket.refunds += refund;
    bucket.net += Math.max(0, gross - refund);
  }
  return series.map((item) => ({
    label: item.label,
    gross: money(item.gross),
    refunds: money(item.refunds),
    net: money(item.net),
  }));
}

function one(value) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

router.get("/", async (_req, res, next) => {
  try {
    const supabase = getSupabase();
    const series = monthSeries();
    const rangeStart = series[0].start.toISOString();
    const rangeEnd = series[series.length - 1].end.toISOString();
    const [revenueResult, ordersResult, inventoryResult] = await Promise.all([
      supabase.from("buyer_orders")
        .select("id, total_amount, payment_status, refund_amount, created_at")
        .in("payment_status", PAID_STATUSES)
        .gte("created_at", rangeStart)
        .lt("created_at", rangeEnd),
      supabase.from("buyer_orders")
        .select("id, order_number, delivery_full_name, order_status, created_at, items:buyer_order_items!buyer_order_items_order_id_fkey(product_name, quantity)")
        .order("created_at", { ascending: false })
        .limit(4),
      supabase.from("inventory_items")
        .select("id, quantity, pineapple_inventory(size_id, size:pineapple_sizes!pineapple_inventory_size_id_fkey(id, size_name)), category:inventory_categories!inventory_items_inventory_category_id_fkey!inner(code)")
        .is("archived_at", null)
        .eq("category.code", "pineapple")
        .order("id", { ascending: true }),
    ]);
    if (revenueResult.error) throw revenueResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (inventoryResult.error) throw inventoryResult.error;

    const revenue = applyRevenue(series, revenueResult.data);
    const current = revenue[revenue.length - 1];
    const previous = revenue[revenue.length - 2];
    const changePercent = previous.net ? Math.round((current.net - previous.net) / previous.net * 1000) / 10 : null;
    const inventoryBySize = new Map();
    for (const item of inventoryResult.data || []) {
      const pineapple = one(item.pineapple_inventory);
      const size = pineapple?.size?.size_name || "Other";
      inventoryBySize.set(size, (inventoryBySize.get(size) || 0) + Number(item.quantity || 0));
    }
    const inventory = [...inventoryBySize.entries()].map(([size, quantity]) => ({ size, quantity }));
    const stockTotal = inventory.reduce((total, item) => total + item.quantity, 0);
    const currentMonthStart = series[series.length - 1].start.toISOString();
    const currentMonthEnd = series[series.length - 1].end.toISOString();
    const pendingResult = await supabase.from("buyer_orders")
      .select("id", { count: "exact", head: true })
      .in("order_status", SELLER_ORDER_STATUSES);
    if (pendingResult.error) throw pendingResult.error;
    const monthlyOrders = (revenueResult.data || []).filter((order) => order.created_at >= currentMonthStart && order.created_at < currentMonthEnd).length;

    return res.json({
      stats: {
        stock_total: stockTotal,
        sales_this_month: current.net,
        pending_orders: pendingResult.count || 0,
        monthly_paid_orders: monthlyOrders,
      },
      revenue: {
        period_label: "Last 7 months",
        series: revenue,
        change_percent: changePercent,
      },
      orders: (ordersResult.data || []).map((order) => ({
        id: order.id,
        order_number: order.order_number,
        customer: order.delivery_full_name,
        quantity: (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0),
        status: order.order_status,
        created_at: order.created_at,
      })),
      inventory,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.monthSeries = monthSeries;
module.exports.applyRevenue = applyRevenue;
