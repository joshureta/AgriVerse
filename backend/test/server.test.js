const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

const app = require("../server");
const {
  requireInitialPasswordChanged,
  requireProfileOnboardingComplete,
} = require("../middleware/auth");
const { readOptional, readRequired, validatePassword } = require("../routes/mobile-auth");

let server;
let baseUrl;

before(
  () =>
    new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const { port } = server.address();
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    }),
);

after(
  () =>
    new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    }),
);

test("GET / reports the API status", async () => {
  const response = await fetch(`${baseUrl}/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.name, "AgriVerse API");
  assert.equal(body.status, "running");
});

test("GET /api/health reports Express and Supabase configuration", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(body.express, "ok");
  assert.equal(typeof body.supabase.configured, "boolean");
  assert.ok([200, 503].includes(response.status));
});

test("unknown routes return JSON 404 responses", async () => {
  const response = await fetch(`${baseUrl}/not-a-route`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "Route not found");
});

test("protected routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("initial password change requires an access token", async () => {
  const response = await fetch(`${baseUrl}/api/mobile/auth/change-initial-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "ValidPass1!" }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("mobile profile onboarding routes require an access token", async () => {
  for (const [path, body] of [
    ["confirm-name", { full_name: "Farm Worker" }],
    ["location", {
      region: "Region X",
      province: "Misamis Oriental",
      city_municipality: "Cagayan de Oro",
      barangay: "Lumbia",
    }],
  ]) {
    const response = await fetch(`${baseUrl}/api/mobile/auth/${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const responseBody = await response.json();
    assert.equal(response.status, 401);
    assert.equal(responseBody.error, "Authentication required");
  }
});

test("initial password validation matches the mobile password requirements", () => {
  assert.equal(validatePassword("ValidPass1!"), true);
  assert.equal(validatePassword("Short1!"), false);
  assert.equal(validatePassword("lowercase1!"), false);
  assert.equal(validatePassword("NoNumber!"), false);
  assert.equal(validatePassword("NoSpecial1"), false);
});

test("worker API gate blocks only profiles that still require a password change", () => {
  let nextCalled = false;
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  requireInitialPasswordChanged(
    { profile: { must_change_password: true } },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, "INITIAL_PASSWORD_CHANGE_REQUIRED");
  assert.equal(nextCalled, false);

  requireInitialPasswordChanged(
    { profile: { must_change_password: false } },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
});

test("worker API gate requires name confirmation and completed location", () => {
  let nextCalled = false;
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };

  requireProfileOnboardingComplete(
    { profile: { name_confirmed_at: null, onboarding_completed_at: null } },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.code, "PROFILE_ONBOARDING_REQUIRED");
  assert.equal(nextCalled, false);

  requireProfileOnboardingComplete(
    {
      profile: {
        name_confirmed_at: "2026-08-15T00:00:00.000Z",
        onboarding_completed_at: "2026-08-15T00:01:00.000Z",
      },
    },
    response,
    () => { nextCalled = true; },
  );
  assert.equal(nextCalled, true);
});

test("profile onboarding fields are trimmed and validated", () => {
  assert.equal(readRequired("  Northern Mindanao  ", 120, "Region"), "Northern Mindanao");
  assert.equal(readOptional("   ", 120, "Province"), null);
  assert.throws(() => readRequired("", 120, "Region"), /Region is required/);
  assert.throws(() => readOptional("x".repeat(121), 120, "Province"), /Province is too long/);
});

test("admin user routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/users`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("admin inventory routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/inventory`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("seller inventory routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/seller/inventory`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("buyer product routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/buyer/products/pineapples`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("buyer checkout routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/buyer/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("admin task routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/tasks`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("worker task routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/worker/tasks`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("lookup routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/lookups/task-categories`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("schedule routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/admin/schedules`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("worker completion routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/worker/tasks/1/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed_at: new Date().toISOString() }),
  });
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});

test("seller order routes require an access token", async () => {
  const response = await fetch(`${baseUrl}/api/seller/orders`);
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error, "Authentication required");
});
