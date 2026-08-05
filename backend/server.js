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
app.use(express.json());

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

app.use("/api/admin/users", adminUsersRouter);
app.use("/api/admin/inventory", adminInventoryRouter);
app.use("/api/admin/tasks", adminTasksRouter);
app.use("/api/worker/tasks", workerTasksRouter);

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
