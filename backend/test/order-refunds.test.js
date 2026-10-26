const assert = require("node:assert/strict");
const { afterEach, mock, test } = require("node:test");
const { refundCentavos, refundTransferLink, resolvePaidPayment, getRefundResource } = require("../lib/order-refunds");
const { paymongoRequest } = require("../lib/paymongo");

const originalKey = process.env.PAYMONGO_SECRET_KEY;
afterEach(() => {
  mock.restoreAll();
  if (originalKey === undefined) delete process.env.PAYMONGO_SECRET_KEY;
  else process.env.PAYMONGO_SECRET_KEY = originalKey;
});

test("refund amounts must be valid PHP centavos", () => {
  assert.equal(refundCentavos("145.50"), 14550);
  assert.throws(() => refundCentavos("0.50"), /at least PHP 1/);
  assert.throws(() => refundCentavos("145.505"), /two decimal places/);
});

test("a test refund requires a paid test payment linked to the order", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  const paths = [];
  mock.method(global, "fetch", async (url) => {
    paths.push(String(url));
    const data = String(url).endsWith("/payment_intents/pi_123")
      ? { id: "pi_123", attributes: { livemode: false, status: "succeeded", payments: [{ id: "pay_123", attributes: { status: "paid" } }] } }
      : { id: "pay_123", attributes: { livemode: false, status: "paid", payment_intent_id: "pi_123", amount: 14550, currency: "PHP" } };
    return { ok: true, json: async () => ({ data }) };
  });
  const order = { payment_method: "qrph", payment_status: "paid", paymongo_payment_intent_id: "pi_123" };
  assert.equal(await resolvePaidPayment(order, 14550), "pay_123");
  assert.deepEqual(paths.map((path) => path.split("/v1")[1]), ["/payment_intents/pi_123", "/payments/pay_123"]);
});

test("a live key cannot send an automated refund in the test account flow", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_live_example";
  await assert.rejects(resolvePaidPayment({ payment_method: "gcash", payment_status: "paid" }, 100), /test secret key/);
});

test("PayMongo refund creation sends a stable idempotency key", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  let header;
  mock.method(global, "fetch", async (_url, options) => {
    header = options.headers["Idempotency-Key"];
    return { ok: true, json: async () => ({ data: { id: "ref_123" } }) };
  });
  await paymongoRequest("/refunds", { data: { attributes: { amount: 100, payment_id: "pay_123", reason: "others" } } }, { idempotencyKey: "one-logical-refund" });
  assert.equal(header, "one-logical-refund");
});

test("QR Ph refund requests use PayMongo's QR Ph refund endpoint", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  let requestedUrl;
  mock.method(global, "fetch", async (url) => {
    requestedUrl = String(url);
    return { ok: true, json: async () => ({ data: { id: "ref_123" } }) };
  });
  await paymongoRequest("/refunds", { data: { attributes: { amount: 100, payment_id: "pay_123", reason: "others" } } }, { qrphRefund: true });
  assert.equal(requestedUrl, "https://refunds-api.paymongo.com/v1/refunds");
  assert.equal(refundTransferLink("https://transfer.paymongo-stg.com/claim"), "https://transfer.paymongo-stg.com/claim");
  assert.equal(refundTransferLink("https://paymongo-stg.com.evil.example/claim"), null);
});

test("QR Ph refund status is read from the original payment", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  let requestedUrl;
  mock.method(global, "fetch", async (url) => {
    requestedUrl = String(url);
    return { ok: true, json: async () => ({ data: { attributes: { refunds: [
      { id: "ref_123", type: "refund", attributes: { status: "processing" } },
    ] } } }) };
  });
  const refund = await getRefundResource({ payment_method: "qrph", paymongo_payment_id: "pay_123", paymongo_refund_id: "ref_123" });
  assert.equal(requestedUrl, "https://api.paymongo.com/v1/payments/pay_123");
  assert.equal(refund.data.attributes.status, "processing");
});

test("an in-progress idempotent refund keeps its PayMongo conflict status", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  mock.method(global, "fetch", async () => ({
    ok: false, status: 409, json: async () => ({ errors: [{ detail: "Idempotency key is still processing" }] }),
  }));
  await assert.rejects(
    paymongoRequest("/refunds", { data: { attributes: { amount: 100, payment_id: "pay_123", reason: "others" } } }, { idempotencyKey: "one-logical-refund" }),
    (error) => error.paymongoStatus === 409,
  );
});

test("PayMongo failed refund resource remains available when the API returns 422", async () => {
  process.env.PAYMONGO_SECRET_KEY = "sk_test_example";
  mock.method(global, "fetch", async () => ({
    ok: false, status: 422, json: async () => ({ data: { id: "ref_failed", type: "refund", attributes: { status: "failed" } } }),
  }));
  await assert.rejects(
    paymongoRequest("/refunds", { data: { attributes: { amount: 100, payment_id: "pay_123", reason: "others" } } }, { qrphRefund: true }),
    (error) => error.paymongoStatus === 422 && error.paymongoPayload?.data?.id === "ref_failed",
  );
});
