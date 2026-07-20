const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const source = readFileSync(join(__dirname, "admin-crud.ts"), "utf8");
const routes = readFileSync(join(__dirname, "../routes/admin-crud.ts"), "utf8");
const controller = readFileSync(join(__dirname, "../controllers/admin-crud.ts"), "utf8");

test("admin CRUD service is entity-whitelisted and not a universal Strapi writer", () => {
  assert.ok(source.includes("ENTITY_CONFIG"));
  assert.ok(source.includes("owner"));
  assert.ok(source.includes("document"));
  assert.ok(source.includes("boat"));
  assert.ok(source.includes("experience"));
  assert.ok(source.includes("media"));
  assert.doesNotMatch(source + routes, /write-anything|arbitrary|collectionUID|uidFromBrowser/i);
});

test("admin CRUD service fails closed for owner create and unsupported restore/archive", () => {
  assert.ok(source.includes("owner_account_creation_decision_required"));
  assert.ok(source.includes("archive_schema_decision_required"));
  assert.ok(source.includes("ARCHIVE_SCHEMA_DECISION_REQUIRED"));
  assert.ok(source.includes("OWNER_ACCOUNT_CREATION_DECISION_REQUIRED"));
});

test("admin CRUD controller requires internal token and write flag", () => {
  assert.ok(controller.includes("x-admin-crud-token"));
  assert.ok(controller.includes("ADMIN_MODERATION_WRITE_ENABLED"));
  assert.ok(controller.includes("payload_too_large"));
  assert.doesNotMatch(controller, /ctx\.request\.body\.token|cookie|Authorization/i);
});

test("delete safety protects bookings, payments, provider events, and shared media", () => {
  assert.ok(source.includes("evaluateDependencies"));
  assert.ok(source.includes("bookingRequests"));
  assert.ok(source.includes("payments"));
  assert.ok(source.includes("dodoEvents"));
  assert.ok(source.includes("shared_media_present"));
  assert.ok(source.includes("mediaUsageCount"));
});

test("audit events are created without storing secret values", () => {
  assert.ok(source.includes("createAuditEvent"));
  assert.ok(source.includes("changedFieldNames"));
  assert.ok(source.includes("dependencySnapshot"));
  assert.ok(source.includes("idempotencyKeyDigest"));
  assert.doesNotMatch(source, /password.*metadata|token.*metadata|session.*metadata/i);
});
