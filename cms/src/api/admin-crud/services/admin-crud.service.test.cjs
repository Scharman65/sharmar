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

test("admin CRUD service creates owners with forced password change and supports true archive/restore", () => {
  assert.ok(source.includes("createOwner"));
  assert.ok(source.includes("generateTemporaryPassword"));
  assert.ok(source.includes("must_change_password"));
  assert.ok(source.includes("oneTimeSecret"));
  assert.ok(source.includes("data.archived_at = new Date().toISOString()"));
  assert.ok(source.includes("data.archived_at = null"));
  assert.ok(source.includes("archive_blocked_by_dependencies"));
  assert.doesNotMatch(source, /temporaryPassword.*metadata|password.*metadata/i);
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

test("document and media uploads are attached through whitelisted relation fields", () => {
  assert.ok(source.includes("attachDocument"));
  assert.ok(source.includes("attachMedia"));
  assert.ok(source.includes("documentField"));
  assert.ok(source.includes("mediaRelationField"));
  assert.ok(source.includes("passport_document"));
  assert.ok(source.includes("identity_document"));
  assert.ok(source.includes("api::owner-profile.owner-profile"));
  assert.doesNotMatch(source, /fieldNameFromBrowser|filesystem path|wildcard/i);
});

test("audit events are created without storing secret values", () => {
  assert.ok(source.includes("createAuditEvent"));
  assert.ok(source.includes("changedFieldNames"));
  assert.ok(source.includes("dependencySnapshot"));
  assert.ok(source.includes("idempotencyKeyDigest"));
  assert.doesNotMatch(source, /password.*metadata|token.*metadata|session.*metadata/i);
});

test("boat and experience lifecycle actions fail closed in admin CRUD and must use moderation workflow", () => {
  assert.ok(source.includes('"moderation_workflow_required"'));
  assert.ok(source.includes('entity === "boat" || entity === "experience"'));
  assert.ok(source.includes('normalized.input.action === "unpublish"'));
  assert.ok(source.includes('normalized.input.action === "archive"'));
  assert.ok(source.includes('normalized.input.action === "restore"'));
});


test("dependency semantics use logical counts, owner scope, and published-state protection", () => {
  assert.ok(source.includes("count(distinct document_id)::int as count"));
  assert.ok(source.includes("count(distinct e.document_id)::int as count"));
  assert.ok(source.includes("count(distinct l.booking_request_id)::int as count"));
  assert.ok(source.includes("count(distinct p.id)::int as count"));
  assert.ok(source.includes("from public.dodo_webhook_events de join public.payments p on p.provider_intent_id = de.provider_intent_id"));
  assert.ok(source.includes("published_entity_present"));
  assert.doesNotMatch(source, /from public.booking_requests where owner_user_id/);
  assert.doesNotMatch(source, /from public.dodo_events/);
});
