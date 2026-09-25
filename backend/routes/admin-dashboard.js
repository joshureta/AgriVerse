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

const ACTIVITY_LIMIT_MAX = 50;
const ONGOING_LIMIT_MAX = 100;
const ONGOING_DELIVERY_STATUSES = ["assigned", "accepted", "picked_up", "out_for_delivery"];
const ongoingDeliveryText = {
  assigned: (order) => `was assigned order ${order}`,
  accepted: (order) => `accepted delivery of order ${order}`,
  picked_up: (order) => `picked up order ${order}`,
  out_for_delivery: (order) => `is out delivering order ${order}`,
};

function firstName(fullName) {
  return String(fullName || "").trim().split(/\s+/)[0] || "A worker";
}

async function recentRows(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Completed work only, each stamped with when the worker finished it, newest first.
router.get("/activities", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), ACTIVITY_LIMIT_MAX);
    const supabase = getSupabase();

    const [tasks, deliveries, activeTasks, activeDeliveries] = await Promise.all([
      recentRows(supabase.from("tasks")
        .select([
          "id, completed_at",
          "category:task_categories!tasks_category_id_fkey(category_name)",
          "field:farm_fields!tasks_field_id_fkey(field_name)",
          "worker:profiles!tasks_assigned_worker_id_fkey(full_name)",
        ].join(", "))
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(ACTIVITY_LIMIT_MAX)),
      recentRows(supabase.from("buyer_orders")
        .select("id, order_number, delivered_at, driver:profiles!buyer_orders_assigned_driver_id_fkey(full_name)")
        .not("delivered_at", "is", null)
        .order("delivered_at", { ascending: false })
        .limit(ACTIVITY_LIMIT_MAX)),
      recentRows(supabase.from("tasks")
        .select([
          "id, started_at, created_at",
          "category:task_categories!tasks_category_id_fkey(category_name)",
          "field:farm_fields!tasks_field_id_fkey(field_name)",
          "worker:profiles!tasks_assigned_worker_id_fkey!inner(full_name, worker_category)",
          "task_status:task_statuses!tasks_status_id_fkey!inner(code)",
          "schedules(schedule_date, start_time)",
        ].join(", "))
        .eq("worker.worker_category", "crop_management_worker")
        .in("task_status.code", ["pending", "in_progress"])
        .limit(ONGOING_LIMIT_MAX)),
      recentRows(supabase.from("buyer_orders")
        .select("id, order_number, delivery_assignment_status, delivery_scheduled_at, driver_assigned_at, delivery_accepted_at, delivery_picked_up_at, driver:profiles!buyer_orders_assigned_driver_id_fkey(full_name)")
        .not("assigned_driver_id", "is", null)
        .in("delivery_assignment_status", ONGOING_DELIVERY_STATUSES)
        .limit(ONGOING_LIMIT_MAX)),
    ]);

    const activities = [
      ...tasks.map((task) => {
        const category = task.category?.category_name || "a task";
        const where = task.field?.field_name ? ` in ${task.field.field_name}` : "";
        return {
          id: `task-${task.id}`,
          type: "task_completed",
          text: `${firstName(task.worker?.full_name)} completed ${category}${where}`,
          at: task.completed_at,
        };
      }),
      ...deliveries.map((order) => ({
        id: `delivery-${order.id}`,
        type: "delivery_completed",
        text: `${firstName(order.driver?.full_name)} completed delivery of order ${order.order_number}`,
        at: order.delivered_at,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, limit);

    // Work still open, shown after the completed list. Anything booked for a later time isn't active yet.
    const now = Date.now();
    const scheduleStart = (task) => {
      const schedule = Array.isArray(task.schedules) ? task.schedules[0] : task.schedules;
      return schedule ? `${schedule.schedule_date}T${String(schedule.start_time).slice(0, 8)}+08:00` : null;
    };
    const ongoing = [
      ...activeTasks.flatMap((task) => {
        const started = task.task_status?.code === "in_progress";
        const dueAt = scheduleStart(task);
        if (!started && dueAt && new Date(dueAt).getTime() > now) return [];
        const category = task.category?.category_name || "a task";
        const where = task.field?.field_name ? ` in ${task.field.field_name}` : "";
        const who = firstName(task.worker?.full_name);
        return [{
          id: `task-${task.id}`,
          type: started ? "task_ongoing" : "task_assigned",
          phase: started ? "started" : "assigned",
          text: started ? `${who} is working on ${category}${where}` : `${who} was assigned ${category}${where}`,
          at: started ? task.started_at : dueAt || task.created_at,
        }];
      }),
      ...activeDeliveries.flatMap((order) => {
        const status = order.delivery_assignment_status;
        const assigned = status === "assigned";
        if (assigned && order.delivery_scheduled_at && new Date(order.delivery_scheduled_at).getTime() > now) return [];
        return [{
          id: `delivery-${order.id}`,
          type: assigned ? "delivery_assigned" : "delivery_ongoing",
          phase: assigned ? "assigned" : "started",
          text: `${firstName(order.driver?.full_name)} ${ongoingDeliveryText[status](order.order_number)}`,
          at: assigned
            ? order.delivery_scheduled_at || order.driver_assigned_at
            : order.delivery_picked_up_at || order.delivery_accepted_at,
        }];
      }),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return res.json({ activities, ongoing, generated_at: new Date().toISOString() });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.revenuePeriod = revenuePeriod;
