const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const express = require("express");

const auth = require("../middleware/auth");
const supabase = require("../supabase");
const taskNotifications = require("../lib/task-notifications");
const orderNotifications = require("../lib/order-notifications");

const workerId = "11111111-1111-4111-8111-111111111111";
const driverId = "22222222-2222-4222-8222-222222222222";
let cancelledTaskNotification = null;
let cancelledDeliveryNotification = null;
let taskRpcCalls = [];

const task = {
  id: 7,
  task_name: "Inspect Field A",
  assigned_worker_id: workerId,
  description: "Inspect pineapple plants",
  estimated_duration_minutes: 60,
  created_at: "2026-11-10T00:00:00.000Z",
  updated_at: "2026-11-10T00:00:00.000Z",
  started_at: null,
  completed_at: null,
  cancelled_at: null,
  cancelled_by: null,
  category: { category_name: "Monitoring" },
  field: { field_name: "Field A" },
  priority: { priority_name: "Medium", code: "medium" },
  task_status: { id: 1, status_name: "Pending", code: "pending" },
  schedules: [{
    id: 3,
    schedule_date: "2026-11-11",
    start_time: "08:00:00",
    end_time: "09:00:00",
    location: "Field A",
    schedule_status: { id: 1, status_name: "Scheduled", code: "scheduled" },
  }],
};

const order = {
  id: 12,
  order_number: "ORD-0012",
  delivery_method: "delivery",
  assigned_driver_id: driverId,
  assigned_vehicle_id: null,
  order_status: "ready_for_delivery",
  delivery_assignment_status: "assigned",
  delivery_scheduled_at: "2026-11-11T08:00:00+08:00",
  delivery_window_end_at: "2026-11-11T09:00:00+08:00",
  driver_assigned_at: "2026-11-10T00:00:00.000Z",
};

class Query {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.changes = null;
  }

  select() { return this; }
  eq(column, value) { this.filters.push([column, value]); return this; }
  update(changes) { this.changes = changes; return this; }

  matches(row) {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  result() {
    const row = this.table === "tasks" ? task : order;
    if (!this.matches(row)) return { data: null, error: null };
    if (this.changes) Object.assign(row, this.changes);
    return { data: { ...row }, error: null };
  }

  maybeSingle() { return Promise.resolve(this.result()); }
  single() { return Promise.resolve(this.result()); }
}

auth.requireAuth = (req, _res, next) => {
  req.user = { id: "33333333-3333-4333-8333-333333333333" };
  next();
};
auth.requireRole = () => (_req, _res, next) => next();

taskNotifications.notifyTaskCancellation = async (value) => { cancelledTaskNotification = value; };
orderNotifications.createDeliveryAssignmentCancelledNotification = async (value) => { cancelledDeliveryNotification = value; };

supabase.getSupabase = () => ({
  from: (table) => new Query(table),
  async rpc(name, args) {
    taskRpcCalls.push({ name, args });
    if (name !== "cancel_pending_task" || task.task_status.code !== "pending") {
      return { data: null, error: { code: "P0001", message: "task_not_pending" } };
    }
    task.task_status = { id: 4, status_name: "Cancelled", code: "cancelled" };
    task.cancelled_at = "2026-11-10T01:00:00.000Z";
    task.cancelled_by = args.p_cancelled_by;
    task.schedules[0].schedule_status = { id: 4, status_name: "Cancelled", code: "cancelled" };
    return { data: task.id, error: null };
  },
});

const app = express();
app.use(express.json());
app.use("/api/admin/tasks", require("../routes/admin-tasks"));
app.use("/api/admin/deliveries", require("../routes/admin-deliveries"));
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message }));

let server;
let baseUrl;
before(() => new Promise((resolve) => {
  server = app.listen(0, "127.0.0.1", () => {
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    resolve();
  });
}));
after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

test("admin cancellation atomically cancels a pending worker task and its schedule", async () => {
  task.task_status = { id: 1, status_name: "Pending", code: "pending" };
  task.cancelled_at = null;
  task.cancelled_by = null;
  taskRpcCalls = [];
  cancelledTaskNotification = null;

  const response = await fetch(`${baseUrl}/api/admin/tasks/7/cancel`, { method: "POST" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.task.status, "cancelled");
  assert.equal(body.task.schedule.schedule_status.code, "cancelled");
  assert.deepEqual(taskRpcCalls, [{
    name: "cancel_pending_task",
    args: { p_task_id: 7, p_cancelled_by: "33333333-3333-4333-8333-333333333333" },
  }]);
  assert.equal(cancelledTaskNotification.assigned_worker_id, workerId);
});

test("a worker task that is no longer pending cannot be cancelled", async () => {
  task.task_status = { id: 2, status_name: "In Progress", code: "in_progress" };
  taskRpcCalls = [];
  const response = await fetch(`${baseUrl}/api/admin/tasks/7/cancel`, { method: "POST" });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "Only pending tasks can be cancelled");
  assert.equal(taskRpcCalls.length, 0);
});

test("admin cancellation releases an unaccepted driver assignment for reassignment", async () => {
  Object.assign(order, {
    assigned_driver_id: driverId,
    delivery_assignment_status: "assigned",
    delivery_scheduled_at: "2026-11-11T08:00:00+08:00",
    delivery_window_end_at: "2026-11-11T09:00:00+08:00",
    driver_assigned_at: "2026-11-10T00:00:00.000Z",
  });
  cancelledDeliveryNotification = null;

  const response = await fetch(`${baseUrl}/api/admin/deliveries/12/cancel-assignment`, { method: "POST" });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.order.assigned_driver_id, null);
  assert.equal(body.order.delivery_assignment_status, "declined");
  assert.equal(body.order.delivery_scheduled_at, null);
  assert.equal(cancelledDeliveryNotification.driverId, driverId);
  assert.equal(cancelledDeliveryNotification.orderId, 12);
});

test("an accepted driver assignment cannot be cancelled", async () => {
  Object.assign(order, { assigned_driver_id: driverId, delivery_assignment_status: "accepted" });
  const response = await fetch(`${baseUrl}/api/admin/deliveries/12/cancel-assignment`, { method: "POST" });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "Only delivery assignments waiting for driver acceptance can be cancelled");
});
