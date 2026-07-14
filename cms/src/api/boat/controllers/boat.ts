import { factories } from "@strapi/strapi";
import { ownerContactInternalAuthorized } from "./owner-contact-auth";

function internalSecretAuthorized(ctx: any): boolean {
  const expected = String(process.env.SHARMAR_INTERNAL_NOTIFY_SECRET || "").trim();
  if (!expected) return false;

  const raw =
    ctx.request?.headers?.["x-sharmar-internal-secret"] ||
    ctx.request?.headers?.["x-internal-notify-secret"] ||
    "";
  return ownerContactInternalAuthorized({
    "x-sharmar-internal-secret": raw,
  }, expected);
}

export default factories.createCoreController("api::boat.boat", ({ strapi }) => ({
  async ownerContactBySlug(ctx) {
    if (!internalSecretAuthorized(ctx)) {
      ctx.status = 403;
      ctx.set("cache-control", "no-store");
      ctx.body = {
        ok: false,
        error: "owner_contacts_locked",
        message: "Owner contacts are available only after confirmed paid booking.",
      };
      return;
    }

    const slug = String(ctx.params?.slug || "").trim();
    if (!slug) {
      ctx.status = 400;
      ctx.set("cache-control", "no-store");
      ctx.body = { ok: false, error: "missing_slug" };
      return;
    }

    const result = await strapi.db.connection.raw(
      `
      select
        b.id as boat_id,
        b.document_id as boat_document_id,
        b.slug as boat_slug,
        b.title as boat_title,
        u.id as owner_user_id,
        u.email as owner_email,
        op.phone as owner_phone,
        op.whatsapp_number as owner_whatsapp,
        b.owner_viber as owner_viber,
        u.confirmed as owner_confirmed,
        u.blocked as owner_blocked,
        op.verification_status as owner_verification_status
      from public.boats b
      left join public.up_users u
        on u.id = coalesce(b.owner_user_id, b.created_by_id)
      left join public.owner_profiles_user_lnk opul
        on opul.user_id = u.id
      left join public.owner_profiles op
        on op.id = opul.owner_profile_id
      where b.slug = ?
        and b.published_at is not null
      order by b.id desc
      limit 1
      `,
      [slug]
    );

    const row = result?.rows?.[0] || (Array.isArray(result?.[0]) ? result[0][0] : null);
    if (!row) {
      ctx.status = 404;
      ctx.set("cache-control", "no-store");
      ctx.body = { ok: false, error: "boat_not_found" };
      return;
    }

    if (!row.owner_user_id || row.owner_blocked === true) {
      ctx.status = 200;
      ctx.set("cache-control", "no-store");
      ctx.body = {
        ok: true,
        data: {
          boat_id: row.boat_id,
          boat_document_id: row.boat_document_id,
          boat_slug: row.boat_slug,
          owner_user_id: row.owner_user_id || null,
          owner_email: null,
          owner_phone: null,
          owner_whatsapp: null,
          owner_viber: null,
          notifications_allowed: false,
          skipped_reason: row.owner_blocked === true ? "owner_blocked" : "owner_missing",
        },
      };
      return;
    }

    ctx.status = 200;
    ctx.set("cache-control", "no-store");
    ctx.body = {
      ok: true,
      data: {
        boat_id: row.boat_id,
        boat_document_id: row.boat_document_id,
        boat_slug: row.boat_slug,
        owner_user_id: row.owner_user_id,
        owner_email: row.owner_email || null,
        owner_phone: row.owner_phone || null,
        owner_whatsapp: row.owner_whatsapp || null,
        owner_viber: row.owner_viber || null,
        notifications_allowed: true,
      },
    };
  },
}));
