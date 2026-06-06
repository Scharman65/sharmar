import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::boat.boat", ({ strapi }) => ({
  async ownerContactBySlug(ctx) {
    const slug = String(ctx.params?.slug || "").trim();

    if (!slug) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "missing_slug" };
      return;
    }

    const row = await strapi.db.connection("boats")
      .select("id", "slug", "owner_email", "owner_phone", "owner_whatsapp", "owner_viber", "published_at")
      .where({ slug })
      .whereNotNull("published_at")
      .orderByRaw("published_at desc nulls last, id desc")
      .first();

    if (!row) {
      ctx.status = 404;
      ctx.body = { ok: false, error: "boat_not_found", slug };
      return;
    }

    ctx.status = 200;
    ctx.body = {
      ok: true,
      data: {
        id: row.id ?? null,
        slug: row.slug ?? slug,
        owner_email: row.owner_email ?? null,
        owner_phone: row.owner_phone ?? null,
        owner_whatsapp: row.owner_whatsapp ?? null,
        owner_viber: row.owner_viber ?? null,
      },
    };
  },
}));
