const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BOAT_READ_FIELDS,
  BOAT_UID,
  EXPERIENCE_READ_FIELDS,
  EXPERIENCE_UID,
  createAdminTranslationService,
} = require("../../../../dist/src/api/admin-translation/services/admin-translation.js");

const sourceDocumentId = "test_doc_runtime_service";
const experienceDocumentId = "test_route_runtime_service";

function key(uid, documentId, locale) {
  return `${uid}:${documentId}:${locale}`;
}

function createMockCms(initialRows = {}) {
  const rowsByKey = new Map(Object.entries(initialRows));
  const calls = {
    findMany: [],
    findOne: [],
    update: [],
    transaction: 0,
  };

  function rows(uid, documentId, locale) {
    return rowsByKey.get(key(uid, documentId, locale)) ?? [];
  }

  function setRows(uid, documentId, locale, nextRows) {
    rowsByKey.set(key(uid, documentId, locale), nextRows);
  }

  return {
    calls,
    rowsByKey,
    db: {
      query(uid) {
        return {
          async findMany(params) {
            calls.findMany.push({ uid, params });
            return rows(uid, params.where.documentId, params.where.locale);
          },
        };
      },
      async transaction(cb) {
        calls.transaction += 1;
        const snapshot = new Map();
        for (const [rowKey, value] of rowsByKey.entries()) {
          snapshot.set(rowKey, structuredClone(value));
        }

        try {
          return await cb({ trx: { id: `mock-trx-${calls.transaction}` } });
        } catch (error) {
          rowsByKey.clear();
          for (const [rowKey, value] of snapshot.entries()) {
            rowsByKey.set(rowKey, value);
          }
          throw error;
        }
      },
    },
    documents(uid) {
      return {
        async findOne(params) {
          calls.findOne.push({ uid, params });
          return rows(uid, params.documentId, params.locale).find((row) => {
            return params.status === "published" ? Boolean(row.publishedAt) : !row.publishedAt;
          }) ?? null;
        },
        async update(params) {
          calls.update.push({ uid, params });
          const currentRows = rows(uid, params.documentId, params.locale);
          const draft = currentRows.find((row) => !row.publishedAt);
          if (draft) {
            Object.assign(draft, params.data);
          } else {
            currentRows.push({
              id: currentRows.length + 100,
              documentId: params.documentId,
              locale: params.locale,
              publishedAt: null,
              ...params.data,
            });
            setRows(uid, params.documentId, params.locale, currentRows);
          }
          return null;
        },
      };
    },
  };
}

function baseRows() {
  return {
    [key(BOAT_UID, sourceDocumentId, "en")]: [{
      id: 1,
      documentId: sourceDocumentId,
      locale: "en",
      publishedAt: "2026-01-01T00:00:00.000Z",
      title: "Source boat",
      description: "Source description",
      capacity: 8,
    }],
    [key(EXPERIENCE_UID, experienceDocumentId, "en")]: [{
      id: 10,
      documentId: experienceDocumentId,
      locale: "en",
      publishedAt: null,
      title: "Source route",
      short_description: "Short",
      full_description: "Full",
      included_services: "Fuel",
      meeting_point: "Marina",
    }],
  };
}

function savePayload(extra = {}) {
  return {
    dryRun: false,
    confirmSaveDraft: true,
    overwrite: false,
    boatDocumentId: sourceDocumentId,
    sourceLocale: "en",
    targetLocales: ["ru"],
    aiPreview: {
      boat: {
        translations: {
          ru: {
            title: "RU boat",
            description: "RU description",
            ...extra.boatTranslation,
          },
        },
      },
      experiences: extra.experiences ?? [],
    },
  };
}

test("boat plan queries only boat fields", async () => {
  const cms = createMockCms(baseRows());
  await createAdminTranslationService(cms).saveDraft(savePayload());

  const boatSelects = cms.calls.findMany
    .filter((call) => call.uid === BOAT_UID)
    .map((call) => call.params.select);

  assert.ok(boatSelects.length > 0);
  assert.deepEqual([...boatSelects[0]], [...BOAT_READ_FIELDS]);
  assert.equal(boatSelects.flat().includes("short_description"), false);
  assert.equal(boatSelects.flat().includes("meeting_point"), false);
});

