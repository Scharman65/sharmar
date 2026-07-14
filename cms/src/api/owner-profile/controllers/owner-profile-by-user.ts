import { isOwnerInternalAuthorized } from "../../../utils/ownerInternalAuth";

export default {
  async get(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) {
      ctx.status = 401;
      ctx.body = { ok: false, error: "unauthorized" };
      return;
    }

    try {
      const userIdRaw = String(ctx.query?.user_id || "").trim();
      const userId = Number(userIdRaw);

      if (!Number.isFinite(userId) || userId <= 0) {
        ctx.status = 400;
        ctx.body = {
          ok: false,
          error: "invalid_user_id",
        };
        return;
      }

      const rows = await strapi.db.connection.raw(
        `
        select
          op.id,
          op.document_id as "documentId",
          op.first_name,
          op.last_name,
          op.phone,
          op.company_name,
          op.whatsapp_number,
          op.country,
          op.preferred_language,
          coalesce(op.email_verified, false) as email_verified,
          coalesce(op.whatsapp_verified, false) as whatsapp_verified,
          coalesce(op.verification_status, 'new') as verification_status,
          op.documents_uploaded_at,
          op.verified_at,
          op.rejected_at,
          op.rejection_reason,
          op.password_changed_at,
          coalesce(op.session_version, 0) as session_version,
          op.created_at,
          op.updated_at,
          l.user_id
        from public.owner_profiles op
        join public.owner_profiles_user_lnk l
          on l.owner_profile_id = op.id
        where l.user_id = ?
        order by op.id desc
        limit 1
        `,
        [userId]
      );

      const profile = rows?.rows?.[0] || null;

      if (profile?.id) {
        const docs = await strapi.db.connection.raw(
          `
          select
            frm.field,
            f.id,
            f.name,
            f.url,
            f.mime,
            f.size
          from public.files_related_mph frm
          join public.files f
            on f.id = frm.file_id
          where frm.related_type = 'api::owner-profile.owner-profile'
            and frm.related_id = ?
            and frm.field in ('passport_document', 'identity_document', 'license_document')
          order by frm.field asc, frm."order" asc, frm.id asc
          `,
          [profile.id]
        );

        for (const doc of docs?.rows || []) {
          profile[doc.field] = {
            id: doc.id,
            name: doc.name,
            url: doc.url,
            mime: doc.mime,
            size: doc.size,
          };
        }
      }

      ctx.status = 200;
      ctx.body = {
        ok: true,
        user_id: userId,
        profile,
      };
    } catch (e) {
      strapi.log.error(`OWNER_PROFILE_BY_USER_ERROR ${e instanceof Error ? e.message : String(e)}`);

      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: "owner_profile_by_user_failed",
      };
    }
  },
};
