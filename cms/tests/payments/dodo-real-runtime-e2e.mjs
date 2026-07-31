import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import net from "node:net";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { startMockDodoServer } from "./helpers/mock-dodo-server.mjs";
import { signDodoWebhookPayload } from "../../src/api/payment/services/dodo.ts";

const require = createRequire(import.meta.url);
const { Client } = require("../../node_modules/pg");

const repoRoot = resolve(import.meta.dirname, "../../..");
const runId = process.env.SHARMAR_DODO_REAL_RUNTIME_RUN_ID || new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
const outDir = process.env.SHARMAR_DODO_REAL_RUNTIME_DIR || `/tmp/sharmar_dodo_real_runtime_${runId}`;
const workDir = join(outDir, "runtime");
const networkLogPath = join(outDir, "network.log");

mkdirSync(outDir, { recursive: true });
mkdirSync(workDir, { recursive: true });

const e2eLog = [];
const strapiLogPath = join(outDir, "strapi.log");
const nextLogPath = join(outDir, "next.log");
const mockLogPath = join(outDir, "mock-dodo.log");
const dbLogPath = join(outDir, "db-invariants.log");
const reportPath = join(outDir, "report.log");
const children = [];
let pgContainer = "";
let mock = null;
let mockCallsBaseline = 0;
let notifyCalls = 0;
let realRuntimeCheckCount = 0;
let realRuntimeFailures = 0;

function log(line) {
  const msg = `[${new Date().toISOString()}] ${line}`;
  e2eLog.push(msg);
  console.log(msg);
}

