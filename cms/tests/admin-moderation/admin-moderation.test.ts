import assert from "node:assert/strict";
import test from "node:test";

import { createAdminModerationService } from "../../dist/src/api/admin-moderation/services/admin-moderation.js";

type JsonObject = Record<string, unknown>;

function fakeCms(params?: {
  boatStatus?: string;
  ownerStatus?: string;
	  locales?: string[];
	  mediaCount?: number;
	  routeMediaCount?: number;
	  documentCount?: number;
	  includeRoutes?: boolean;
	  routeLocales?: string[];
	  routeIncomplete?: boolean;
	  boatMissingMarina?: boolean;
	  publishFailure?: boolean;
	  publishedLocales?: string[];
	  routeLatestStatus?: string;
	}) {
	  const calls: Array<{ name: string; payload: unknown }> = [];
	  const locales = params?.locales ?? ["ru", "en", "sr-Latn-ME"];
	  const routeLocales = params?.routeLocales ?? ["ru", "en", "sr-Latn-ME"];

  const boatRows = locales.map((locale, index) => ({
	    id: index + 1,
	    documentId: "boat-doc",
	    locale,
	    publishedAt: params?.publishedLocales?.includes(locale) ? "2026-07-01T00:00:00.000Z" : null,
    title: `Boat ${locale}`,
    slug: `boat-${locale}`,
	    moderation_status: params?.publishedLocales?.includes(locale) ? "published" : params?.boatStatus ?? "submitted",
	    owner_user_id: 10,
	    created_by_id: 10,
	    home_marina: params?.boatMissingMarina
	      ? null
	      : { id: 30, documentId: "marina-doc", name: "Porto Montenegro" },
	  }));

	  const experienceRows = params?.includeRoutes === false
	    ? []
	    : routeLocales.map((locale, index) => ({
	        id: index + 101,
	        documentId: "petrovac-route",
	        locale,
	        publishedAt: null,
	        title: params?.routeIncomplete && locale === "en" ? "" : `Petrovac ${locale}`,
	        slug: `petrovac-${locale}`,
	        duration_hours: 6,
	        price: 500,
	        currency: "EUR",
	        is_active: false,
	        updatedAt: "2026-07-01T00:00:00.000Z",
	        boat: boatRows[0],
	      }));

  const ownerProfile = {
    id: 20,
    verification_status: params?.ownerStatus ?? "approved",
    documents_uploaded_at: "2026-07-01T00:00:00.000Z",
    verified_at: null,
    rejected_at: null,
    rejection_reason: null,
  };

  const cms = {
    db: {
      query(uid: string) {
        return {
	          async findMany() {
	            calls.push({ name: `${uid}.findMany`, payload: null });
	            if (uid === "api::moderation-event.moderation-event" && params?.routeLatestStatus) {
	              return [
	                {
	                  id: 500,
	                  action: params.routeLatestStatus,
	                  previous_status: "under_review",
	                  new_status: params.routeLatestStatus,
	                  occurred_at: "2026-07-02T00:00:00.000Z",
	                  metadata: {
	                    subjectEntityType: "experience",
	                    subjectDocumentId: "petrovac-route",
	                  },
	                },
	              ];
	            }
	            if (uid === "api::boat.boat") return boatRows;
	            if (uid === "api::experience.experience") return experienceRows;
	            return [];
	          },
          async findOne() {
            calls.push({ name: `${uid}.findOne`, payload: null });
            return uid === "api::owner-profile.owner-profile"
              ? ownerProfile
              : null;
          },
          async update(payload: unknown) {
            calls.push({ name: `${uid}.update`, payload });
            return {};
          },
          async create(payload: unknown) {
            calls.push({ name: `${uid}.create`, payload });
            return {};
          },
        };
      },
      connection: {
        async raw(sql: string) {
          if (sql.includes("owner_profiles_user_lnk")) {
            return {
              rows: [
                {
                  id: 20,
                  verification_status:
                    params?.ownerStatus ?? "approved",
                },
              ],
            };
          }

          if (
            sql.includes("api::owner-profile.owner-profile")
          ) {
            return {
              rows: [
                {
                  count: params?.documentCount ?? 1,
                },
              ],
            };
          }

	          if (sql.includes("api::boat.boat")) {
	            return {
	              rows: [
	                {
	                  count: params?.mediaCount ?? 1,
	                },
	              ],
	            };
	          }

	          if (sql.includes("api::experience.experience")) {
	            return {
	              rows: [
	                {
	                  count: params?.routeMediaCount ?? 1,
	                },
	              ],
	            };
	          }

          return { rows: [] };
        },
      },
      async transaction<T>(callback: () => Promise<T>) {
        calls.push({ name: "transaction", payload: null });
        return callback();
      },
    },
    documents(uid: string) {
      return {
        async update(payload: unknown) {
          calls.push({ name: `${uid}.documents.update`, payload });
          return {};
        },
	        async publish(payload: unknown) {
	          calls.push({ name: `${uid}.documents.publish`, payload });
	          if (params?.publishFailure && uid === "api::experience.experience") {
	            throw new Error("publish_failed");
	          }
	          return {};
	        },
        async unpublish(payload: unknown) {
          calls.push({ name: `${uid}.documents.unpublish`, payload });
          return {};
        },
      };
    },
  };

  return { cms, calls };
}

