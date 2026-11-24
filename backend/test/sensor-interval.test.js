const assert = require("node:assert/strict");
const test = require("node:test");
const { parseIntervalSeconds } = require("../lib/sensor-interval");

test("send interval accepts whole seconds from 10 seconds to 1 day", () => {
  assert.equal(parseIntervalSeconds(10), 10);
  assert.equal(parseIntervalSeconds(900), 900);
  assert.equal(parseIntervalSeconds(86400), 86400);
});

test("send interval rejects out-of-range, fractional, and non-number values", () => {
  for (const value of [9, 86401, 0, -10, 12.5, "60", null, undefined, NaN, Infinity]) {
    assert.equal(parseIntervalSeconds(value), null, `expected ${value} to be rejected`);
  }
});
