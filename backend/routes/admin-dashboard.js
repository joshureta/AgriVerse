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

async function allRows(buildQuery) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().order("id", { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < pageSize) return rows;
  }
}

// Uses the same active pineapple lots and size ordering as the seller dashboard.
router.get("/inventory", async (_req, res, next) => {
  try {
    const supabase = getSupabase();
    const items = await allRows(() => supabase.from("inventory_items")
      .select("id, quantity, pineapple_inventory(size_id, size:pineapple_sizes!pineapple_inventory_size_id_fkey(id, size_name)), category:inventory_categories!inventory_items_inventory_category_id_fkey!inner(code)")
      .is("archived_at", null).eq("category.code", "pineapple"));
    const bySize = new Map();
    for (const item of items) {
      const pineapple = Array.isArray(item.pineapple_inventory) ? item.pineapple_inventory[0] : item.pineapple_inventory;
      const size = pineapple?.size?.size_name || "Other";
      bySize.set(size, (bySize.get(size) || 0) + Number(item.quantity || 0));
    }
    return res.json({ inventory: [...bySize.entries()].map(([size, quantity]) => ({ size, quantity })) });
  } catch (error) {
    return next(error);
  }
});

router.get("/summary", async (_req, res, next) => {
  try {
    const supabase = getSupabase();
    const month = revenuePeriod("month");
    const { data: inProgressStatus, error: statusError } = await supabase.from("task_statuses")
      .select("id").eq("code", "in_progress").single();
    if (statusError) throw statusError;

    const [cropTasks, deliveries, harvests] = await Promise.all([
      allRows(() => supabase.from("tasks").select("id, assigned_worker_id")
        .eq("status_id", inProgressStatus.id)),
      allRows(() => supabase.from("buyer_orders").select("id, assigned_driver_id")
        .in("delivery_assignment_status", ["accepted", "picked_up", "out_for_delivery"])),
      allRows(() => supabase.from("tasks")
        .select("id, harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count")
        .gte("approved_at", month.start.toISOString()).lt("approved_at", month.end.toISOString())
        .not("harvest_small_count", "is", null)),
    ]);

    const activeWorkers = new Set([
      ...cropTasks.map((task) => task.assigned_worker_id),
      ...deliveries.map((order) => order.assigned_driver_id),
    ].filter(Boolean));
    const harvestedPieces = harvests.reduce((total, task) => total
      + Number(task.harvest_small_count || 0)
      + Number(task.harvest_medium_count || 0)
      + Number(task.harvest_large_count || 0)
      + Number(task.harvest_damaged_count || 0), 0);

    return res.json({
      active_workers: activeWorkers.size,
      harvested_pieces: harvestedPieces,
      month_label: month.label,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

function productivityPeriod(now = new Date()) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const previousMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    date: local.toISOString().slice(0, 10),
    month_label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(now),
    previous_month_label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(manilaInstant(year, month - 1, 1)),
    current_start: manilaInstant(year, month, 1).toISOString(),
    current_end: manilaInstant(year, month, day + 1).toISOString(),
    previous_start: manilaInstant(year, month - 1, 1).toISOString(),
    previous_end: manilaInstant(year, month - 1, Math.min(day, previousMonthDays) + 1).toISOString(),
  };
}

async function todaySchedules(supabase, date) {
  const rows = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, count, error } = await supabase.from("schedules")
      .select([
        "id, start_time",
        "schedule_status:schedule_statuses!schedules_status_id_fkey(code)",
        "task:tasks!schedules_task_id_fkey(id, task_name, assigned_worker_id, task_status:task_statuses!tasks_status_id_fkey(code), category:task_categories!tasks_category_id_fkey(category_name), field:farm_fields!tasks_field_id_fkey(field_name), assigned_worker:profiles!tasks_assigned_worker_id_fkey(full_name))",
      ].join(", "), { count: "exact" })
      .eq("schedule_date", date)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if ((count != null && rows.length >= count) || (data || []).length < pageSize) return rows;
  }
}

function summarizeProductivity(schedules, workerCount, currentApprovals, previousApprovals) {
  const tasks = schedules
    .filter((schedule) => schedule.schedule_status?.code !== "cancelled")
    .map((schedule) => Array.isArray(schedule.task) ? schedule.task[0] : schedule.task)
    .filter((task) => task && task.task_status?.code !== "cancelled");
  const scheduled = tasks.length;
  const completed = tasks.filter((task) => task.task_status?.code === "completed").length;
  const awaitingReview = tasks.filter((task) => task.task_status?.code === "awaiting_approval").length;
  const assignedWorkers = new Set(tasks.map((task) => task.assigned_worker_id).filter(Boolean)).size;
  return {
    tasks: { scheduled, completed, awaiting_review: awaitingReview, completion_percent: scheduled ? Math.round(completed / scheduled * 100) : 0 },
    workers: { total: workerCount, scheduled: assignedWorkers, utilization_percent: workerCount ? Math.min(100, Math.round(assignedWorkers / workerCount * 100)) : 0 },
    comparison: {
      current_approved: currentApprovals,
      previous_approved: previousApprovals,
      change_percent: previousApprovals ? Math.round((currentApprovals - previousApprovals) / previousApprovals * 100) : null,
    },
  };
}

function todaySchedulePreview(schedules) {
  return schedules
    .filter((schedule) => schedule.schedule_status?.code !== "cancelled")
    .map((schedule) => {
      const task = Array.isArray(schedule.task) ? schedule.task[0] : schedule.task;
      if (!task || task.task_status?.code === "cancelled") return null;
      return {
        id: task.id,
        start_time: schedule.start_time,
        title: task.task_name || task.category?.category_name || "Farm task",
        field: task.field?.field_name || "Field not specified",
        worker: task.assigned_worker?.full_name || "Unassigned",
        status: task.task_status?.code || "pending",
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "") || a.id - b.id)
    .slice(0, 3);
}

router.get("/productivity", async (_req, res, next) => {
  try {
    const period = productivityPeriod();
    const supabase = getSupabase();
    const { data: statuses, error: statusError } = await supabase.from("task_statuses")
      .select("id, code").in("code", ["completed", "awaiting_approval"]);
    if (statusError) throw statusError;
    const completedStatus = statuses.find((status) => status.code === "completed");
    const reviewStatus = statuses.find((status) => status.code === "awaiting_approval");
    if (!completedStatus || !reviewStatus) throw new Error("Task statuses are unavailable");

    const [schedules, workers, current, previous, awaitingReview, overdueTasks] = await Promise.all([
      todaySchedules(supabase, period.date),
      supabase.from("profiles").select("id", { count: "exact", head: true })
        .eq("role", "farm_worker").eq("worker_category", "crop_management_worker"),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("status_id", completedStatus.id).gte("approved_at", period.current_start).lt("approved_at", period.current_end),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("status_id", completedStatus.id).gte("approved_at", period.previous_start).lt("approved_at", period.previous_end),
      supabase.from("tasks").select("id", { count: "exact", head: true })
        .eq("status_id", reviewStatus.id),
      supabase.from("operation_incidents").select("id", { count: "exact", head: true })
        .is("recovered_at", null).not("task_id", "is", null),
    ]);
    for (const result of [workers, current, previous, awaitingReview, overdueTasks]) if (result.error) throw result.error;
    return res.json({
      date: period.date,
      month_label: period.month_label,
      previous_month_label: period.previous_month_label,
      generated_at: new Date().toISOString(),
      ...summarizeProductivity(schedules, workers.count || 0, current.count || 0, previous.count || 0),
      today_schedule: todaySchedulePreview(schedules),
      attention: { overdue_tasks: overdueTasks.count || 0, awaiting_review: awaitingReview.count || 0 },
    });
  } catch (error) {
    return next(error);
  }
});

const ANALYTICS_MONTHS = new Set([3, 6, 12]);

function historicalMonths(months, now = new Date()) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return Array.from({ length: months }, (_, index) => {
    const start = manilaInstant(year, month - months + index + 1, 1);
    const end = manilaInstant(year, month - months + index + 2, 1);
    const date = new Date(start.getTime() + MANILA_OFFSET_MS);
    return {
      key: date.toISOString().slice(0, 7),
      label: new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric", timeZone: "Asia/Manila" }).format(start),
      start,
      end,
      revenue: 0,
      orders: 0,
      harvested: 0,
    };
  });
}

function manilaMonthKey(value) {
  return new Date(new Date(value).getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 7);
}

function aggregateHistoricalSeries(buckets, orders, harvests) {
  const byMonth = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const order of orders) {
    const bucket = byMonth.get(manilaMonthKey(order.created_at));
    if (!bucket) continue;
    if (order.order_status !== "cancelled") bucket.orders += 1;
    if (!["paid", "refunded"].includes(order.payment_status)) continue;
    const gross = money(order.total_amount);
    const refund = order.payment_status === "refunded"
      ? money(order.refund_amount == null ? gross : order.refund_amount) : 0;
    bucket.revenue = money(bucket.revenue + Math.max(0, gross - refund));
  }
  for (const task of harvests) {
    const bucket = byMonth.get(manilaMonthKey(task.approved_at));
    if (!bucket) continue;
    bucket.harvested += ["small", "medium", "large", "damaged"]
      .reduce((sum, size) => sum + Number(task[`harvest_${size}_count`] || 0), 0);
  }
  return buckets.map(({ start: _start, end: _end, ...bucket }) => bucket);
}

