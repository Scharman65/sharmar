import crypto from "crypto";

function timingSafeEqualString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function authorized(ctx: any): boolean {
  const expected = String(process.env.SHARMAR_INTERNAL_NOTIFY_SECRET || "").trim();
  const raw =
    ctx.request?.headers?.["x-sharmar-internal-secret"] ||
    ctx.request?.headers?.["x-internal-notify-secret"] ||
    "";
  const got = (Array.isArray(raw) ? String(raw[0] || "") : String(raw || "")).trim();
  return !!expected && !!got && timingSafeEqualString(got, expected);
}

function dataFrom(ctx: any): Record<string, any> {
  const body = ctx.request?.body || {};
  return body.data && typeof body.data === "object" ? body.data : body;
}

export default {
  async claim(ctx: any) {
    if (!authorized(ctx)) {
      ctx.status = 403;
      ctx.body = { ok: false, error: "unauthorized" };
      return;
    }

    const data = dataFrom(ctx);
    const deduplicationKey = String(data.deduplication_key || "").trim();
    const eventType = String(data.event_type || "").trim();
    const channel = String(data.channel || "").trim();

    if (!deduplicationKey || !eventType || !channel) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "missing_required_fields" };
      return;
    }

    const knex = strapi.db.connection;
    try {
      const rows = await knex("notification_deliveries")
        .insert({
          deduplication_key: deduplicationKey,
          request_id: data.request_id || null,
          public_token: data.public_token || null,
          event_type: eventType,
          channel,
          provider: data.provider || null,
          status: "claimed",
          metadata: data.metadata || null,
        })
        .returning(["id", "deduplication_key", "status"]);

      ctx.status = 201;
      ctx.body = { ok: true, claimed: true, delivery: rows?.[0] || null };
    } catch (error: any) {
      const code = String(error?.code || "");
      const message = String(error?.message || "");
      if (code === "23505" || message.includes("notification_deliveries_deduplication_key")) {
        const existing = await knex("notification_deliveries")
          .select("id", "deduplication_key", "status", "channel", "provider")
          .where({ deduplication_key: deduplicationKey })
          .first();
        ctx.status = 200;
        ctx.body = { ok: true, claimed: false, delivery: existing || null };
        return;
      }
      throw error;
    }
  },

  async record(ctx: any) {
    if (!authorized(ctx)) {
      ctx.status = 403;
      ctx.body = { ok: false, error: "unauthorized" };
      return;
    }

    const data = dataFrom(ctx);
    const deduplicationKey = String(data.deduplication_key || "").trim();
    if (!deduplicationKey) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "missing_deduplication_key" };
      return;
    }

    const status = String(data.status || "").trim() || "attempted";
    const rows = await strapi.db.connection("notification_deliveries")
      .where({ deduplication_key: deduplicationKey })
      .update({
        provider: data.provider || null,
        status,
        accepted_at: data.accepted_at || null,
        provider_message_id_hash: data.provider_message_id_hash || null,
        error_code: data.error_code || null,
        metadata: data.metadata || null,
        updated_at: new Date(),
      })
      .returning(["id", "deduplication_key", "status"]);

    ctx.status = 200;
    ctx.body = { ok: true, updated: rows.length, delivery: rows?.[0] || null };
  },
};
