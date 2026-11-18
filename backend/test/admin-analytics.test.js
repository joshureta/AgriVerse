const assert = require("node:assert/strict");
const { test } = require("node:test");
const { historicalMonths, aggregateHistoricalSeries, soilMoistureTrend } = require("../routes/admin-dashboard");

test("historical analytics group revenue, orders, and approved harvests by Manila month", () => {
  const buckets = historicalMonths(3, new Date("2026-11-17T02:00:00.000Z"));
  assert.equal(buckets[0].key, "2026-09");
  assert.equal(buckets[0].start.toISOString(), "2026-08-31T16:00:00.000Z");
  const series = aggregateHistoricalSeries(buckets, [
    { created_at: "2026-10-31T15:59:59.000Z", order_status: "completed", payment_status: "paid", total_amount: 50 },
    { created_at: "2026-10-31T16:00:00.000Z", order_status: "completed", payment_status: "refunded", total_amount: 100, refund_amount: 40 },
    { created_at: "2026-11-01T00:00:00.000Z", order_status: "pending", payment_status: "unpaid", total_amount: 30 },
    { created_at: "2026-11-02T00:00:00.000Z", order_status: "cancelled", payment_status: "unpaid", total_amount: 20 },
  ], [
    { approved_at: "2026-10-31T16:00:00.000Z", harvest_small_count: 2, harvest_medium_count: 3, harvest_large_count: 0, harvest_damaged_count: 1 },
  ]);
  assert.deepEqual(series.map(({ key, revenue, orders, harvested }) => ({ key, revenue, orders, harvested })), [
    { key: "2026-09", revenue: 0, orders: 0, harvested: 0 },
    { key: "2026-10", revenue: 50, orders: 1, harvested: 0 },
    { key: "2026-11", revenue: 60, orders: 2, harvested: 6 },
  ]);
});

test("soil moisture history weights samples and leaves unrecorded days empty", () => {
  const trend = soilMoistureTrend([
    { report_date: "2026-11-16", metrics: { metrics: { soilMoisture: { average: 20, count: 2 } } } },
    { report_date: "2026-11-16", metrics: { metrics: { soilMoisture: { average: 40, count: 1 } } } },
  ], new Date("2026-11-17T02:00:00.000Z"));
  assert.equal(trend.length, 7);
  assert.deepEqual(trend.at(-2), { date: "2026-11-16", moisture: 26.7 });
  assert.deepEqual(trend.at(-1), { date: "2026-11-17", moisture: null });
});