function soilMoistureTrend(reports, now = new Date()) {
  const today = new Date(now.getTime() + MANILA_OFFSET_MS);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 6 + index));
    return { date: date.toISOString().slice(0, 10), moisture: null, samples: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, { day, sum: 0 }]));
  for (const report of reports) {
    const entry = byDate.get(report.report_date);
    const metric = report.metrics?.metrics?.soilMoisture;
    const count = Number(metric?.count || 0);
    if (!entry || !count || metric.average == null) continue;
    entry.sum += Number(metric.average) * count;
    entry.day.samples += count;
  }
  return [...byDate.values()].map(({ day, sum }) => ({
    date: day.date,
    moisture: day.samples ? Math.round(sum / day.samples * 10) / 10 : null,
  }));
}

router.get("/analytics", async (req, res, next) => {
  try {
    const months = Number(req.query.months || 6);
    if (!ANALYTICS_MONTHS.has(months)) {
      const error = new Error("Analytics range must be 3, 6, or 12 months");
      error.status = 400;
      throw error;
    }
    const supabase = getSupabase();
    const { data: fields, error: fieldsError } = await supabase.from("farm_fields")
      .select("id, field_name").eq("status", true).order("field_name");
    if (fieldsError) throw fieldsError;
    const fieldName = String(req.query.field || "all");
    const field = fieldName === "all" ? null : (fields || []).find((item) => item.field_name === fieldName);
    if (fieldName !== "all" && !field) {
      const error = new Error("Choose a valid field");
      error.status = 400;
      throw error;
    }
    const buckets = historicalMonths(months);
    const start = buckets[0].start.toISOString();
    const end = buckets.at(-1).end.toISOString();
    const [orders, harvests] = await Promise.all([
      allRows(() => supabase.from("buyer_orders")
        .select("id, created_at, order_status, total_amount, payment_status, refund_amount")
        .gte("created_at", start).lt("created_at", end)),
      allRows(() => {
        let query = supabase.from("tasks")
          .select("id, approved_at, harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count")
          .gte("approved_at", start).lt("approved_at", end)
          .not("harvest_small_count", "is", null);
        if (field) query = query.eq("field_id", field.id);
        return query;
      }),
    ]);
    let environmentalReports = [];
    let environmentalHistoryAvailable = true;
    try {
      const local = new Date(Date.now() + MANILA_OFFSET_MS);
      const firstDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - 6)).toISOString().slice(0, 10);
      environmentalReports = await allRows(() => supabase.from("environmental_daily_reports")
        .select("id, report_date, metrics")
        .gte("report_date", firstDay));
    } catch (error) {
      if (!["42P01", "PGRST205"].includes(error?.code)) throw error;
      environmentalHistoryAvailable = false;
    }
    res.json({
      months,
      field: fieldName,
      fields: fields || [],
      series: aggregateHistoricalSeries(buckets, orders, harvests),
      soil_moisture: soilMoistureTrend(environmentalReports),
      environmental_history_available: environmentalHistoryAvailable,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

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
module.exports.productivityPeriod = productivityPeriod;
module.exports.summarizeProductivity = summarizeProductivity;
module.exports.todaySchedulePreview = todaySchedulePreview;
module.exports.historicalMonths = historicalMonths;
module.exports.aggregateHistoricalSeries = aggregateHistoricalSeries;
module.exports.soilMoistureTrend = soilMoistureTrend;