test("start review updates every locale and writes an audit event", async () => {
  const { cms, calls } = fakeCms({
    boatStatus: "submitted",
  });

  const service = createAdminModerationService(cms as never);
  const result = await service.moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "start_review",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, true);
  assert.equal((result.body as JsonObject).moderationStatus, "under_review");
  assert.equal(
    calls.filter((call) =>
      call.name.endsWith("documents.update")
    ).length,
    3
  );
  assert.equal(
    calls.some(
      (call) =>
        call.name ===
        "api::moderation-event.moderation-event.create"
    ),
    true
  );
});

test("publish requires approved owner, three locales and media", async () => {
  const missingLocale = fakeCms({
    boatStatus: "approved",
    locales: ["ru", "en"],
  });

  let result = await createAdminModerationService(
    missingLocale.cms as never
  ).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(result.body.code, "required_locales_missing");

  const missingMedia = fakeCms({
    boatStatus: "approved",
    mediaCount: 0,
  });

  result = await createAdminModerationService(
    missingMedia.cms as never
  ).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(result.body.code, "boat_media_required");

  const ready = fakeCms({
    boatStatus: "approved",
  });

  result = await createAdminModerationService(
    ready.cms as never
  ).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, true);
  assert.equal(
    ready.calls.filter((call) =>
      call.name.endsWith("documents.publish")
    ).length,
    3
  );

  const updateIndexes = ready.calls
    .map((call, index) =>
      call.name.endsWith("documents.update") ? index : -1
    )
    .filter((index) => index >= 0);
  const publishIndexes = ready.calls
    .map((call, index) =>
      call.name.endsWith("documents.publish") ? index : -1
    )
    .filter((index) => index >= 0);

  assert.equal(updateIndexes.length, 3);
  assert.equal(publishIndexes.length, 3);
  assert.ok(
    Math.max(...updateIndexes) < Math.min(...publishIndexes)
  );
});

