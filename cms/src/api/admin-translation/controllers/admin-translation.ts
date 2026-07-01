export default {
  async saveDraft(ctx) {
    const configuredToken = String(process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN || "").trim();
    if (!configuredToken) {
      ctx.status = 503;
      ctx.body = { ok: false, code: "admin_translation_internal_token_missing" };
      return;
    }

    const requestToken = String(ctx.request.headers["x-admin-translation-token"] || "").trim();
    if (requestToken !== configuredToken) {
      ctx.status = 401;
      ctx.body = { ok: false, code: "unauthorized" };
      return;
    }

    try {
      const result = await strapi
        .service("api::admin-translation.admin-translation")
        .saveDraft(ctx.request.body);

      ctx.status = result.status;
      ctx.body = result.body;
    } catch {
      ctx.status = 500;
      ctx.body = { ok: false, code: "save_draft_failed" };
    }
  },
};