test("experience plan queries only experience fields", async () => {
  const cms = createMockCms(baseRows());
  await createAdminTranslationService(cms).saveDraft(savePayload({
    experiences: [{
      sourceDocumentId: experienceDocumentId,
      translations: {
        ru: {
          title: "RU route",
          short_description: "RU short",
          full_description: "RU full",
          included_services: "RU fuel",
          meeting_point: "RU marina",
        },
      },
    }],
  }));

  const experienceSelects = cms.calls.findMany
    .filter((call) => call.uid === EXPERIENCE_UID)
    .map((call) => call.params.select);

  assert.ok(experienceSelects.length > 0);
  assert.deepEqual([...experienceSelects[0]], [...EXPERIENCE_READ_FIELDS]);
  assert.equal(experienceSelects.flat().includes("description"), false);
});

test("missing boat RU locale updates via document service with only allowed fields", async () => {
  const cms = createMockCms(baseRows());
  const result = await createAdminTranslationService(cms).saveDraft(savePayload({
    boatTranslation: {
      slug: "blocked-slug",
      publishedAt: "2026-01-01T00:00:00.000Z",
      cover: 1,
      images: [1],
      owner: 1,
      price: 10,
      currency: "EUR",
    },
  }));

  assert.equal(result.status, 409);
  assert.equal(cms.calls.update.length, 0);

  const cleanCms = createMockCms(baseRows());
  const cleanResult = await createAdminTranslationService(cleanCms).saveDraft(savePayload());
  assert.equal(cleanResult.status, 200);
  assert.equal(cleanCms.calls.update.length, 1);
  assert.deepEqual(cleanCms.calls.update[0].params, {
    documentId: sourceDocumentId,
    locale: "ru",
    status: "draft",
    data: {
      title: "RU boat",
      description: "RU description",
    },
  });
});

test("service rereads target draft after update", async () => {
  const cms = createMockCms(baseRows());
  await createAdminTranslationService(cms).saveDraft(savePayload());

  assert.ok(cms.calls.findOne.some((call) => (
    call.uid === BOAT_UID &&
    call.params.documentId === sourceDocumentId &&
    call.params.locale === "ru" &&
    call.params.status === "draft"
  )));
});

test("different result documentId fails safely", async () => {
  const cms = createMockCms(baseRows());
  cms.documents = (uid) => ({
    async findOne(params) {
      cms.calls.findOne.push({ uid, params });
      if (params.locale === "ru") {
        return { id: 100, documentId: "wrong_doc", locale: "ru", publishedAt: null, title: "RU boat" };
      }
      return null;
    },
    async update(params) {
      cms.calls.update.push({ uid, params });
    },
  });

  const result = await createAdminTranslationService(cms).saveDraft(savePayload());
  assert.equal(result.status, 409);
  assert.equal(result.body.reason, "invalid_result");
});

test("published result fails safely", async () => {
  const cms = createMockCms(baseRows());
  cms.documents = (uid) => ({
    async findOne(params) {
      cms.calls.findOne.push({ uid, params });
      if (params.locale === "ru") {
        return { id: 100, documentId: params.documentId, locale: "ru", publishedAt: "2026-01-01T00:00:00.000Z", title: "RU boat" };
      }
      return null;
    },
    async update(params) {
      cms.calls.update.push({ uid, params });
    },
  });

  const result = await createAdminTranslationService(cms).saveDraft(savePayload());
  assert.equal(result.status, 409);
  assert.equal(result.body.reason, "invalid_result");
});

