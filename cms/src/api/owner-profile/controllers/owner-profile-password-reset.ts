function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isTokenAuthorized(ctx: any): boolean {
  const configured = cleanString(process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN);
  const provided = cleanString(ctx.request?.headers?.["x-owner-api-token"]);
  return Boolean(configured && provided && configured === provided);
}

function fail(ctx: any, status: number, error: string) {
  ctx.status = status;
  ctx.body = { ok: false, error };
}

export default {
  async set(ctx) {
    if (!isTokenAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const tokenHash = cleanString(body.token_hash);
    const expiresAt = cleanString(body.expires_at);

    if (!Number.isFinite(userId) || userId <= 0 || !/^[a-f0-9]{64}$/i.test(tokenHash) || !expiresAt) {
      return fail(ctx, 400, "invalid_reset_payload");
    }

    const updated = await strapi.db.connection.raw(
      `
      update public.owner_profiles op
      set
        password_reset_token_hash = ?,
        password_reset_expires_at = ?::timestamptz,
        password_reset_used_at = null,
        updated_at = now()
      from public.owner_profiles_user_lnk l
      where l.owner_profile_id = op.id
        and l.user_id = ?
      returning op.id, op.document_id as "documentId"
      `,
      [tokenHash, expiresAt, userId]
    );

    const profile = updated?.rows?.[0] || null;
    if (!profile) return fail(ctx, 404, "owner_profile_not_found");

    ctx.body = { ok: true, profile };
  },

  async find(ctx) {
    if (!isTokenAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const tokenHash = cleanString(ctx.request?.body?.token_hash);
    if (!/^[a-f0-9]{64}$/i.test(tokenHash)) return fail(ctx, 400, "invalid_token_hash");

    const rows = await strapi.db.connection.raw(
      `
      select
        op.id,
        op.document_id as "documentId",
        op.password_reset_expires_at,
        op.password_reset_used_at,
        l.user_id
      from public.owner_profiles op
      join public.owner_profiles_user_lnk l
        on l.owner_profile_id = op.id
      where op.password_reset_token_hash = ?
      order by op.id desc
      limit 1
      `,
      [tokenHash]
    );

    ctx.body = { ok: true, profile: rows?.rows?.[0] || null };
  },

  async consume(ctx) {
    if (!isTokenAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const tokenHash = cleanString(body.token_hash);
    const changedAt = cleanString(body.changed_at);

    if (!Number.isFinite(userId) || userId <= 0 || !/^[a-f0-9]{64}$/i.test(tokenHash) || !changedAt) {
      return fail(ctx, 400, "invalid_consume_payload");
    }

    const updated = await strapi.db.connection.raw(
      `
      update public.owner_profiles op
      set
        password_reset_token_hash = null,
        password_reset_expires_at = null,
        password_reset_used_at = ?::timestamptz,
        password_changed_at = ?::timestamptz,
        updated_at = now()
      from public.owner_profiles_user_lnk l
      where l.owner_profile_id = op.id
        and l.user_id = ?
        and op.password_reset_token_hash = ?
        and op.password_reset_used_at is null
      returning op.id, op.document_id as "documentId"
      `,
      [changedAt, changedAt, userId, tokenHash]
    );

    if (!updated?.rows?.length) return fail(ctx, 409, "reset_token_already_used");
    ctx.body = { ok: true, profile: updated.rows[0] };
  },

  async passwordChanged(ctx) {
    if (!isTokenAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const changedAt = cleanString(body.changed_at);

    if (!Number.isFinite(userId) || userId <= 0 || !changedAt) {
      return fail(ctx, 400, "invalid_password_changed_payload");
    }

    const updated = await strapi.db.connection.raw(
      `
      update public.owner_profiles op
      set
        password_changed_at = ?::timestamptz,
        updated_at = now()
      from public.owner_profiles_user_lnk l
      where l.owner_profile_id = op.id
        and l.user_id = ?
      returning op.id, op.document_id as "documentId"
      `,
      [changedAt, userId]
    );

    if (!updated?.rows?.length) return fail(ctx, 404, "owner_profile_not_found");
    ctx.body = { ok: true, profile: updated.rows[0] };
  },
};