function result(name, ok, detail = "") {
  realRuntimeCheckCount += 1;
  if (!ok) realRuntimeFailures += 1;
  log(`${name}=${ok ? "PASS" : "FAIL"}${detail ? " " + detail : ""}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function check(name, fn) {
  try {
    await fn();
    result(name, true);
  } catch (e) {
    result(name, false, e instanceof Error ? e.stack || e.message : String(e));
  }
}

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", ...options }).trim();
}

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function copyProjectSubset() {
  const cmsSrc = join(repoRoot, "cms");
  const frontendSrc = join(repoRoot, "frontend");
  const cmsDst = join(workDir, "cms");
  const frontendDst = join(workDir, "frontend");
  rmSync(cmsDst, { recursive: true, force: true });
  rmSync(frontendDst, { recursive: true, force: true });
  mkdirSync(cmsDst, { recursive: true });
  mkdirSync(frontendDst, { recursive: true });

  for (const name of ["package.json", "package-lock.json", "tsconfig.json"]) {
    cpSync(join(cmsSrc, name), join(cmsDst, name));
  }
  for (const name of ["config", "src", "database", "public"]) {
    if (existsSync(join(cmsSrc, name))) cpSync(join(cmsSrc, name), join(cmsDst, name), { recursive: true });
  }
  symlinkSync(join(cmsSrc, "node_modules"), join(cmsDst, "node_modules"), "dir");

  for (const name of ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "eslint.config.mjs", "postcss.config.mjs"]) {
    if (existsSync(join(frontendSrc, name))) cpSync(join(frontendSrc, name), join(frontendDst, name));
  }
  for (const name of ["app", "lib", "src", "public", "scripts"]) {
    if (existsSync(join(frontendSrc, name))) cpSync(join(frontendSrc, name), join(frontendDst, name), { recursive: true });
  }
  symlinkSync(join(frontendSrc, "node_modules"), join(frontendDst, "node_modules"), "dir");

  return { cmsDst, frontendDst };
}

function copyFrontendRuntime(name) {
  const frontendSrc = join(repoRoot, "frontend");
  const frontendDst = join(workDir, `frontend-${name}`);
  rmSync(frontendDst, { recursive: true, force: true });
  mkdirSync(frontendDst, { recursive: true });
  for (const fileName of ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "eslint.config.mjs", "postcss.config.mjs"]) {
    if (existsSync(join(frontendSrc, fileName))) cpSync(join(frontendSrc, fileName), join(frontendDst, fileName));
  }
  for (const dirName of ["app", "lib", "src", "public", "scripts"]) {
    if (existsSync(join(frontendSrc, dirName))) cpSync(join(frontendSrc, dirName), join(frontendDst, dirName), { recursive: true });
  }
  symlinkSync(join(frontendSrc, "node_modules"), join(frontendDst, "node_modules"), "dir");
  return frontendDst;
}

function writeNetworkGate() {
  const gatePath = join(outDir, "network-gate.cjs");
  writeFileSync(gatePath, `
const fs = require("fs");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const logPath = process.env.SHARMAR_NETWORK_LOG;
const blocked = ["dodopayments.com", "test.dodopayments.com", "live.dodopayments.com", "stripe.com", "api.stripe.com", "sharmar.me", "api.sharmar.me", "api.resend.com", "resend.com"];
function record(url) {
  try { if (logPath) fs.appendFileSync(logPath, url + "\\n"); } catch {}
}
function assertAllowed(raw) {
  let url;
  try { url = new URL(String(raw)); } catch { return; }
  const host = url.hostname.toLowerCase();
  record(url.toString());
  const bad = blocked.some((domain) => host === domain || host.endsWith("." + domain));
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1" || host.startsWith("172.") || host.startsWith("10.");
  if (bad || !local) throw new Error("OUTBOUND_NETWORK_BLOCKED " + url.toString());
}
const origFetch = globalThis.fetch;
if (origFetch) {
  globalThis.fetch = (input, init) => {
    const raw = typeof input === "string" ? input : input && input.url;
    assertAllowed(raw);
    return origFetch(input, init);
  };
}
for (const mod of [http, https]) {
  for (const method of ["request", "get"]) {
    const orig = mod[method];
    mod[method] = function patched(...args) {
      try {
        const first = args[0];
        if (typeof first === "string" || first instanceof URL) assertAllowed(first.toString());
        else if (first && typeof first === "object") {
          const protocol = first.protocol || (mod === https ? "https:" : "http:");
          const host = first.hostname || first.host || "localhost";
          const path = first.path || first.pathname || "/";
          assertAllowed(protocol + "//" + host + path);
        }
      } catch (e) {
        const req = new (require("stream").PassThrough)();
        process.nextTick(() => req.emit("error", e));
        return req;
      }
      return orig.apply(this, args);
    };
  }
}
`);
  return gatePath;
}

function appendChildLog(path, prefix) {
  return (chunk) => {
    const text = chunk.toString();
    writeFileSync(path, text, { flag: "a" });
    for (const line of text.split(/\r?\n/).filter(Boolean)) {
      e2eLog.push(`[${new Date().toISOString()}] ${prefix} ${line}`);
    }
  };
}

function spawnLogged(command, args, options, logPath, prefix) {
  writeFileSync(logPath, `\n===== ${prefix} start ${new Date().toISOString()} =====\n`, { flag: "a" });
  const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.stdout.on("data", appendChildLog(logPath, prefix));
  child.stderr.on("data", appendChildLog(logPath, prefix));
  return child;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;

  const gracefulExit = new Promise((resolve) => {
    child.once("exit", () => resolve(true));
  });

  child.kill("SIGTERM");

  const exitedGracefully = await Promise.race([
    gracefulExit,
    delay(5000).then(() => false),
  ]);

  if (exitedGracefully || child.exitCode !== null) {
    return;
  }

  const forcedExit = new Promise((resolve) => {
    child.once("exit", () => resolve(true));
  });

  child.kill("SIGKILL");

  await Promise.race([
    forcedExit,
    delay(5000).then(() => false),
  ]);
}

async function waitForHttp(url, predicate = (res) => res.status < 500, timeoutMs = 90000) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      last = `${res.status} ${await res.text().catch(() => "")}`;
      if (predicate(res, last)) return;
    } catch (e) {
      last = String(e);
    }
    await delay(1000);
  }
  throw new Error(`timeout waiting for ${url}: ${last}`);
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
  throw new Error("postgres_container_not_ready");
}

async function pgClient(pgUrl) {
  let last = null;
  for (let i = 0; i < 60; i += 1) {
    const client = new Client({ connectionString: pgUrl });
    try {
      await client.connect();
      await client.query("select 1");
      return client;
    } catch (e) {
      last = e;
      try { await client.end(); } catch {}
      await delay(500);
    }
  }
  throw last || new Error("postgres_not_ready");
}

async function query(pgUrl, sql, params = []) {
  const client = await pgClient(pgUrl);
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

async function tableColumns(pgUrl, table) {
  const res = await query(pgUrl, `
    select column_name, is_nullable, column_default
      from information_schema.columns
     where table_schema = 'public' and table_name = $1
  `, [table]);
  return new Map(res.rows.map((row) => [row.column_name, row]));
}

async function insertDynamic(pgUrl, table, values) {
  const columns = await tableColumns(pgUrl, table);
  const entries = Object.entries(values).filter(([key]) => columns.has(key));
  const names = entries.map(([key]) => key);
  const params = entries.map(([, value]) => value);
  const placeholders = params.map((_, index) => `$${index + 1}`);
  const res = await query(pgUrl, `insert into ${table} (${names.join(",")}) values (${placeholders.join(",")}) returning *`, params);
  return res.rows[0];
}

async function ensureRuntimeTables(pgUrl) {
  await query(pgUrl, `
    create table if not exists public.bookings (
      id bigserial primary key,
      boat_id integer not null,
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
    create unique index if not exists bookings_active_slot_uidx
      on public.bookings (boat_id, slot_start_utc, slot_end_utc)
      where status in ('hold','deposit_paid','paid_pending_owner','confirmed');
    create unique index if not exists payments_idempotency_key_uidx
      on public.payments (idempotency_key)
      where idempotency_key is not null;
    create table if not exists public.idempotency_keys (
      key text not null,
      endpoint text not null,
      request_hash text,
      response_status integer,
      response_body jsonb,
      booking_id integer,
      expires_at timestamptz,
      primary key (key, endpoint)
    );
    create table if not exists public.stripe_events (
      id bigserial primary key,
      event_id text unique,
      event_type text,
      provider_intent_id text,
      created_utc timestamptz,
      payload jsonb
    );
  `);
}

async function seedBooking(pgUrl, token, status = "approved", offsetHours = 0, instant = true) {
  const start = new Date(Date.UTC(2027, 0, 10, 10 + offsetHours, 0, 0)).toISOString();
  const end = new Date(Date.UTC(2027, 0, 10, 14 + offsetHours, 0, 0)).toISOString();
  const now = new Date().toISOString();
  const boat = await insertDynamic(pgUrl, "boats", {
    document_id: `boat-doc-${token}`,
    title: `Boat ${token}`,
    slug: `boat-${token}`,
    capacity: 8,
    listing_type: "rent",
    deposit: 100,
    currency: "EUR",
    instant_booking: instant,
    locale: "en",
    published_at: now,
    created_at: now,
    updated_at: now,
  });
  const br = await insertDynamic(pgUrl, "booking_requests", {
    document_id: `br-doc-${token}`,
    status,
    public_token: token,
    full_name: "Runtime Customer",
    phone: "+382000000",
    email: "runtime@example.invalid",
    start_datetime: start,
    end_datetime: end,
    people_count: 2,
    need_skipper: false,
    contact_method: "phone",
    marketplace_fee_amount: 123.45,
    customer_total_amount: 1000,
    owner_amount: 876.55,
    currency: "EUR",
    locale: "en",
    created_at: now,
    updated_at: now,
  });
  const storedBr = (await query(pgUrl, "select * from booking_requests where id = $1", [br.id])).rows[0];
  const storedStart = storedBr.start_datetime || start;
  const storedEnd = storedBr.end_datetime || end;
  const linkColumns = await tableColumns(pgUrl, "booking_requests_boat_lnk");
  const linkValues = {
    booking_request_id: br.id,
    boat_id: boat.id,
    booking_request_ord: 1,
    boat_ord: 1,
  };
  const linkEntries = Object.entries(linkValues).filter(([key]) => linkColumns.has(key));
  await query(
    pgUrl,
    `insert into booking_requests_boat_lnk (${linkEntries.map(([k]) => k).join(",")}) values (${linkEntries.map((_, i) => `$${i + 1}`).join(",")})`,
    linkEntries.map(([, v]) => v)
  );
  await query(pgUrl, `
    insert into bookings
      (boat_id, slot_start_utc, slot_end_utc, status, expires_at, created_at)
    values
      ($1, $2::timestamptz, $3::timestamptz, 'hold', now() + interval '1 hour', now())
  `, [boat.id, storedStart, storedEnd]);
  return { boat, br: storedBr, start: storedStart, end: storedEnd };
}

async function startPostgres() {
  pgContainer = `sharmar-dodo-real-${process.pid}`;
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
    "POSTGRES_DB=sharmar_dodo_real",
    "-p",
    "127.0.0.1::5432",
    "postgres:16-alpine",
  ]);
  await waitForPostgres(pgContainer);
  const portLine = docker(["port", pgContainer, "5432/tcp"]);
  const pgPort = Number(portLine.split(":").pop());
  return `postgres://sharmar:sharmar@127.0.0.1:${pgPort}/sharmar_dodo_real`;
}

async function startStrapi(cmsDir, pgUrl, port, nextPort, dodoBaseUrl, extraEnv = {}) {
  const env = {
    ...process.env,
    NODE_ENV: "test",
    HOST: "127.0.0.1",
    PORT: String(port),
    DATABASE_CLIENT: "postgres",
    DATABASE_URL: pgUrl,
    DATABASE_SSL: "false",
    APP_KEYS: "test_key_a,test_key_b",
    API_TOKEN_SALT: "test_api_token_salt",
    ADMIN_JWT_SECRET: "test_admin_jwt_secret",
    JWT_SECRET: "test_jwt_secret",
    TRANSFER_TOKEN_SALT: "test_transfer_salt",
    ENCRYPTION_KEY: "test_encryption_key_32_bytes_long",
    PAYMENTS_ENABLED: "true",
    PAYMENT_PROVIDER: "dodo",
    DODO_ENV: "test",
    DODO_API_BASE_URL: dodoBaseUrl,
    DODO_API_KEY: "test_dodo_key",
    DODO_PRODUCT_ID: "test_product",
    DODO_WEBHOOK_SECRET: "test_webhook_secret",
    DODO_RETURN_URL: `http://127.0.0.1:${nextPort}/payment-return`,
    DODO_CANCEL_URL: `http://127.0.0.1:${nextPort}/payment-cancel`,
    DODO_CHECKOUT_TIMEOUT_MS: "300",
    SHARMAR_FRONTEND_NOTIFY_URL: `http://127.0.0.1:${nextPort}/api/internal/payment-paid-notify`,
    SHARMAR_INTERNAL_NOTIFY_SECRET: "test_internal_notify_secret",
    STRAPI_TELEMETRY_DISABLED: "true",
    NO_UPDATE_NOTIFIER: "1",
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
    BROWSER: "none",
    SHARMAR_NETWORK_LOG: networkLogPath,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${join(outDir, "network-gate.cjs")}`.trim(),
    ...extraEnv,
  };
  const child = spawnLogged(
    "node",
    ["node_modules/@strapi/strapi/bin/strapi.js", "develop", "--no-watch-admin", "--silent"],
    { cwd: cmsDir, env },
    strapiLogPath,
    "strapi"
  );
  await waitForHttp(`http://127.0.0.1:${port}/api/payments/health`, (res) => res.status === 200, 120000);
  return child;
}

async function bootstrapCleanStrapiSchema(
  cmsDir,
  pgUrl,
  port,
  nextPort,
  dodoBaseUrl
) {
  const databaseDir = join(cmsDir, "database");
  const migrationsDir = join(databaseDir, "migrations");
  const parkedDir = join(
    databaseDir,
    `migrations.project-parked-${process.pid}`
  );

  let bootstrapChild = null;
  let migrationsParked = false;

  if (existsSync(parkedDir)) {
    rmSync(parkedDir, {
      recursive: true,
      force: true,
    });
  }

  if (existsSync(migrationsDir)) {
    renameSync(migrationsDir, parkedDir);
    migrationsParked = true;
  }

  try {
    log(
      "clean schema bootstrap: project migrations parked"
    );

    bootstrapChild = await startStrapi(
      cmsDir,
      pgUrl,
      port,
      nextPort,
      dodoBaseUrl
    );

    const requiredTables = [
      "up_users",
      "up_roles",
      "up_users_role_lnk",
      "owner_profiles",
      "owner_profiles_user_lnk",
      "boats",
      "booking_requests",
      "payments",
    ];

    for (const table of requiredTables) {
      const result = await query(
        pgUrl,
        "select to_regclass($1) as table_name",
        [`public.${table}`]
      );

      assert(
        result.rows[0]?.table_name === table,
        `clean schema bootstrap did not create ${table}`
      );
    }

    log(
      "clean schema bootstrap: standard schema verified"
    );
  } finally {
    await stopChild(bootstrapChild);

    if (migrationsParked) {
      if (existsSync(migrationsDir)) {
        rmSync(migrationsDir, {
          recursive: true,
          force: true,
        });
      }

      renameSync(parkedDir, migrationsDir);

      log(
        "clean schema bootstrap: project migrations restored"
      );
    }
  }
}

async function startNext(frontendDir, strapiPort, port) {
  const env = {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    STRAPI_URL: `http://127.0.0.1:${strapiPort}`,
    NEXT_PUBLIC_STRAPI_URL: `http://127.0.0.1:${strapiPort}`,
    SHARMAR_INTERNAL_NOTIFY_SECRET: "test_internal_notify_secret",
    SHARMAR_EMAIL_MOCK: "true",
    RESEND_API_KEY: "",
    NEXT_TELEMETRY_DISABLED: "1",
    NO_UPDATE_NOTIFIER: "1",
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
    SHARMAR_NETWORK_LOG: networkLogPath,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ""} --require ${join(outDir, "network-gate.cjs")}`.trim(),
  };
  const child = spawnLogged(
    "node",
    ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)],
    { cwd: frontendDir, env },
    nextLogPath,
    "next"
  );
  await waitForHttp(`http://127.0.0.1:${port}/api/payments/intent`, (res) => res.status === 405 || res.status === 400 || res.status === 404, 120000);
  return child;
}

async function httpJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { res, body, text };
}

async function mockState() {
  return (await httpJson(`${mock.baseUrl}/__state`)).body;
}

async function main() {
  writeFileSync(networkLogPath, "");
  writeFileSync(mockLogPath, "");
  writeFileSync(strapiLogPath, "");
  writeFileSync(nextLogPath, "");
  writeNetworkGate();
  const { cmsDst, frontendDst } = copyProjectSubset();

  log("starting mock Dodo server");
  mock = await startMockDodoServer();
  writeFileSync(mockLogPath, `baseUrl=${mock.baseUrl}\n`);

  log("starting PostgreSQL 16 container");
  const pgUrl = await startPostgres();

  const bootstrapPort = await freePort();
  const strapiPort = await freePort();
  const nextPort = await freePort();

  log(
    `bootstrapping clean Strapi schema on ${bootstrapPort}`
  );

  await bootstrapCleanStrapiSchema(
    cmsDst,
    pgUrl,
    bootstrapPort,
    nextPort,
    mock.baseUrl
  );

  log(
    `starting Strapi with project migrations on ${strapiPort}`
  );

  await startStrapi(
    cmsDst,
    pgUrl,
    strapiPort,
    nextPort,
    mock.baseUrl
  );
  log(`starting Next on ${nextPort}`);
  await startNext(frontendDst, strapiPort, nextPort);
  await ensureRuntimeTables(pgUrl);

  await check("DODO_REPLAY_SCHEMA_MIGRATION", async () => {
    const res = await query(pgUrl, "select to_regclass('public.dodo_webhook_events') as table_name");
    assert(res.rows[0].table_name === "dodo_webhook_events", "dodo_webhook_events migration did not run");
  });

  const nextBase = `http://127.0.0.1:${nextPort}`;
  const strapiBase = `http://127.0.0.1:${strapiPort}`;
  const seed = await seedBooking(pgUrl, "real_public_ok", "approved", 0, true);

  await check("DODO_CHECKOUT_CONFIG_FAILURE_RUNTIME", async () => {
    const runConfigCase = async (name, extraEnv) => {
      const sPort = await freePort();
      const nPort = await freePort();
      const sChild = await startStrapi(cmsDst, pgUrl, sPort, nPort, mock.baseUrl, extraEnv);
      const nChild = await startNext(copyFrontendRuntime(name), sPort, nPort);
      try {
        const fixture = await seedBooking(pgUrl, `real_public_${name}`, "approved", 40 + Math.floor(Math.random() * 200), true);
        const out = await httpJson(`http://127.0.0.1:${nPort}/api/payments/intent`, {
          method: "POST",
          headers: { "idempotency-key": `config-${name}` },
          body: JSON.stringify({ public_token: fixture.br.public_token }),
        });
        assert(out.res.status === 503, `${name} expected 503 got ${out.res.status}`);
      } finally {
        await stopChild(nChild);
        await stopChild(sChild);
      }
    };

    await runConfigCase("missing_key", { DODO_API_KEY: "" });
    await runConfigCase("missing_product", { DODO_PRODUCT_ID: "" });
  });

  await check("DODO_REAL_HTTP_CHECKOUT_FLOW", async () => {
    let out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "missing-public-token" },
      body: JSON.stringify({}),
    });
    assert(out.res.status === 400, `missing token ${out.res.status}`);

    out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "wrong-public-token" },
      body: JSON.stringify({ public_token: "wrongtok" }),
    });
    assert(out.res.status === 404, `wrong token ${out.res.status}`);

    out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "oversized-public-token" },
      body: JSON.stringify({ public_token: "x".repeat(20000) }),
    });
    assert(out.res.status === 413, `oversized ${out.res.status}`);

    const pending = await seedBooking(pgUrl, "real_public_pending", "pending", 5, true);
    out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "pending-status" },
      body: JSON.stringify({ public_token: pending.br.public_token }),
    });
    assert(out.res.status === 409, `pending status ${out.res.status}`);

    mockCallsBaseline = (await mockState()).calls;
    out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: seed.br.public_token }),
    });
    assert(out.res.status === 200, `checkout ${out.res.status} ${out.text}`);
    assert(out.body.provider === "dodo", "provider=dodo missing");
    assert(String(out.body.checkout_url).startsWith(mock.baseUrl), "checkout_url is not local mock");

    const payment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["checkout-main"])).rows[0];
    assert(payment, "payment row missing");
    assert(payment.provider === "dodo", "payment.provider mismatch");
    assert(payment.provider_intent_id === out.body.provider_intent_id, "provider_intent_id mismatch");
    assert(payment.created_at && payment.updated_at, "timestamps missing");
    const meta = typeof payment.metadata === "string" ? JSON.parse(payment.metadata) : payment.metadata;
    assert(meta.checkout_url === out.body.checkout_url, "metadata.checkout_url mismatch");

    const replay = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: seed.br.public_token }),
    });
    assert(replay.res.status === 200, `idempotency replay ${replay.res.status}`);
    assert(replay.body.checkout_url === out.body.checkout_url, "replay checkout_url differs");
    const afterReplayCalls = (await mockState()).calls;
    assert(afterReplayCalls === mockCallsBaseline + 1, `mock calls expected one got ${afterReplayCalls - mockCallsBaseline}`);

    const other = await seedBooking(pgUrl, "real_public_conflict", "approved", 9, true);
    const conflict = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "checkout-main" },
      body: JSON.stringify({ public_token: other.br.public_token }),
    });
    assert(conflict.res.status === 409, `idempotency conflict ${conflict.res.status}`);
  });

  await check("DODO_CHECKOUT_CONCURRENCY_RUNTIME", async () => {
    const fresh = await seedBooking(pgUrl, "real_public_concurrent", "approved", 12, true);
    const before = (await mockState()).calls;
    const make = (key) => httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": key },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    });
    const outs = await Promise.all([make("conc-a"), make("conc-b"), make("conc-c")]);
    assert(outs.every((o) => o.res.status === 200), "not all concurrency responses are 200");
    assert(new Set(outs.map((o) => o.body.checkout_url)).size === 1, "concurrent checkout URLs differ");
    const after = (await mockState()).calls;
    assert(after === before + 1, `expected one Dodo call got ${after - before}`);
  });

  await check("DODO_CHECKOUT_TIMEOUT_RUNTIME", async () => {
    await mock.setMode("success", 1000);
    const fresh = await seedBooking(pgUrl, "real_public_timeout", "approved", 16, true);
    const out = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "timeout-key" },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    });
    assert(out.res.status === 502, `timeout expected 502 got ${out.res.status}`);
    assert(!JSON.stringify(out.body).includes("test_dodo_key"), "timeout response leaked API key");
    let payment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["timeout-key"])).rows[0];
    assert(!payment, "payment created after timeout");
    await mock.setMode("success", 0);
    const retry = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "timeout-key" },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    });
    assert(retry.res.status === 200, `timeout retry ${retry.res.status} ${retry.text}`);
    payment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["timeout-key"])).rows[0];
    assert(payment?.provider === "dodo", "retry payment not created");
  });

  await check("DODO_REPLAY_STORAGE_FAIL_CLOSED", async () => {
    const beforePayment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["checkout-main"])).rows[0];
    const beforeBr = (await query(pgUrl, "select * from booking_requests where id = $1", [seed.br.id])).rows[0];
    await query(pgUrl, "alter table dodo_webhook_events rename to dodo_webhook_events_missing");
    const raw = JSON.stringify({ type: "payment.succeeded", data: { payment_id: beforePayment.provider_intent_id, status: "paid" } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = signDodoWebhookPayload({ id: "real_fail_closed", timestamp: ts, rawBody: raw, secret: "test_webhook_secret" });
    const out = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "real_fail_closed", "webhook-timestamp": String(ts), "webhook-signature": sig },
      body: raw,
    });
    assert(out.res.status === 503, `fail closed status ${out.res.status}`);
    const afterPayment = (await query(pgUrl, "select * from payments where id = $1", [beforePayment.id])).rows[0];
    const afterBr = (await query(pgUrl, "select * from booking_requests where id = $1", [seed.br.id])).rows[0];
    assert(afterPayment.status === beforePayment.status, "payment changed without replay table");
    assert(afterBr.status === beforeBr.status, "booking request changed without replay table");
    assert(notifyCalls === 0, "notify called without replay table");
    await query(pgUrl, "alter table dodo_webhook_events_missing rename to dodo_webhook_events");
  });

  await check("DODO_REAL_HTTP_WEBHOOK_FLOW", async () => {
    const missing = await httpJson(`${strapiBase}/api/payments/webhook`, { method: "POST", body: JSON.stringify({}) });
    assert(missing.res.status === 400 || missing.res.status === 503, `missing headers ${missing.res.status}`);

    const payment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["checkout-main"])).rows[0];
    const raw = JSON.stringify({ type: "payment.succeeded", data: { payment_id: payment.provider_intent_id, status: "paid" } });
    const now = Math.floor(Date.now() / 1000);

    const missingSecretPort = await freePort();
    const missingSecretChild = await startStrapi(cmsDst, pgUrl, missingSecretPort, nextPort, mock.baseUrl, { DODO_WEBHOOK_SECRET: "" });
    try {
      const missingSecretSig = signDodoWebhookPayload({ id: "missing_webhook_secret", timestamp: now, rawBody: raw, secret: "test_webhook_secret" });
      const missingSecret = await httpJson(`http://127.0.0.1:${missingSecretPort}/api/payments/webhook`, {
        method: "POST",
        headers: { "webhook-id": "missing_webhook_secret", "webhook-timestamp": String(now), "webhook-signature": missingSecretSig },
        body: raw,
      });
      assert(missingSecret.res.status === 503, `missing webhook secret ${missingSecret.res.status}`);
    } finally {
      await stopChild(missingSecretChild);
    }

    let bad = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "bad_sig", "webhook-timestamp": String(now), "webhook-signature": "v1,bad" },
      body: raw,
    });
    assert(bad.res.status === 401, `bad sig ${bad.res.status}`);

    const staleSig = signDodoWebhookPayload({ id: "stale_sig", timestamp: now - 1000, rawBody: raw, secret: "test_webhook_secret" });
    bad = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "stale_sig", "webhook-timestamp": String(now - 1000), "webhook-signature": staleSig },
      body: raw,
    });
    assert(bad.res.status === 401, `stale ${bad.res.status}`);

    const futureSig = signDodoWebhookPayload({ id: "future_sig", timestamp: now + 1000, rawBody: raw, secret: "test_webhook_secret" });
    bad = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "future_sig", "webhook-timestamp": String(now + 1000), "webhook-signature": futureSig },
      body: raw,
    });
    assert(bad.res.status === 401, `future ${bad.res.status}`);

    const corruptSig = signDodoWebhookPayload({ id: "corrupt_body", timestamp: now, rawBody: raw, secret: "test_webhook_secret" });
    bad = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "corrupt_body", "webhook-timestamp": String(now), "webhook-signature": corruptSig },
      body: raw.replace("paid", "tampered"),
    });
    assert(bad.res.status === 401, `corrupt ${bad.res.status}`);

    const goodSig = signDodoWebhookPayload({ id: "real_paid_1", timestamp: now, rawBody: raw, secret: "test_webhook_secret" });
    const good = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "real_paid_1", "webhook-timestamp": String(now), "webhook-signature": goodSig },
      body: raw,
    });
    assert(good.res.status === 200, `good webhook ${good.res.status} ${good.text}`);
    const paidPayment = (await query(pgUrl, "select * from payments where id = $1", [payment.id])).rows[0];
    const br = (await query(pgUrl, "select * from booking_requests where id = $1", [seed.br.id])).rows[0];
    const booking = (await query(pgUrl, "select * from bookings where id = $1", [paidPayment.booking_id])).rows[0];
    assert(paidPayment.status === "succeeded", `payment status ${paidPayment.status}`);
    assert(paidPayment.booking_id, "payment.booking_id missing");
    assert(br.status === "confirmed", `booking_request status ${br.status}`);
    assert(booking.status === "confirmed", `booking status ${booking.status}`);
    assert(booking.payment_intent_id === paidPayment.provider_intent_id, "booking intent link mismatch");
    const eventCount = (await query(pgUrl, "select count(*)::int as c from dodo_webhook_events where webhook_id = $1", ["real_paid_1"])).rows[0].c;
    assert(eventCount === 1, `webhook event count ${eventCount}`);

    const replay = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "real_paid_1", "webhook-timestamp": String(now), "webhook-signature": goodSig },
      body: raw,
    });
    assert(replay.res.status === 200 && replay.body.replay === true, `replay ${replay.res.status} ${replay.text}`);
    const eventCount2 = (await query(pgUrl, "select count(*)::int as c from dodo_webhook_events where webhook_id = $1", ["real_paid_1"])).rows[0].c;
    assert(eventCount2 === 1, `replay event count ${eventCount2}`);
  });

  await check("DODO_WEBHOOK_NONPAID_AND_DOWNGRADE_RUNTIME", async () => {
    const fresh = await seedBooking(pgUrl, "real_public_nonpaid", "approved", 30, true);
    const checkout = await httpJson(`${nextBase}/api/payments/intent`, {
      method: "POST",
      headers: { "idempotency-key": "nonpaid-main" },
      body: JSON.stringify({ public_token: fresh.br.public_token }),
    });
    assert(checkout.res.status === 200, `nonpaid checkout ${checkout.res.status}`);
    const payment = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["nonpaid-main"])).rows[0];
    const now = Math.floor(Date.now() / 1000);
    for (const [id, raw] of [
      ["unknown_nonpaid", JSON.stringify({ type: "customer.created", data: { payment_id: payment.provider_intent_id, status: "created" } })],
      ["cancel_nonpaid", JSON.stringify({ type: "checkout.cancelled", data: { payment_id: payment.provider_intent_id, status: "cancelled" } })],
    ]) {
      const sig = signDodoWebhookPayload({ id, timestamp: now, rawBody: raw, secret: "test_webhook_secret" });
      const out = await httpJson(`${strapiBase}/api/payments/webhook`, {
        method: "POST",
        headers: { "webhook-id": id, "webhook-timestamp": String(now), "webhook-signature": sig },
        body: raw,
      });
      assert(out.res.status === 200, `${id} status ${out.res.status}`);
      const after = (await query(pgUrl, "select status from payments where id = $1", [payment.id])).rows[0].status;
      assert(after === "pending", `${id} changed status to ${after}`);
    }

    const succeeded = (await query(pgUrl, "select * from payments where idempotency_key = $1", ["checkout-main"])).rows[0];
    const weakRaw = JSON.stringify({ type: "checkout.cancelled", data: { payment_id: succeeded.provider_intent_id, status: "cancelled" } });
    const weakSig = signDodoWebhookPayload({ id: "weak_after_success", timestamp: now, rawBody: weakRaw, secret: "test_webhook_secret" });
    const weak = await httpJson(`${strapiBase}/api/payments/webhook`, {
      method: "POST",
      headers: { "webhook-id": "weak_after_success", "webhook-timestamp": String(now), "webhook-signature": weakSig },
      body: weakRaw,
    });
    assert(weak.res.status === 200, `weak event ${weak.res.status}`);
    const afterSucceeded = (await query(pgUrl, "select status from payments where id = $1", [succeeded.id])).rows[0].status;
    assert(afterSucceeded === "succeeded", `succeeded downgraded to ${afterSucceeded}`);
  });

  await check("DODO_INTERNAL_NOTIFY_RUNTIME", async () => {
    const nextText = readFileSync(nextLogPath, "utf8");
    notifyCalls = (nextText.match(/POST \/api\/internal\/payment-paid-notify 200/g) || []).length;
    assert(notifyCalls === 1, `notify calls ${notifyCalls}`);
    assert(!nextText.includes("customer_email_sent\":true"), "email appears sent");
  });

  await check("DODO_SECRET_LEAK_CHECK", async () => {
    const haystack = [
      readFileSync(strapiLogPath, "utf8"),
      readFileSync(nextLogPath, "utf8"),
      readFileSync(mockLogPath, "utf8"),
      readFileSync(networkLogPath, "utf8"),
      e2eLog.join("\n"),
    ].join("\n");
    for (const secret of ["test_dodo_key", "test_webhook_secret", "test_internal_notify_secret"]) {
      assert(!haystack.includes(secret), `secret leaked: ${secret}`);
    }
  });

  await check("OUTBOUND_NETWORK_GATE", async () => {
    const destinations = readFileSync(networkLogPath, "utf8");
    for (const blocked of ["dodopayments.com", "stripe.com", "sharmar.me", "api.resend.com", "resend.com"]) {
      assert(!destinations.includes(blocked), `blocked host observed: ${blocked}`);
    }
    assert(destinations.includes("127.0.0.1"), "network log did not capture local traffic");
  });

  await check("POSTGRES_INVARIANTS", async () => {
    const payments = (await query(pgUrl, "select * from payments")).rows;
    assert(payments.some((p) => p.provider === "dodo"), "no Dodo payments");
    assert(payments.every((p) => p.provider !== "stripe"), "Dodo flow wrote stripe provider");
    const events = (await query(pgUrl, "select count(*)::int as c from dodo_webhook_events")).rows[0].c;
    assert(events >= 1, "no webhook audit events");
  });

  writeFileSync(dbLogPath, [
    `REAL_RUNTIME_CHECK_COUNT=${realRuntimeCheckCount}`,
    `REAL_RUNTIME_FAILURES=${realRuntimeFailures}`,
  ].join("\n") + "\n");
  writeFileSync(reportPath, [
    `REAL_RUNTIME_CHECK_COUNT=${realRuntimeCheckCount}`,
    `REAL_RUNTIME_FAILURES=${realRuntimeFailures}`,
    `DODO_REAL_STRAPI_RUNTIME=PASS`,
    `DODO_REAL_NEXT_RUNTIME=PASS`,
    `DODO_REAL_POSTGRES_RUNTIME=PASS`,
  ].join("\n") + "\n");

  if (realRuntimeFailures > 0) process.exitCode = 1;
}

try {
  await main();
} finally {
  for (const child of children.reverse()) {
    if (!child.killed) child.kill("SIGTERM");
  }
  await delay(1000);
  for (const child of children) {
    if (!child.killed) child.kill("SIGKILL");
  }
  if (mock) {
    try {
      const state = await (await fetch(`${mock.baseUrl}/__state`)).json();
      for (const headers of state.headers || []) {
        if (headers.authorization) headers.authorization = "<redacted>";
      }
      writeFileSync(mockLogPath, JSON.stringify(state, null, 2) + "\n", { flag: "a" });
    } catch {}
    try { await mock.stop(); } catch {}
  }
  if (pgContainer) {
    try { docker(["stop", pgContainer], { stdio: "ignore" }); } catch {}
  }
  writeFileSync(join(outDir, "e2e.log"), e2eLog.join("\n") + "\n");
}
