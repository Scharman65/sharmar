import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::boat.boat", ({ strapi }) => ({
  async ownerContactBySlug(ctx) {
    ctx.status = 403;
    ctx.body = {
      ok: false,
      error: "owner_contacts_locked",
      message: "Owner contacts are available only after confirmed paid booking.",
    };
  },
}));
