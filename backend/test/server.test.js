const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");

const app = require("../server");

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