test("duplicate draft after write fails safely", async () => {
  const cms = createMockCms(baseRows());
  const originalUpdate = cms.documents(BOAT_UID).update;
  cms.documents = (uid) => ({
    async findOne(params) {
      return { id: 100, documentId: params.documentId, locale: params.locale, publishedAt: null, title: "RU boat", description: "RU description" };
    },
    async update(params) {
      cms.calls.update.push({ uid, params });
      await originalUpdate(params);
      cms.rowsByKey.set(key(uid, params.documentId, params.locale), [
        { id: 100, documentId: params.documentId, locale: params.locale, publishedAt: null, title: "A" },
        { id: 101, documentId: params.documentId, locale: params.locale, publishedAt: null, title: "B" },
      ]);
    },
  });

  const result = await createAdminTranslationService(cms).saveDraft(savePayload());
  assert.equal(result.status, 409);
  assert.equal(result.body.reason, "invalid_result");
});

test("existing published target blocks without update", async () => {
  const cms = createMockCms({
    ...baseRows(),
    [key(BOAT_UID, sourceDocumentId, "ru")]: [{
      id: 2,
      documentId: sourceDocumentId,
      locale: "ru",
      publishedAt: "2026-01-01T00:00:00.000Z",
      title: "Published RU",
      description: "Published",
    }],
  });

  const result = await createAdminTranslationService(cms).saveDraft(savePayload());
  assert.equal(result.status, 409);
  assert.equal(result.body.blockers[0], "Boat ru: BLOCKED_ALREADY_PUBLISHED");
  assert.equal(cms.calls.update.length, 0);
});

test("dry-run payload returns plan without update", async () => {
  const cms = createMockCms(baseRows());
  const result = await createAdminTranslationService(cms).saveDraft({ ...savePayload(), dryRun: true });
  assert.equal(result.status, 200);
  assert.equal(result.body.mode, "dry-run");
  assert.equal(result.body.boat[0].operation, "CREATE_MISSING_LOCALIZATION");
  assert.equal(cms.calls.update.length, 0);
});

test("experience writes only allowed experience fields", async () => {
  const cms = createMockCms(baseRows());
  const result = await createAdminTranslationService(cms).saveDraft(savePayload({
    experiences: [{
      sourceDocumentId: experienceDocumentId,
      translations: {
        ru: {
          title: "RU route",
          short_description: "RU short",
          full_description: "RU full",
          included_services: "RU fuel",
          meeting_point: "RU marina",
        },
      },
    }],
  }));

  assert.equal(result.status, 200);
  const experienceUpdate = cms.calls.update.find((call) => call.uid === EXPERIENCE_UID);
  assert.deepEqual(experienceUpdate.params.data, {
    title: "RU route",
    short_description: "RU short",
    full_description: "RU full",
    included_services: "RU fuel",
    meeting_point: "RU marina",
  });
});

test("multi-item failure rolls back earlier boat draft write", async () => {
  const cms = createMockCms(baseRows());
  const originalDocuments = cms.documents;

  cms.documents = (uid) => {
    const api = originalDocuments(uid);
    return {
      ...api,
      async update(params) {
        await api.update(params);
        if (uid === BOAT_UID) {
          cms.rowsByKey.set(key(EXPERIENCE_UID, experienceDocumentId, "ru"), [{
            id: 99,
            documentId: experienceDocumentId,
            locale: "ru",
            publishedAt: "2026-01-01T00:00:00.000Z",
            title: "Published route appeared concurrently",
          }]);
        }
      },
    };
  };

  const result = await createAdminTranslationService(cms).saveDraft(savePayload({
    experiences: [{
      sourceDocumentId: experienceDocumentId,
      translations: {
        ru: {
          title: "RU route",
          short_description: "RU short",
          full_description: "RU full",
          included_services: "RU fuel",
          meeting_point: "RU marina",
        },
      },
    }],
  }));

  assert.equal(result.status, 409);
  assert.equal(cms.rowsByKey.has(key(BOAT_UID, sourceDocumentId, "ru")), false);
  assert.equal(cms.rowsByKey.has(key(EXPERIENCE_UID, experienceDocumentId, "ru")), false);
});
