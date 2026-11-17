const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const { getSupabase } = require("../supabase");
const { computeFieldReport } = require("../lib/environmental-report-service");
const { httpError } = require("../lib/http-error");
const { historicalMonths, aggregateHistoricalSeries } = require("./admin-dashboard");

const router = express.Router();
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_TYPES = new Set(["operations", "productivity", "harvest", "sales", "inventory", "environment", "delivery", "history"]);
const FIELD_REPORTS = new Set(["operations", "productivity", "harvest", "environment", "history"]);
const PERIODS = new Set(["week", "month", "year", "last3", "last6", "last12"]);

router.use(requireAuth, requireRole("admin"));

function manilaInstant(year, month, day) {
  return new Date(Date.UTC(year, month, day) - MANILA_OFFSET_MS);
}

function manilaDate(value) {
  return new Date(value.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

function reportRange(period, now = new Date()) {
  const local = new Date(now.getTime() + MANILA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  let start;
  if (period.startsWith("last")) {
    start = manilaInstant(year, month - Number(period.slice(4)) + 1, 1);
  } else if (period === "week") {
    start = manilaInstant(year, month, day - ((local.getUTCDay() + 6) % 7));
  } else if (period === "year") {
    start = manilaInstant(year, 0, 1);
  } else {
    start = manilaInstant(year, month, 1);
  }
  return {
    start: start.toISOString(),
    end: now.toISOString(),
    startDate: manilaDate(start),
    endDate: manilaDate(now),
    label: period.startsWith("last") ? `Last ${period.slice(4)} months`
      : period === "week" ? "This week" : period === "year" ? "This year" : "This month",
  };
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

function one(value) {
  return Array.isArray(value) ? value[0] : value;
}

function count(value) {
  return Number(value || 0).toLocaleString("en-PH");
}

function money(value) {
  return `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function section(title, columns, rows) {
  return { title, columns, rows: rows.length ? rows : [["No recorded data for this period", ...columns.slice(1).map(() => "-")]] };
}

async function operationsReport(supabase, range, field) {
  const tasks = await allRows(() => {
    let query = supabase.from("tasks")
      .select("id, category:task_categories!tasks_category_id_fkey(category_name), task_status:task_statuses!tasks_status_id_fkey(code)")
      .gte("schedule_start", range.start).lte("schedule_start", range.end);
    if (field) query = query.eq("field_id", field.id);
    return query;
  });
  const byCategory = new Map();
  let completed = 0;
  let awaitingReview = 0;
  for (const task of tasks) {
    const name = one(task.category)?.category_name || "Other";
    const status = one(task.task_status)?.code;
    const row = byCategory.get(name) || { scheduled: 0, completed: 0, awaiting: 0 };
    row.scheduled += 1;
    if (status === "completed") { row.completed += 1; completed += 1; }
    if (status === "awaiting_approval") { row.awaiting += 1; awaitingReview += 1; }
    byCategory.set(name, row);
  }
  return {
    title: "Farm Operations Report",
    summary: [
      { label: "Scheduled tasks", value: count(tasks.length) },
      { label: "Completed", value: count(completed) },
      { label: "Awaiting review", value: count(awaitingReview) },
    ],
    sections: [section("Tasks by activity", ["Activity", "Scheduled", "Completed", "Awaiting review"],
      [...byCategory].sort(([a], [b]) => a.localeCompare(b)).map(([name, row]) => [name, count(row.scheduled), count(row.completed), count(row.awaiting)]))],
    notes: ["Counts reflect the current status of tasks scheduled during the selected period."],
    hasData: tasks.length > 0,
  };
}

async function productivityReport(supabase, range, field) {
  const tasks = await allRows(() => {
    let query = supabase.from("tasks")
      .select("id, assigned_worker_id, worker:profiles!tasks_assigned_worker_id_fkey(full_name), task_status:task_statuses!tasks_status_id_fkey(code)")
      .gte("schedule_start", range.start).lte("schedule_start", range.end);
    if (field) query = query.eq("field_id", field.id);
    return query;
  });
  const byWorker = new Map();
  for (const task of tasks) {
    const key = task.assigned_worker_id || "unassigned";
    const row = byWorker.get(key) || { name: one(task.worker)?.full_name || "Unassigned", scheduled: 0, completed: 0, awaiting: 0 };
    row.scheduled += 1;
    const status = one(task.task_status)?.code;
    if (status === "completed") row.completed += 1;
    if (status === "awaiting_approval") row.awaiting += 1;
    byWorker.set(key, row);
  }
  const rows = [...byWorker.values()].sort((a, b) => a.name.localeCompare(b.name));
  const completed = rows.reduce((sum, row) => sum + row.completed, 0);
  return {
    title: "Worker Productivity Report",
    summary: [
      { label: "Scheduled tasks", value: count(tasks.length) },
      { label: "Completed tasks", value: count(completed) },
      { label: "Completion rate", value: tasks.length ? `${Math.round(completed / tasks.length * 100)}%` : "-" },
    ],
    sections: [section("Scheduled work by worker", ["Worker", "Scheduled", "Completed", "Awaiting review", "Completion %"],
      rows.map((row) => [row.name, count(row.scheduled), count(row.completed), count(row.awaiting), `${Math.round(row.completed / row.scheduled * 100)}%`]))],
    notes: ["Counts reflect the current status of tasks scheduled during the selected period; worker utilization on the dashboard is based on today's assigned crop workers."],
    hasData: tasks.length > 0,
  };
}

async function historyReport(supabase, range, field, period) {
  const months = Number(period.slice(4));
  const buckets = historicalMonths(months);
  const [orders, harvests] = await Promise.all([
    allRows(() => supabase.from("buyer_orders")
      .select("id, created_at, total_amount, payment_status, refund_amount")
      .in("payment_status", ["paid", "refunded"])
      .gte("created_at", range.start).lte("created_at", range.end)),
    allRows(() => {
      let query = supabase.from("tasks")
        .select("id, approved_at, harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count")
        .gte("approved_at", range.start).lte("approved_at", range.end)
        .not("harvest_small_count", "is", null);
      if (field) query = query.eq("field_id", field.id);
      return query;
    }),
  ]);
  const series = aggregateHistoricalSeries(buckets, orders, harvests);
  return {
    title: "Historical Farm Trends Report",
    summary: [
      { label: "Months", value: count(months) },
      { label: "Net sales", value: money(series.reduce((sum, item) => sum + item.revenue, 0)) },
      { label: "Harvested pieces", value: count(series.reduce((sum, item) => sum + item.harvested, 0)) },
    ],
    sections: [section("Monthly trends", ["Month", "Net sales", "Harvested pieces"],
      series.map((item) => [item.label, money(item.revenue), count(item.harvested)]))],
    notes: ["The latest month is in progress. Revenue is farm-wide; the selected field applies only to harvest counts. Harvests include approved reports only."],
    hasData: orders.length > 0 || harvests.length > 0,
  };
}

async function harvestReport(supabase, range, field) {
  const tasks = await allRows(() => {
    let query = supabase.from("tasks")
      .select("id, field:farm_fields!tasks_field_id_fkey(field_name), harvest_small_count, harvest_medium_count, harvest_large_count, harvest_damaged_count")
      .gte("approved_at", range.start).lte("approved_at", range.end)
      .not("harvest_small_count", "is", null);
    if (field) query = query.eq("field_id", field.id);
    return query;
  });
  const byField = new Map();
  const total = { small: 0, medium: 0, large: 0, damaged: 0 };
  for (const task of tasks) {
    const name = one(task.field)?.field_name || "Unassigned field";
    const row = byField.get(name) || { small: 0, medium: 0, large: 0, damaged: 0 };
    for (const size of Object.keys(total)) {
      const quantity = Number(task[`harvest_${size}_count`] || 0);
      row[size] += quantity;
      total[size] += quantity;
    }
    byField.set(name, row);
  }
  const harvested = total.small + total.medium + total.large + total.damaged;
  return {
    title: "Harvest & Yield Report",
    summary: [
      { label: "Harvested pieces", value: count(harvested) },
      { label: "Approved harvests", value: count(tasks.length) },
      { label: "Damaged pieces", value: count(total.damaged) },
    ],
    sections: [section("Approved harvest by field", ["Field", "Small", "Medium", "Large", "Damaged", "Total"],
      [...byField].sort(([a], [b]) => a.localeCompare(b)).map(([name, row]) => [name, count(row.small), count(row.medium), count(row.large), count(row.damaged), count(row.small + row.medium + row.large + row.damaged)]))],
    notes: ["Harvest counts come from approved worker harvest reports. Yield per hectare is not shown because field area is not recorded."],
    hasData: tasks.length > 0,
  };
}

async function salesReport(supabase, range) {
  const orders = await allRows(() => supabase.from("buyer_orders")
    .select("id, payment_status, total_amount, refund_amount")
    .gte("created_at", range.start).lte("created_at", range.end));
  const byStatus = new Map();
  let paid = 0;
  let gross = 0;
  let refunds = 0;
  for (const order of orders) {
    const status = order.payment_status || "unknown";
    byStatus.set(status, (byStatus.get(status) || 0) + 1);
    if (status === "paid" || status === "refunded") {
      gross += Number(order.total_amount || 0);
      if (status === "paid") paid += 1;
      if (status === "refunded") refunds += Number(order.refund_amount ?? order.total_amount ?? 0);
    }
  }
  return {
    title: "Sales & Orders Report",
    summary: [
      { label: "Orders placed", value: count(orders.length) },
      { label: "Paid orders", value: count(paid) },
      { label: "Net sales", value: money(gross - refunds) },
    ],
    sections: [section("Orders by payment status", ["Payment status", "Orders"],
      [...byStatus].sort(([a], [b]) => a.localeCompare(b)).map(([status, quantity]) => [status.replaceAll("_", " "), count(quantity)])),
      section("Sales breakdown", ["Measure", "Amount"], [["Gross sales", money(gross)], ["Refunds", money(refunds)], ["Net sales", money(gross - refunds)]])],
    notes: ["Sales use orders placed in the selected period. Net sales equal gross paid and refunded order amounts less recorded refunds."],
    hasData: orders.length > 0,
  };
}

async function inventoryReport(supabase, range) {
  const [items, movements] = await Promise.all([
    allRows(() => supabase.from("inventory_items")
      .select("id, quantity, category:inventory_categories!inventory_items_inventory_category_id_fkey(category_name), unit:measurement_units!inventory_items_unit_id_fkey(abbreviation)")
      .is("archived_at", null)),
    allRows(() => supabase.from("inventory_stock_movements")
      .select("id, movement_type, quantity").gte("created_at", range.start).lte("created_at", range.end)),
  ]);
  const byCategory = new Map();
  let pineapplePieces = 0;
  for (const item of items) {
    const category = one(item.category)?.category_name || "Other";
    const unit = one(item.unit)?.abbreviation || "units";
    const row = byCategory.get(category) || { records: 0, units: new Map() };
    row.records += 1;
    row.units.set(unit, (row.units.get(unit) || 0) + Number(item.quantity || 0));
    byCategory.set(category, row);
    if (category.toLowerCase() === "pineapple" && unit === "pcs") pineapplePieces += Number(item.quantity || 0);
  }
  const byMovement = new Map();
  for (const movement of movements) byMovement.set(movement.movement_type, (byMovement.get(movement.movement_type) || 0) + 1);
  return {
    title: "Inventory & Stock Report",
    summary: [
      { label: "Active inventory records", value: count(items.length) },
      { label: "Pineapples in stock", value: `${count(pineapplePieces)} pcs` },
      { label: "Stock movements", value: count(movements.length) },
    ],
    sections: [section("Current stock by category", ["Category", "Records", "Stock by unit"],
      [...byCategory].sort(([a], [b]) => a.localeCompare(b)).map(([name, row]) => [name, count(row.records), [...row.units].map(([unit, quantity]) => `${count(quantity)} ${unit}`).join(", ")])),
      section("Movements in selected period", ["Movement", "Records"],
        [...byMovement].sort(([a], [b]) => a.localeCompare(b)).map(([name, quantity]) => [name.replaceAll("_", " "), count(quantity)]))],
    notes: ["Stock quantities are a current snapshot; the date range applies to stock movements. Different units are kept separate."],
    hasData: items.length > 0 || movements.length > 0,
  };
}

function weightedAverage(reports, key) {
  let sum = 0;
  let samples = 0;
  for (const report of reports) {
    const metric = report.metrics?.metrics?.[key];
    if (metric?.average == null || !Number(metric.count)) continue;
    sum += Number(metric.average) * Number(metric.count);
    samples += Number(metric.count);
  }
  return samples ? `${(sum / samples).toFixed(1)}` : "-";
}

async function environmentReport(supabase, range, field, fields) {
  const selected = field ? [field.field_name] : fields.map((item) => item.field_name);
  let stored = [];
  let savedReportsUnavailable = false;
  try {
    stored = await allRows(() => {
      let query = supabase.from("environmental_daily_reports")
        .select("id, field_name, report_date, metrics").gte("report_date", range.startDate).lte("report_date", range.endDate);
      if (field) query = query.eq("field_name", field.field_name);
      return query;
    });
  } catch (error) {
    if (!["42P01", "PGRST205"].includes(error?.code)) throw error;
    savedReportsUnavailable = true;
  }
  const reports = stored.filter((item) => item.report_date !== range.endDate);
  const live = await Promise.allSettled(selected.map((name) => computeFieldReport(name, range.endDate)));
  for (const result of live) {
    if (result.status === "fulfilled" && result.value.hasReadings) {
      reports.push({ field_name: result.value.field, report_date: result.value.date, metrics: result.value });
    }
  }
  const byField = new Map();
  for (const report of reports) {
    const group = byField.get(report.field_name) || [];
    group.push(report);
    byField.set(report.field_name, group);
  }
  const moistureAverage = weightedAverage(reports, "soilMoisture");
  return {
    title: "Environmental Monitoring Report",
    summary: [
      { label: "Fields with readings", value: count(byField.size) },
      { label: "Daily field reports", value: count(reports.length) },
      { label: "Average soil moisture", value: moistureAverage === "-" ? "-" : `${moistureAverage}%` },
    ],
    sections: [section("Recorded conditions by field", ["Field", "Days", "Air temp C", "Soil temp C", "Humidity %", "Moisture %"],
      [...byField].sort(([a], [b]) => a.localeCompare(b)).map(([name, group]) => [name, count(group.length), weightedAverage(group, "airTemperature"), weightedAverage(group, "soilTemperature"), weightedAverage(group, "humidity"), weightedAverage(group, "soilMoisture")]))],
    notes: ["Averages are weighted by valid sensor sample counts. Past days use saved daily reports; today uses available live readings. Missing sensor data is not estimated.",
      ...(savedReportsUnavailable ? ["Saved daily environmental reports are unavailable; only today's live readings could be included."] : [])],
    hasData: reports.length > 0,
  };
}

async function deliveryReport(supabase, range) {
  const orders = await allRows(() => supabase.from("buyer_orders")
    .select("id, order_status, delivery_assignment_status, delivered_at")
    .eq("delivery_method", "delivery")
    .gte("created_at", range.start).lte("created_at", range.end));
  const byStatus = new Map();
  let delivered = 0;
  let inProgress = 0;
  for (const order of orders) {
    const status = order.order_status === "cancelled" ? "cancelled"
      : order.delivered_at ? "delivered" : (order.delivery_assignment_status || order.order_status || "unknown");
    byStatus.set(status, (byStatus.get(status) || 0) + 1);
    if (order.delivered_at) delivered += 1;
    if (["accepted", "picked_up", "out_for_delivery"].includes(status)) inProgress += 1;
  }
  return {
    title: "Delivery Performance Report",
    summary: [
      { label: "Delivery orders", value: count(orders.length) },
      { label: "Delivered", value: count(delivered) },
      { label: "In progress", value: count(inProgress) },
    ],
    sections: [section("Delivery status", ["Status", "Orders"],
      [...byStatus].sort(([a], [b]) => a.localeCompare(b)).map(([status, quantity]) => [status.replaceAll("_", " "), count(quantity)]))],
    notes: ["Includes delivery orders placed in the selected period. Statuses reflect their current state when the report is generated."],
    hasData: orders.length > 0,
  };
}

router.get("/options", async (_req, res, next) => {
  try {
    const { data, error } = await getSupabase().from("farm_fields")
      .select("id, field_name").eq("status", true).order("field_name");
    if (error) throw error;
    res.json({ fields: data || [] });
  } catch (error) { next(error); }
});

router.get("/", async (req, res, next) => {
  try {
    const type = String(req.query.type || "");
    const period = String(req.query.period || "");
    const fieldName = String(req.query.field || "all");
    if (!REPORT_TYPES.has(type)) throw httpError(400, "Choose a valid report type");
    if (!PERIODS.has(period)) throw httpError(400, "Choose a valid report period");
    const supabase = getSupabase();
    const { data: fields, error } = await supabase.from("farm_fields")
      .select("id, field_name").eq("status", true).order("field_name");
    if (error) throw error;
    const field = fieldName === "all" ? null : fields.find((item) => item.field_name === fieldName);
    if (fieldName !== "all" && (!FIELD_REPORTS.has(type) || !field)) throw httpError(400, "Choose a valid field for this report");
    const range = reportRange(period);
    if (type === "history" ? !period.startsWith("last") : period.startsWith("last")) {
      throw httpError(400, "Choose a valid period for this report");
    }
    const report = type === "operations" ? await operationsReport(supabase, range, field)
      : type === "productivity" ? await productivityReport(supabase, range, field)
      : type === "harvest" ? await harvestReport(supabase, range, field)
        : type === "sales" ? await salesReport(supabase, range)
          : type === "inventory" ? await inventoryReport(supabase, range)
            : type === "environment" ? await environmentReport(supabase, range, field, fields)
              : type === "delivery" ? await deliveryReport(supabase, range)
                : await historyReport(supabase, range, field, period);
    res.json({ ...report, type, period, periodLabel: range.label, startDate: range.startDate,
      endDate: range.endDate, field: field?.field_name || "All fields", generatedAt: new Date().toISOString() });
  } catch (error) { next(error); }
});

module.exports = router;
module.exports.reportRange = reportRange;
module.exports.weightedAverage = weightedAverage;
