import { isOwnerInternalAuthorized } from "../../../utils/ownerInternalAuth";

export default {
  async create(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) {
      ctx.status = 401;
      ctx.body = { ok: false, error: "unauthorized" };
      return;
    }

    try {
      const body = ctx.request?.body || {};

      const userId = Number(body.user_id || 0);
      const firstName = String(body.first_name || "").trim();
      const lastName = String(body.last_name || "").trim();
      const phone = String(body.phone || "").trim();
      const whatsappNumber = String(body.whatsapp_number || "").trim();
      const country = String(body.country || "").trim();
      const preferredLanguageRaw = String(body.preferred_language || "en").trim();
      const preferredLanguage = ["en", "ru", "me"].includes(preferredLanguageRaw)
        ? preferredLanguageRaw
        : "en";

      if (!Number.isFinite(userId) || userId <= 0) {
        ctx.status = 400;
        ctx.body = { ok: false, error: "invalid_user_id" };
        return;
      }

      if (!firstName || !lastName || !whatsappNumber) {
        ctx.status = 400;
        ctx.body = { ok: false, error: "missing_required_profile_fields" };
        return;
      }

      const userRows = await strapi.db.connection.raw(
        `
        select id, email, username
        from public.up_users
        where id = ?
        limit 1
        `,
        [userId]
      );

      const user = userRows?.rows?.[0] || null;

      if (!user) {
        ctx.status = 404;
        ctx.body = { ok: false, error: "user_not_found" };
        return;
      }

      const existingRows = await strapi.db.connection.raw(
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

      const existingProfile = existingRows?.rows?.[0] || null;

      if (existingProfile) {
        ctx.status = 200;
        ctx.body = {
          ok: true,
          created: false,
          user_id: userId,
          profile: existingProfile,
        };
        return;
      }

      const insertRows = await strapi.db.connection.raw(
        `
        insert into public.owner_profiles (
          document_id,
          first_name,
          last_name,
          phone,
          whatsapp_number,
          country,
          preferred_language,
          email_verified,
          whatsapp_verified,
          verification_status,
          session_version,
          created_at,
          updated_at,
          published_at
        )
        values (
          ?,
          ?,
          ?,
          nullif(?, ''),
          ?,
          nullif(?, ''),
          ?,
          false,
          false,
          'new',
          0,
          now(),
          now(),
          now()
        )
        returning id
        `,
        [
          `owner-profile-user-${userId}`,
          firstName,
          lastName,
          phone,
          whatsappNumber,
          country,
          preferredLanguage,
        ]
      );

      const profileId = insertRows?.rows?.[0]?.id;

      if (!profileId) {
        ctx.status = 500;
        ctx.body = { ok: false, error: "owner_profile_insert_failed" };
        return;
      }

      await strapi.db.connection.raw(
        `
        insert into public.owner_profiles_user_lnk (
          owner_profile_id,
          user_id
        )
        values (?, ?)
        `,
        [profileId, userId]
      );

      const profileRows = await strapi.db.connection.raw(
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
        where op.id = ?
        limit 1
        `,
        [profileId]
      );

      ctx.status = 201;
      ctx.body = {
        ok: true,
        created: true,
        user_id: userId,
        profile: profileRows?.rows?.[0] || null,
      };
    } catch (e) {
      strapi.log.error(`OWNER_PROFILE_CREATE_FOR_USER_ERROR ${e instanceof Error ? e.message : String(e)}`);

      ctx.status = 500;
      ctx.body = {
        ok: false,
        error: "owner_profile_create_for_user_failed",
      };
    }
  },
};
