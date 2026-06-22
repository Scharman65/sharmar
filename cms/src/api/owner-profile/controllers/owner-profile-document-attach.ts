const DOCUMENT_FIELD_BY_TYPE = {
  passport: "passport_document",
  identity: "identity_document",
  license: "license_document",
};

const OWNER_PROFILE_RELATED_TYPE = "api::owner-profile.owner-profile";

function getExpectedToken() {
  return String(
    process.env.OWNER_API_TOKEN ||
      process.env.STRAPI_WRITE_TOKEN ||
      process.env.STRAPI_TOKEN ||
      ""
  ).trim();
}

function getHeader(ctx, name) {
  const lowerName = String(name).toLowerCase();
  const value = ctx.request?.headers?.[lowerName] || ctx.get?.(name);
  return typeof value === "string" ? value.trim() : "";
}

function getPositiveInteger(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getDocumentField(value) {
  if (typeof value !== "string") return null;
  const key = value.trim();
  return DOCUMENT_FIELD_BY_TYPE[key] || null;
}

export default {
  async attach(ctx) {
    try {
      const expectedToken = getExpectedToken();
      const providedToken = getHeader(ctx, "x-owner-api-token");

      if (!expectedToken || providedToken !== expectedToken) {
        ctx.status = 401;
        ctx.body = { ok: false, error: "unauthorized" };
        return;
      }

      const body = ctx.request?.body || {};
      const userId = getPositiveInteger(body.user_id);
      const fileId = getPositiveInteger(body.file_id);
      const documentType = typeof body.document_type === "string" ? body.document_type.trim() : "";
      const documentField = getDocumentField(documentType);

      if (!userId || !fileId || !documentField) {
        ctx.status = 400;
        ctx.body = { ok: false, error: "invalid_request" };
        return;
      }

      const knex = strapi.db.connection;

      const ownerProfile = await knex("owner_profiles as op")
        .select("op.id")
        .join("owner_profiles_user_lnk as upl", "upl.owner_profile_id", "op.id")
        .where("upl.user_id", userId)
        .orderBy("op.id", "desc")
        .first();

      if (!ownerProfile?.id) {
        ctx.status = 404;
        ctx.body = { ok: false, error: "owner_profile_not_found" };
        return;
      }

      const file = await knex("files")
        .select("id", "url", "name", "mime", "size")
        .where({ id: fileId })
        .first();

      if (!file?.id) {
        ctx.status = 404;
        ctx.body = { ok: false, error: "file_not_found" };
        return;
      }

      await knex.transaction(async (trx) => {
        await trx("files_related_mph")
          .where({
            related_id: ownerProfile.id,
            related_type: OWNER_PROFILE_RELATED_TYPE,
            field: documentField,
          })
          .delete();

        await trx("files_related_mph").insert({
          file_id: fileId,
          related_id: ownerProfile.id,
          related_type: OWNER_PROFILE_RELATED_TYPE,
          field: documentField,
          order: 1,
        });

        await trx("owner_profiles")
          .where({ id: ownerProfile.id })
          .update({
            verification_status: "documents_uploaded",
            documents_uploaded_at: trx.raw("coalesce(documents_uploaded_at, now())"),
            updated_at: trx.fn.now(),
          });
      });

      ctx.status = 200;
      ctx.body = {
        ok: true,
        owner_profile_id: ownerProfile.id,
        document_type: documentType,
        document_field: documentField,
        file: {
          id: file.id,
          url: file.url,
          name: file.name,
          mime: file.mime,
          size: file.size,
        },
        verification_status: "documents_uploaded",
      };
    } catch (e) {
      strapi.log.error(`OWNER_PROFILE_DOCUMENT_ATTACH_ERROR ${e instanceof Error ? e.message : String(e)}`);

      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: "owner_profile_document_attach_failed",
      };
    }
  },
};
