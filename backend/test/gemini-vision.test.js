const test = require("node:test");
const assert = require("node:assert/strict");
const { apiStatus, generateVisionJson, visionModels } = require("../lib/gemini-vision");

const busy = () => new Error(JSON.stringify({ error: { code: 503, status: "UNAVAILABLE" } }));

test("configured model is tried once before unique fallback models", () => {
  assert.equal(visionModels(null)[0], "gemini-3.5-flash-lite");
  const models = visionModels("gemini-3.6-flash");
  assert.equal(models[0], "gemini-3.6-flash");
  assert.equal(models.filter((model) => model === "gemini-3.6-flash").length, 1);
  assert.equal(visionModels("gemini-3.5-flash")[0], "gemini-3.5-flash");
  assert.equal(apiStatus(busy()), 503);
});

test("temporary overload retries with backoff then uses a fallback", async () => {
  const calls = [];
  const delays = [];
  let usedModel = null;
  const ai = { models: { generateContent: async ({ model }) => {
    calls.push(model);
    if (model === "primary") throw busy();
    return { text: '{"isPineappleRelated":true}' };
  } } };

  const result = await generateVisionJson(ai, "image/png", "image-data", "check", {
    models: ["primary", "fallback"],
    sleep: async (delay) => { delays.push(delay); },
    random: () => 0,
    onModelSuccess: (model) => { usedModel = model; },
  });

  assert.deepEqual(calls, ["primary", "primary", "primary", "fallback"]);
  assert.deepEqual(delays, [1000, 2000]);
  assert.deepEqual(result, { isPineappleRelated: true });
  assert.equal(usedModel, "fallback");
});

test("all overloaded models produce a clear temporary error", async () => {
  const ai = { models: { generateContent: async () => { throw busy(); } } };
  await assert.rejects(
    generateVisionJson(ai, "image/png", "image-data", "check", {
      models: ["primary", "fallback"],
      sleep: async () => {},
    }),
    (error) => error.statusCode === 503 && error.code === "GEMINI_TEMPORARILY_UNAVAILABLE",
  );
});

test("authentication errors are not retried or sent to another model", async () => {
  let calls = 0;
  const ai = { models: { generateContent: async () => {
    calls += 1;
    const error = new Error("Invalid API key");
    error.status = 403;
    throw error;
  } } };

  await assert.rejects(
    generateVisionJson(ai, "image/png", "image-data", "check", { models: ["primary", "fallback"] }),
    /Invalid API key/,
  );
  assert.equal(calls, 1);
});
