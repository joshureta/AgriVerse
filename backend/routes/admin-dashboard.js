const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");

const router = express.Router();
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_PERIODS = new Set(["week", "month", "year"]);

router.use(requireAuth, requireRole("admin"));

function manilaInstant(year, month, day) {
  return new Date(Date.UTC(year, month, day) - MANILA_OFFSET_MS);
}

function revenuePeriod(period, now = new Date()) {
  const manila = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = manila.getUTCFullYear();
  const month = manila.getUTCMonth();
  const day = manila.getUTCDate();

  if (period === "week") {
    const daysSinceMonday = (manila.getUTCDay() + 6) % 7;
    const localMonday = new Date(Date.UTC(year, month, day) - daysSinceMonday * DAY_MS);
    const start = manilaInstant(localMonday.getUTCFullYear(), localMonday.getUTCMonth(), localMonday.getUTCDate());
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const bucketStart = new Date(start.getTime() + index * DAY_MS);
      return {
        label: new Intl.DateTimeFormat("en-PH", { weekday: "short", timeZone: "Asia/Manila" }).format(bucketStart),
        start: bucketStart,
        end: new Date(bucketStart.getTime() + DAY_MS),
      };
    });
    return {
      start,
      end: new Date(start.getTime() + 7 * DAY_MS),
      label: `Week of ${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(start)}`,
      buckets,
    };
  }

  if (period === "year") {
    const start = manilaInstant(year, 0, 1);
    const buckets = Array.from({ length: 12 }, (_, index) => ({
      label: new Intl.DateTimeFormat("en-PH", { month: "short", timeZone: "Asia/Manila" }).format(manilaInstant(year, index, 1)),
      start: manilaInstant(year, index, 1),
      end: manilaInstant(year, index + 1, 1),
    }));
    return { start, end: manilaInstant(year + 1, 0, 1), label: String(year), buckets };
  }

  const start = manilaInstant(year, month, 1);
  const end = manilaInstant(year, month + 1, 1);
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const buckets = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
    const startDay = index * 7 + 1;
    const endDay = Math.min(startDay + 6, daysInMonth);
    return {
      label: `${startDay}–${endDay}`,
      start: manilaInstant(year, month, startDay),
      end: manilaInstant(year, month, endDay + 1),
    };
  });
  return {
    start,
    end,
    label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(start),
    buckets,
  };
}

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

router.get("/revenue", async (req, res, next) => {
  try {
    const period = String(req.query.period || "month").toLowerCase();
    if (!VALID_PERIODS.has(period)) {
      const error = new Error("Revenue period must be week, month, or year");
      error.status = 400;
      throw error;
    }

    const range = revenuePeriod(period);
    const { data, error } = await getSupabase()
      .from("buyer_orders")
      .select("id, total_amount, payment_status, refund_amount, created_at")
      .in("payment_status", ["paid", "refunded"])
      .gte("created_at", range.start.toISOString())
      .lt("created_at", range.end.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw error;

    const series = range.buckets.map((bucket) => ({
      label: bucket.label,
      start: bucket.start,
      end: bucket.end,
      gross: 0,
      refunds: 0,
      net: 0,
      orders: 0,
    }));
    let grossRevenue = 0;
    let refunds = 0;

    for (const order of data || []) {
      const gross = money(order.total_amount);
      const refunded = order.payment_status === "refunded"
        ? money(order.refund_amount == null ? gross : order.refund_amount)
        : 0;
      const net = Math.max(0, money(gross - refunded));
      const createdAt = new Date(order.created_at).getTime();
      const bucket = series.find((item) => createdAt >= item.start.getTime() && createdAt < item.end.getTime());

      grossRevenue += gross;
      refunds += refunded;
      if (bucket) {
        bucket.gross += gross;
        bucket.refunds += refunded;
        bucket.net += net;
        bucket.orders += 1;
      }
    }

    const orderCount = (data || []).length;
    const paidOrderCount = (data || []).filter((order) => order.payment_status === "paid").length;
    const refundedOrderCount = orderCount - paidOrderCount;
    const netRevenue = money(grossRevenue - refunds);
    return res.json({
      period,
      period_label: range.label,
      generated_at: new Date().toISOString(),
      revenue: {
        gross: money(grossRevenue),
        refunds: money(refunds),
        net: netRevenue,
        order_count: orderCount,
        paid_orders: paidOrderCount,
        refunded_orders: refundedOrderCount,
        average_order_value: orderCount ? money(grossRevenue / orderCount) : 0,
        series: series.map(({ start: _start, end: _end, ...item }) => ({
          ...item,
          gross: money(item.gross),
          refunds: money(item.refunds),
          net: money(item.net),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.revenuePeriod = revenuePeriod;
