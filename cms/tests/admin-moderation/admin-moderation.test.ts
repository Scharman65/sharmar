import assert from "node:assert/strict";
import test from "node:test";

import { createAdminModerationService } from "../../src/api/admin-moderation/services/admin-moderation";

type JsonObject = Record<string, unknown>;

function fakeCms(params?: {
  boatStatus?: string;
  ownerStatus?: string;
  locales?: string[];
  mediaCount?: number;
  documentCount?: number;
}) {
  const calls: Array<{ name: string; payload: unknown }> = [];
  const locales = params?.locales ?? ["ru", "en", "sr-Latn-ME"];

  const boatRows = locales.map((locale, index) => ({
    id: index + 1,
    documentId: "boat-doc",
    locale,
    publishedAt: null,
    title: `Boat ${locale}`,
    slug: `boat-${locale}`,
    moderation_status: params?.boatStatus ?? "submitted",
    owner_user_id: 10,
    created_by_id: 10,
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
            return uid === "api::boat.boat" ? boatRows : [];
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
