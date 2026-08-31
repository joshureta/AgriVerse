const path = require("path");
const express = require("express");
const cors = require("cors");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const { supabaseConfig } = require("./supabase");
const { requireAuth } = require("./middleware/auth");
const adminUsersRouter = require("./routes/admin-users");
const adminInventoryRouter = require("./routes/admin-inventory");
const adminTasksRouter = require("./routes/admin-tasks");
const workerTasksRouter = require("./routes/worker-tasks");
const adminLookupsRouter = require("./routes/admin-lookups");
const adminSchedulesRouter = require("./routes/admin-schedules");
const buyerProductsRouter = require("./routes/buyer-products");
const buyerOrdersRouter = require("./routes/buyer-orders");
const { router: mobileAuthRouter } = require("./routes/mobile-auth");
const sellerOrdersRouter = require("./routes/seller-orders");
const adminDeliveriesRouter = require("./routes/admin-deliveries");
const driverOrdersRouter = require("./routes/driver-orders");
const aiRouter = require("./routes/ai");
const buyerPaymentsRouter = require("./routes/buyer-payments");
const paymongoWebhookRouter = require("./routes/paymongo-webhook");
const buyerMessagesRouter = require("./routes/buyer-messages");
const adminMessagesRouter = require("./routes/admin-messages");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("Origin is not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
  }),
);
// Mounted before the global JSON parser: PayMongo signature verification needs the
// untouched raw request body, which express.json() would otherwise consume.
app.use("/api/webhooks/paymongo", express.raw({ type: "application/json" }), paymongoWebhookRouter);

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "AgriVerse API",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  const healthy = supabaseConfig.valid;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    express: "ok",
    supabase: healthy
      ? { configured: true }
      : { configured: false, error: supabaseConfig.error },
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      emailConfirmedAt: req.user.email_confirmed_at,
    },
    profile: req.profile,
  });
});

app.use("/api/mobile/auth", mobileAuthRouter);

app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/inventory", adminInventoryRouter);
app.use("/api/seller/inventory", adminInventoryRouter);
app.use("/api/admin/tasks", adminTasksRouter);
app.use("/api/worker/tasks", workerTasksRouter);
app.use("/api/admin/lookups", adminLookupsRouter);
app.use("/api/admin/schedules", adminSchedulesRouter);
app.use("/api/admin/deliveries", adminDeliveriesRouter);
app.use("/api/buyer/products", buyerProductsRouter);
app.use("/api/buyer/orders", buyerOrdersRouter);
app.use("/api/buyer/payments", buyerPaymentsRouter);
app.use("/api/buyer/messages", buyerMessagesRouter);
app.use("/api/admin/messages", adminMessagesRouter);
app.use("/api/seller/orders", sellerOrdersRouter);
app.use("/api/driver/orders", driverOrdersRouter);
app.use("/api/ai", aiRouter);

const PORT = process.env.PORT || 5000;

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? "Internal server error" : error.message;

  return res.status(status).json({ error: message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AgriVerse API listening on http://localhost:${PORT}`);
    if (!supabaseConfig.valid) {
      console.warn(`Supabase is not configured: ${supabaseConfig.error}`);
    }
  });
}

module.exports = app;
