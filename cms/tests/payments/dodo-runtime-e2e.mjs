import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { installOutboundNetworkGate, startMockDodoServer } from "./helpers/mock-dodo-server.mjs";

const require = createRequire(import.meta.url);
const Knex = require("../../node_modules/knex");
const { Client } = require("../../node_modules/pg");

const repoRoot = resolve(import.meta.dirname, "../../..");
const cmsRoot = join(repoRoot, "cms");
const frontendRoot = join(repoRoot, "frontend");
const runId = process.env.SHARMAR_DODO_E2E_RUN_ID || new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
const outDir = process.env.SHARMAR_DODO_E2E_DIR || `/tmp/sharmar_dodo_mock_e2e_${runId}`;
mkdirSync(outDir, { recursive: true });

const e2eLog = [];
const networkLog = [];
const results = new Map();
let paymentTestCount = 0;
let paymentTestFailures = 0;
let restoreNetworkGate = null;
let mock = null;
let knex = null;
let pgContainer = "";
const servers = [];

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  e2eLog.push(msg);
  console.log(msg);
}

async function check(name, fn) {
  paymentTestCount += 1;
  try {
    await fn();
    results.set(name, "PASS");
    log(`${name}=PASS`);
  } catch (e) {
    paymentTestFailures += 1;
    results.set(name, "FAIL");
    log(`${name}=FAIL ${e instanceof Error ? e.stack || e.message : String(e)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", ...options }).trim();
}

async function waitForPostgres(container) {
  for (let i = 0; i < 60; i += 1) {
    try {
      docker(["exec", container, "pg_isready", "-U", "sharmar"]);
      return;
    } catch {
      await delay(500);
    }
  }
  throw new Error("postgres_not_ready");
}

function compileActiveRoutes() {
  const esbuild = join(cmsRoot, "node_modules/.bin/esbuild");
  const controllerOut = join(outDir, "payment-controller.mjs");
  const nextIntentOut = join(outDir, "next-payment-intent.mjs");
  const notifyOut = join(outDir, "next-payment-paid-notify.mjs");

  execFileSync(esbuild, [
    join(cmsRoot, "src/api/payment/controllers/payment.ts"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${controllerOut}`,
    "--external:stripe",
  ], { stdio: "pipe" });

  execFileSync(esbuild, [
    join(frontendRoot, "app/api/payments/intent/route.ts"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${nextIntentOut}`,
  ], { stdio: "pipe" });

  execFileSync(esbuild, [
    join(frontendRoot, "app/api/internal/payment-paid-notify/route.ts"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--alias:@=${frontendRoot}`,
    `--outfile=${notifyOut}`,
  ], { stdio: "pipe" });

  return { controllerOut, nextIntentOut, notifyOut };
}

async function createSchema(pgUrl) {
  const client = await connectPgWithRetry(pgUrl);
  await client.query(`
    create table boats (
      id serial primary key,
      title text,
      slug text,
      listing_type text not null default 'rent',
      deposit numeric,
      currency text,
      instant_booking boolean default true,
      published_at timestamptz
    );
    create table booking_requests (
      id serial primary key,
      status text not null,
      public_token text unique,
      full_name text,
      phone text,
      email text,
      start_datetime timestamptz,
      end_datetime timestamptz,
      owner_amount numeric,
      marketplace_fee_amount numeric,
      customer_total_amount numeric,
      currency text,
      updated_at timestamptz default now(),
      decided_at timestamptz,
      approved_at timestamptz
    );
    create table booking_requests_boat_lnk (
      booking_request_id int not null,
      boat_id int not null
    );
    create table bookings (
      id serial primary key,
      boat_id int not null,
      slot_start_utc timestamptz not null,
      slot_end_utc timestamptz not null,
      status text not null,
      payment_intent_id text,
      deposit_amount numeric,
      currency text,
      customer_name text,
      customer_phone text,
      customer_email text,
      expires_at timestamptz,
      created_at timestamptz default now(),
      confirmed_at timestamptz
    );
    create unique index bookings_active_slot_uidx
      on bookings (boat_id, slot_start_utc, slot_end_utc)
      where status in ('hold','deposit_paid','paid_pending_owner','confirmed');
    create table payments (
      id serial primary key,
      provider text not null,
      provider_intent_id text,
      amount_cents integer not null,
      currency text not null,
      status text not null,
      booking_request_id integer not null,
      booking_id integer,
      idempotency_key text,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create unique index payments_idempotency_key_uidx
      on payments (idempotency_key)
      where idempotency_key is not null;
    create table dodo_webhook_events (
      id serial primary key,
      webhook_id text unique not null,
      event_type text,
      provider_intent_id text,
      received_at timestamptz default now(),
      payload jsonb
    );
    create table idempotency_keys (
      key text not null,
      endpoint text not null,
      request_hash text,
      response_status int,
      response_body jsonb,
      booking_id int,
      expires_at timestamptz,
      primary key (key, endpoint)
    );
    create table stripe_events (
      id serial primary key,
      event_id text unique,
      event_type text,
      provider_intent_id text,
      created_utc timestamptz,
      payload jsonb
    );
  `);
  await client.end();
}

async function connectPgWithRetry(pgUrl) {
  let lastError = null;
  for (let i = 0; i < 60; i += 1) {
    const client = new Client({ connectionString: pgUrl });
    try {
      await client.connect();
      await client.query("select 1");
      return client;
    } catch (e) {
      lastError = e;
      try { await client.end(); } catch {}
      await delay(500);
    }
  }
  throw lastError || new Error("postgres_host_not_ready");
}

async function seedBooking({ token, status = "approved", instant = true, offsetHours = 0 }) {
  const start = new Date(Date.UTC(2027, 0, 10, 10 + offsetHours, 0, 0)).toISOString();
  const end = new Date(Date.UTC(2027, 0, 10, 14 + offsetHours, 0, 0)).toISOString();
  const [boat] = await knex("boats").insert({
    title: `Boat ${token}`,
    slug: `boat-${token}`,
    listing_type: "rent",
    deposit: 100,
    currency: "EUR",
    instant_booking: instant,
    published_at: new Date(),
  }).returning("*");
  const [br] = await knex("booking_requests").insert({
    status,
    public_token: token,
    full_name: "Runtime Customer",
    phone: "+382000000",
    email: "runtime@example.invalid",
    start_datetime: start,
    end_datetime: end,
    marketplace_fee_amount: 123.45,
    customer_total_amount: 1000,
    owner_amount: 876.55,
    currency: "EUR",
  }).returning("*");
  await knex("booking_requests_boat_lnk").insert({ booking_request_id: br.id, boat_id: boat.id });
  await knex("bookings").insert({
    boat_id: boat.id,
    slot_start_utc: start,
    slot_end_utc: end,
    status: "hold",
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
  });
  return { boat, br, start, end };
}

function makeCtx(req, body, headers = {}) {
  const responseHeaders = {};
  return {
    req: { headers },
    request: { body, headers },
    status: 200,
    body: null,
    set(name, value) {
      responseHeaders[name] = value;
    },
    badRequest(message) {
      this.status = 400;
      this.body = { error: message };
    },
    notFound(message) {
      this.status = 404;
      this.body = { error: message };
    },
    conflict(message) {
      this.status = 409;
      this.body = { error: message };
    },
    responseHeaders,
  };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

async function startLocalServer(handler) {
  const server = createServer((req, res) => handler(req, res).catch((e) => send(res, 500, { error: String(e?.stack || e) })));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}`;
}

async function main() {
  restoreNetworkGate = installOutboundNetworkGate(networkLog);
  log("compiling active payment controller and frontend routes");
  const compiled = compileActiveRoutes();

  pgContainer = `sharmar-dodo-e2e-${process.pid}`;
  const postgresImage = process.env.POSTGRES_E2E_IMAGE || "postgres:16-alpine";
  log(`starting PostgreSQL container image=${postgresImage}`);
  docker([
    "run",
    "--rm",
    "-d",
    "--name",
    pgContainer,
    "-e",
    "POSTGRES_USER=sharmar",
    "-e",
    "POSTGRES_PASSWORD=sharmar",
    "-e",
    "POSTGRES_DB=sharmar_dodo_e2e",
    "-p",
    "127.0.0.1::5432",
    postgresImage,
  ]);
  log(`waiting for PostgreSQL container=${pgContainer}`);
  await waitForPostgres(pgContainer);
  const portLine = docker(["port", pgContainer, "5432/tcp"]);
  const pgPort = Number(portLine.split(":").pop());
  const pgUrl = `postgres://sharmar:sharmar@127.0.0.1:${pgPort}/sharmar_dodo_e2e`;
  await createSchema(pgUrl);
  knex = Knex({ client: "pg", connection: pgUrl });

  mock = await startMockDodoServer();

  const paymentsConfig = {
    enabled: true,
    adminToken: "test_admin",
    provider: "dodo",
    stripe: { mode: "test", secretKey: "", webhookSecret: "" },
    dodo: {
      env: "test",
      apiBaseUrl: mock.baseUrl,
      apiKey: "test_dodo_key",
      webhookSecret: "test_webhook_secret",
      returnUrl: "http://127.0.0.1/payment-return",
      cancelUrl: "http://127.0.0.1/payment-cancel",
      productId: "test_product",
    },
  };

  const fakeStrapi = {
    config: {
      get(key) {
        if (key === "payments") return paymentsConfig;
        if (key === "payments.adminToken") return paymentsConfig.adminToken;
        return undefined;
      },
    },
    db: {
      connection: knex,
      query(uid) {
        if (uid !== "api::booking-request.booking-request") throw new Error(`unsupported_query_${uid}`);
        return {
          async findOne(opts) {
            const where = opts?.where || {};
            let q = knex("booking_requests");
            if (where.public_token) q = q.where("public_token", where.public_token);
            if (where.id) q = q.where("id", where.id);
            return q.first();
          },
        };
      },
    },
    service(uid) {
      if (uid !== "api::payment.payment") throw new Error(`unsupported_service_${uid}`);
      return { getConfig: () => paymentsConfig };
    },
    log: {
      info: (msg) => log(`strapi.info ${msg}`),
      warn: (msg) => log(`strapi.warn ${msg}`),
    },
  };
  globalThis.strapi = fakeStrapi;

  const paymentController = (await import(compiled.controllerOut)).default;
  const nextIntentRoute = await import(compiled.nextIntentOut);
  const notifyRoute = await import(compiled.notifyOut);

  let notifyCalls = 0;
  process.env.NODE_ENV = "test";
  process.env.SHARMAR_EMAIL_MOCK = "true";
  process.env.SHARMAR_INTERNAL_NOTIFY_SECRET = "test_internal_notify_secret";
  process.env.RESEND_API_KEY = "";

  const strapiBase = await startLocalServer(async (req, res) => {
    const raw = await readBody(req);
    const headers = req.headers;
    const url = new URL(req.url || "/", "http://127.0.0.1");

    if (req.method === "POST" && url.pathname === "/api/payments/intent") {
      const body = raw ? JSON.parse(raw) : {};
      const ctx = makeCtx(req, body, headers);
      await paymentController.createIntent(ctx);
      return send(res, ctx.status, ctx.body, ctx.responseHeaders);
    }

    if (req.method === "POST" && url.pathname === "/api/payments/webhook") {
      let body = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { body = raw; }
      if (body && typeof body === "object") body[Symbol.for("unparsedBody")] = raw;
      const ctx = makeCtx(req, body, headers);
      await paymentController.webhook(ctx);
      return send(res, ctx.status, ctx.body, ctx.responseHeaders);
    }

    if (req.method === "GET" && url.pathname === "/api/booking-requests") {
      const id = Number(url.searchParams.get("filters[id][$eq]"));
      const br = await knex("booking_requests").where({ id }).first();
      const lnk = await knex("booking_requests_boat_lnk").where({ booking_request_id: id }).first();
      const boat = lnk ? await knex("boats").where({ id: lnk.boat_id }).first() : null;
      return send(res, 200, { data: br ? [{ ...br, boat }] : [] });
    }

    return send(res, 404, { error: "not_found" });
  });

  const notifyBase = await startLocalServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/internal/payment-paid-notify") {
      return send(res, 404, { error: "not_found" });
    }
    notifyCalls += 1;
    const raw = await readBody(req);
    const response = await notifyRoute.POST(new Request(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: req.headers,
      body: raw,
    }));
    return send(res, response.status, await response.text(), Object.fromEntries(response.headers.entries()));
  });

  process.env.STRAPI_URL = strapiBase;
  process.env.NEXT_PUBLIC_STRAPI_URL = strapiBase;
  process.env.SHARMAR_FRONTEND_NOTIFY_URL = `${notifyBase}/api/internal/payment-paid-notify`;
  process.env.DODO_CHECKOUT_TIMEOUT_MS = "15000";

  const seed = await seedBooking({ token: "public_token_ok", status: "approved", instant: true });

  await check("DODO_CHECKOUT_VALIDATION_RUNTIME", async () => {
    const missing = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "missing-token" },
      body: JSON.stringify({}),
    }));
    assert(missing.status === 400, `missing token status ${missing.status}`);

    const wrong = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "wrong-token" },
      body: JSON.stringify({ public_token: "wrongtok" }),
    }));
    assert(wrong.status === 404, `wrong token status ${wrong.status}`);

    const oversized = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "oversized-token" },
      body: JSON.stringify({ public_token: "x".repeat(20_000) }),
    }));
    assert(oversized.status === 413, `oversized status ${oversized.status}`);

    const pending = await seedBooking({ token: "public_token_pending", status: "pending", offsetHours: 5 });
    const invalidStatus = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "invalid-status" },
      body: JSON.stringify({ public_token: pending.br.public_token }),
    }));
    assert(invalidStatus.status === 409, `invalid status response ${invalidStatus.status}`);
  });

  await check("DODO_CHECKOUT_CONFIG_FAILURE_RUNTIME", async () => {
    const noKey = await seedBooking({ token: "public_token_no_key", status: "approved", offsetHours: 6 });
    const oldKey = paymentsConfig.dodo.apiKey;
    paymentsConfig.dodo.apiKey = "";
    const missingKey = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "missing-api-key" },
      body: JSON.stringify({ public_token: noKey.br.public_token }),
    }));
    paymentsConfig.dodo.apiKey = oldKey;
    assert(missingKey.status === 503, `missing api key status ${missingKey.status}`);

    const noProduct = await seedBooking({ token: "public_token_no_product", status: "approved", offsetHours: 7 });
    const oldProduct = paymentsConfig.dodo.productId;
    paymentsConfig.dodo.productId = "";
    const missingProduct = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "missing-product" },
      body: JSON.stringify({ public_token: noProduct.br.public_token }),
    }));
    paymentsConfig.dodo.productId = oldProduct;
    assert(missingProduct.status === 503, `missing product status ${missingProduct.status}`);
  });

  await check("DODO_CHECKOUT_RUNTIME", async () => {
    const response = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: seed.br.public_token }),
    }));
    const body = await response.json();
    assert(response.status === 200, `expected 200 got ${response.status} ${JSON.stringify(body)}`);
    assert(body.provider === "dodo", "provider must be dodo");
    assert(String(body.checkout_url).startsWith(mock.baseUrl), "checkout_url must be local mock URL");
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    assert(payment.provider === "dodo", "payment provider persisted");
    assert(payment.provider_intent_id === body.provider_intent_id, "provider_intent_id persisted");
    assert(payment.created_at && payment.updated_at, "timestamps persisted");
    const metadata = typeof payment.metadata === "string" ? JSON.parse(payment.metadata) : payment.metadata;
    assert(metadata.checkout_url === body.checkout_url, "checkout_url metadata persisted");
  });

  await check("DODO_CHECKOUT_PAYLOAD_RUNTIME", async () => {
    const state = await (await fetch(`${mock.baseUrl}/__state`)).json();
    const payload = state.payloads[0];
    assert(payload.product_cart[0].product_id === "test_product", "product id sent");
    assert(payload.product_cart[0].quantity === 1, "quantity sent");
    assert(payload.product_cart[0].amount === 12345, "amount cents sent");
    assert(payload.metadata.public_token === "public_token_ok", "public token metadata sent");
    assert(payload.metadata.booking_request_id === String(seed.br.id), "booking request metadata sent");
    assert(payload.return_url === paymentsConfig.dodo.returnUrl, "return URL sent");
    assert(payload.cancel_url === paymentsConfig.dodo.cancelUrl, "cancel URL sent");
    assert(state.headers[0].authorization === "Bearer test_dodo_key", "authorization sent");
  });

  await check("DODO_CHECKOUT_IDEMPOTENCY_RUNTIME", async () => {
    const before = (await (await fetch(`${mock.baseUrl}/__state`)).json()).calls;
    const request = () => nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: seed.br.public_token }),
    }));
    const [a, b] = await Promise.all([request(), request()]);
    assert(a.status === 200 && b.status === 200, "idempotent retries return success");
    const ja = await a.json();
    const jb = await b.json();
    assert(ja.checkout_url === jb.checkout_url, "idempotent retries return same checkout_url");
    const after = (await (await fetch(`${mock.baseUrl}/__state`)).json()).calls;
    assert(after === before, "idempotent retries do not call mock again");
  });

  await check("DODO_CHECKOUT_IDEMPOTENCY_CONFLICT_RUNTIME", async () => {
    const other = await seedBooking({ token: "public_token_conflict", status: "approved", instant: true, offsetHours: 9 });
    const response = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: other.br.public_token }),
    }));
    assert(response.status === 409, `idempotency conflict status ${response.status}`);
  });

  await check("DODO_CHECKOUT_CONCURRENCY_RUNTIME", async () => {
    const fresh = await seedBooking({ token: "public_token_concurrent", status: "approved", instant: true, offsetHours: 10 });
    const before = (await (await fetch(`${mock.baseUrl}/__state`)).json()).calls;
    const make = (key) => nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": key },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    }));
    const responses = await Promise.all([make("concurrent-a"), make("concurrent-b"), make("concurrent-c")]);
    assert(responses.every((r) => r.status === 200), "all concurrent calls return success");
    const urls = await Promise.all(responses.map((r) => r.json().then((j) => j.checkout_url)));
    assert(new Set(urls).size === 1, "all concurrent calls reuse one checkout_url");
    const after = (await (await fetch(`${mock.baseUrl}/__state`)).json()).calls;
    assert(after === before + 1, `mock called once, got ${after - before}`);
  });

  await check("DODO_FAILURE_RESPONSES_RUNTIME", async () => {
    for (const mode of ["400", "401", "500", "malformed", "missing_checkout_url"]) {
      await mock.setMode(mode);
      const fresh = await seedBooking({ token: `public_token_${mode}`.replace(/[^a-z0-9_]/gi, "_"), status: "approved", offsetHours: 20 + Math.floor(Math.random() * 100) });
      const response = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": `failure-${mode}` },
        body: JSON.stringify({ public_token: fresh.br.public_token }),
      }));
      assert(response.status === 502, `${mode} expected 502 got ${response.status}`);
    }
    await mock.setMode("success");
  });

  await check("DODO_WEBHOOK_REJECTION_RUNTIME", async () => {
    const { signDodoWebhookPayload } = await import(join(cmsRoot, "src/api/payment/services/dodo.ts"));
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    const raw = JSON.stringify({ type: "payment.succeeded", data: { payment_id: payment.provider_intent_id, status: "paid" } });
    const now = Math.floor(Date.now() / 1000);
    const oldSecret = paymentsConfig.dodo.webhookSecret;
    const signature = signDodoWebhookPayload({ id: "wh_missing_secret", timestamp: now, rawBody: raw, secret: oldSecret });
    paymentsConfig.dodo.webhookSecret = "";
    const missingSecret = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_missing_secret",
        "webhook-timestamp": String(now),
        "webhook-signature": signature,
      },
      body: raw,
    });
    paymentsConfig.dodo.webhookSecret = oldSecret;
    assert(missingSecret.status === 503, `missing webhook secret status ${missingSecret.status}`);

    const staleSig = signDodoWebhookPayload({ id: "wh_stale", timestamp: now - 1000, rawBody: raw, secret: oldSecret });
    const stale = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_stale",
        "webhook-timestamp": String(now - 1000),
        "webhook-signature": staleSig,
      },
      body: raw,
    });
    assert(stale.status === 401, `stale status ${stale.status}`);

    const futureSig = signDodoWebhookPayload({ id: "wh_future", timestamp: now + 1000, rawBody: raw, secret: oldSecret });
    const future = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_future",
        "webhook-timestamp": String(now + 1000),
        "webhook-signature": futureSig,
      },
      body: raw,
    });
    assert(future.status === 401, `future status ${future.status}`);

    const corruptSig = signDodoWebhookPayload({ id: "wh_corrupt", timestamp: now, rawBody: raw, secret: oldSecret });
    const corrupt = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_corrupt",
        "webhook-timestamp": String(now),
        "webhook-signature": corruptSig,
      },
      body: raw.replace("paid", "tampered"),
    });
    assert(corrupt.status === 401, `corrupt status ${corrupt.status}`);
  });

  await check("DODO_WEBHOOK_VALID_SIGNATURE_RUNTIME", async () => {
    const { signDodoWebhookPayload } = await import(join(cmsRoot, "src/api/payment/services/dodo.ts"));
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    const raw = JSON.stringify({ type: "payment.succeeded", data: { payment_id: payment.provider_intent_id, status: "paid" } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signDodoWebhookPayload({
      id: "wh_runtime_1",
      timestamp,
      rawBody: raw,
      secret: "test_webhook_secret",
    });
    const response = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_runtime_1",
        "webhook-timestamp": String(timestamp),
        "webhook-signature": signature,
      },
      body: raw,
    });
    const body = await response.json();
    assert(response.status === 200, `webhook expected 200 got ${response.status} ${JSON.stringify(body)}`);
    assert(body.provider === "dodo", "webhook provider dodo");
  });

  await check("DODO_PAYMENT_STATUS_RUNTIME", async () => {
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    assert(payment.status === "succeeded", `payment status ${payment.status}`);
    assert(payment.booking_id, "payment linked to booking");
  });

  await check("DODO_BOOKING_STATUS_RUNTIME", async () => {
    const br = await knex("booking_requests").where({ id: seed.br.id }).first();
    assert(br.status === "confirmed", `booking request status ${br.status}`);
  });

  await check("DODO_BOOKING_LINK_RUNTIME", async () => {
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    const booking = await knex("bookings").where({ id: payment.booking_id }).first();
    assert(booking.status === "confirmed", `booking status ${booking.status}`);
    assert(booking.payment_intent_id === payment.provider_intent_id, "booking payment intent linked");
  });

  await check("DODO_INTERNAL_NOTIFY_RUNTIME", async () => {
    assert(notifyCalls === 1, `notify calls ${notifyCalls}`);
  });

  await check("DODO_WEBHOOK_REPLAY_RUNTIME", async () => {
    const { signDodoWebhookPayload } = await import(join(cmsRoot, "src/api/payment/services/dodo.ts"));
    const payment = await knex("payments").where({ idempotency_key: "checkout-main" }).first();
    const raw = JSON.stringify({ type: "payment.succeeded", data: { payment_id: payment.provider_intent_id, status: "paid" } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signDodoWebhookPayload({ id: "wh_runtime_1", timestamp, rawBody: raw, secret: "test_webhook_secret" });
    const response = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_runtime_1",
        "webhook-timestamp": String(timestamp),
        "webhook-signature": signature,
      },
      body: raw,
    });
    const body = await response.json();
    assert(response.status === 200 && body.replay === true, "replay must be accepted as replay");
    assert(notifyCalls === 1, `duplicate notify blocked, calls ${notifyCalls}`);
    const count = await knex("dodo_webhook_events").where({ webhook_id: "wh_runtime_1" }).count("* as c").first();
    assert(Number(count.c) === 1, "single audit/idempotency event row");
  });

  await check("DODO_WEBHOOK_INVALID_SIGNATURE_BLOCKED", async () => {
    const response = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_bad_sig",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": "v1,bad",
      },
      body: JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_nope" } }),
    });
    assert(response.status === 401, `invalid signature status ${response.status}`);
  });

  await check("DODO_WEBHOOK_NONPAID_RUNTIME", async () => {
    const { signDodoWebhookPayload } = await import(join(cmsRoot, "src/api/payment/services/dodo.ts"));
    const fresh = await seedBooking({ token: "public_token_nonpaid", status: "approved", instant: true, offsetHours: 40 });
    const checkout = await nextIntentRoute.POST(new Request("http://127.0.0.1/api/payments/intent", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "nonpaid-checkout" },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    }));
    assert(checkout.status === 200, "nonpaid checkout setup");
    const payment = await knex("payments").where({ idempotency_key: "nonpaid-checkout" }).first();
    const raw = JSON.stringify({ type: "checkout.cancelled", data: { payment_id: payment.provider_intent_id, status: "cancelled" } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signDodoWebhookPayload({ id: "wh_nonpaid", timestamp, rawBody: raw, secret: "test_webhook_secret" });
    const response = await fetch(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "wh_nonpaid",
        "webhook-timestamp": String(timestamp),
        "webhook-signature": signature,
      },
      body: raw,
    });
    assert(response.status === 200, `nonpaid status ${response.status}`);
    const after = await knex("payments").where({ id: payment.id }).first();
    assert(after.status === "pending", `nonpaid must not succeed, got ${after.status}`);
  });

  await check("DODO_INTERNAL_NOTIFY_SAFETY_RUNTIME", async () => {
    const oldSecret = process.env.SHARMAR_INTERNAL_NOTIFY_SECRET;
    process.env.SHARMAR_INTERNAL_NOTIFY_SECRET = "";
    const missing = await fetch(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharmar-internal-secret": "test_internal_notify_secret" },
      body: JSON.stringify({ booking_request_id: seed.br.id }),
    });
    assert(missing.status === 401, `missing internal secret ${missing.status}`);

    process.env.SHARMAR_INTERNAL_NOTIFY_SECRET = oldSecret;
    const wrong = await fetch(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharmar-internal-secret": "wrong" },
      body: JSON.stringify({ booking_request_id: seed.br.id }),
    });
    assert(wrong.status === 401, `wrong internal secret ${wrong.status}`);

    const oversized = await fetch(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharmar-internal-secret": oldSecret },
      body: JSON.stringify({ booking_request_id: seed.br.id, x: "x".repeat(20_000) }),
    });
    assert(oversized.status === 413, `oversized notify ${oversized.status}`);

    const invalid = await fetch(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharmar-internal-secret": oldSecret },
      body: JSON.stringify({ booking_request_id: 0 }),
    });
    assert(invalid.status === 400, `invalid notify ${invalid.status}`);

    const ok = await fetch(`${notifyBase}/api/internal/payment-paid-notify`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-sharmar-internal-secret": oldSecret },
      body: JSON.stringify({ booking_request_id: seed.br.id }),
    });
    const body = await ok.json();
    assert(ok.status === 200, `notify mock ok ${ok.status}`);
    assert(body.customer_email_sent === false, "email not sent in mock mode");
    assert(body.warnings.includes("email_mock_enabled"), "email mock warning returned");
  });

  await check("DODO_SECRET_LEAK_CHECK", async () => {
    const haystack = JSON.stringify([...e2eLog, ...networkLog]);
    for (const secret of ["test_dodo_key", "test_webhook_secret", "test_internal_notify_secret"]) {
      assert(!haystack.includes(secret), `secret leaked: ${secret}`);
    }
  });

  await check("OUTBOUND_NETWORK_GATE", async () => {
    let blocked = false;
    try {
      await fetch("https://test.dodopayments.com/checkouts");
    } catch (e) {
      blocked = String(e).includes("OUTBOUND_NETWORK_BLOCKED");
    }
    assert(blocked, "external Dodo URL blocked");
  });

  await check("POSTGRES_INVARIANTS", async () => {
    const payments = await knex("payments").select("*");
    assert(payments.length >= 1, "payments table has rows");
    assert(payments.every((p) => p.provider !== "stripe"), "no dodo payment written as stripe");
    const active = await knex("payments").where({ provider: "dodo", booking_request_id: seed.br.id });
    assert(active.length === 1, `one dodo payment for main booking, got ${active.length}`);
  });

  const reportLines = [
    `PAYMENT_TEST_COUNT=${paymentTestCount}`,
    `PAYMENT_TEST_FAILURES=${paymentTestFailures}`,
    ...Array.from(results.entries()).map(([k, v]) => `${k}=${v}`),
  ];
  writeFileSync(join(outDir, "e2e.log"), e2eLog.join("\n") + "\n");
  writeFileSync(join(outDir, "network.log"), networkLog.join("\n") + "\n");
  writeFileSync(join(outDir, "db-invariants.log"), reportLines.join("\n") + "\n");
  writeFileSync(join(outDir, "report.log"), reportLines.join("\n") + "\n");

  if (paymentTestFailures > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} finally {
  for (const server of servers.reverse()) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mock) await mock.stop();
  if (knex) await knex.destroy();
  if (restoreNetworkGate) restoreNetworkGate();
  if (pgContainer) {
    try { docker(["stop", pgContainer], { stdio: "ignore" }); } catch {}
  }
  writeFileSync(join(outDir, "e2e.log"), e2eLog.join("\n") + "\n");
  writeFileSync(join(outDir, "network.log"), networkLog.join("\n") + "\n");
}