test("owner approval requires at least one uploaded document", async () => {
  const withoutDocument = fakeCms({
    ownerStatus: "under_review",
    documentCount: 0,
  });

  let result = await createAdminModerationService(
    withoutDocument.cms as never
  ).moderate({
    entityType: "owner_profile",
    profileId: 20,
    action: "approve",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(result.body.code, "owner_document_required");

  const ready = fakeCms({
    ownerStatus: "under_review",
    documentCount: 2,
  });

  result = await createAdminModerationService(
    ready.cms as never
  ).moderate({
    entityType: "owner_profile",
    profileId: 20,
    action: "approve",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, true);
  assert.equal((result.body as JsonObject).verificationStatus, "approved");
});

test("unified boat publication publishes boat and linked routes in one batch", async () => {
  const { cms, calls } = fakeCms({
    boatStatus: "approved",
  });

  const result = await createAdminModerationService(cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
    batchOperationId: "batch-test",
  });

  assert.equal(result.ok, true);
  assert.equal(result.body.code, "unified_publication_completed");
  assert.equal(
    calls.filter((call) => call.name === "api::boat.boat.documents.publish").length,
    3
  );
  assert.equal(
    calls.filter((call) => call.name === "api::experience.experience.documents.publish").length,
    3
  );
  assert.equal(
    calls.some((call) => call.name === "api::moderation-event.moderation-event.create"),
    true
  );
});

test("unified boat publication blocks before writes when boat locale is missing", async () => {
  const { cms, calls } = fakeCms({
    boatStatus: "approved",
    locales: ["ru", "en"],
  });

  const result = await createAdminModerationService(cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(result.body.code, "unified_publication_blocked");
  assert.equal(calls.some((call) => call.name.endsWith("documents.publish")), false);
});

test("unified boat publication blocks before writes when route locale is missing or incomplete", async () => {
  let setup = fakeCms({
    boatStatus: "approved",
    routeLocales: ["ru", "en"],
  });

  let result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(
    (result.body.blockers as string[]).some((blocker) => blocker.startsWith("route_required_locales_missing")),
    true
  );
  assert.equal(setup.calls.some((call) => call.name.endsWith("documents.publish")), false);

  setup = fakeCms({
    boatStatus: "approved",
    routeIncomplete: true,
  });

  result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(
    (result.body.blockers as string[]).some((blocker) => blocker.startsWith("route_required_locales_incomplete")),
    true
  );
  assert.equal(setup.calls.some((call) => call.name.endsWith("documents.publish")), false);
});

test("unified boat publication blocks rejected route moderation state before writes", async () => {
  const setup = fakeCms({
    boatStatus: "approved",
    routeLatestStatus: "rejected",
  });

  const result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(
    (result.body.blockers as string[]).some((blocker) => blocker.startsWith("route_moderation_state_blocks_publication")),
    true
  );
  assert.equal(setup.calls.some((call) => call.name.endsWith("documents.publish")), false);
});

test("unified boat publication blocks owner documents, boat media, marina, and route media failures", async () => {
  const setup = fakeCms({
    boatStatus: "approved",
    documentCount: 0,
    mediaCount: 0,
    routeMediaCount: 0,
    boatMissingMarina: true,
  });

  const result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  const blockers = result.body.blockers as string[];
  assert.ok(blockers.includes("owner_document_required"));
  assert.ok(blockers.includes("boat_media_required"));
  assert.ok(blockers.includes("marina_required"));
  assert.equal(blockers.some((blocker) => blocker.startsWith("route_media_required")), true);
  assert.equal(setup.calls.some((call) => call.name.endsWith("documents.publish")), false);
});

test("already published RU plus unpublished EN and ME succeeds idempotently", async () => {
  const setup = fakeCms({
    boatStatus: "approved",
    publishedLocales: ["ru"],
  });

  const result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, true);
});

test("unified boat publication compensates and reports failure on partial publish error", async () => {
  const setup = fakeCms({
    boatStatus: "approved",
    publishFailure: true,
  });

  const result = await createAdminModerationService(setup.cms as never).moderate({
    entityType: "boat",
    documentId: "boat-doc",
    action: "publish_logical_boat",
    actor: "runtime-admin",
  });

  assert.equal(result.ok, false);
  assert.equal(result.body.code, "unified_publication_failed");
  assert.equal(setup.calls.some((call) => call.name.endsWith("documents.unpublish")), true);
});
