import { isOwnerInternalAuthorized } from "../../../utils/ownerInternalAuth";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}




function fail(ctx: any, status: number, error: string) {
  ctx.status = status;
  ctx.body = { ok: false, error };
}

function validPassword(value: unknown): string {
  return typeof value === "string" && value.length >= 8 && value.length <= 128 ? value : "";
}

function shouldInjectTestFailure(body: any): boolean {
  return process.env.NODE_ENV === "test" && body?.__test_fail_after_user_update === true;
}

async function hashPasswordWithStrapi(password: string): Promise<string> {
  const userService = strapi.plugin("users-permissions").service("user");
  const values = await userService.ensureHashedPasswords({ password });
  return values.password;
}

async function validatePasswordWithStrapi(password: string, hash: string): Promise<boolean> {
  return strapi.plugin("users-permissions").service("user").validatePassword(password, hash);
}

export default {
  async set(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

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
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

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
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

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
        session_version = coalesce(session_version, 0) + 1,
        updated_at = now()
      from public.owner_profiles_user_lnk l
      where l.owner_profile_id = op.id
        and l.user_id = ?
        and op.password_reset_token_hash = ?
        and op.password_reset_used_at is null
      returning op.id, op.document_id as "documentId", op.session_version
      `,
      [changedAt, changedAt, userId, tokenHash]
    );

    if (!updated?.rows?.length) return fail(ctx, 409, "reset_token_already_used");
    ctx.body = { ok: true, profile: updated.rows[0] };
  },

  async passwordChanged(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

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
        session_version = coalesce(session_version, 0) + 1,
        updated_at = now()
      from public.owner_profiles_user_lnk l
      where l.owner_profile_id = op.id
        and l.user_id = ?
      returning op.id, op.document_id as "documentId", op.session_version
      `,
      [changedAt, userId]
    );

    if (!updated?.rows?.length) return fail(ctx, 404, "owner_profile_not_found");
    ctx.body = { ok: true, profile: updated.rows[0] };
  },

  async completeReset(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const tokenHash = cleanString(body.token_hash);
    const password = validPassword(body.password);
    const injectFailure = shouldInjectTestFailure(body);
    const changedAt = new Date().toISOString();

    if (!/^[a-f0-9]{64}$/i.test(tokenHash) || !password) {
      return fail(ctx, 400, "invalid_reset_payload");
    }

    try {
      const result = await strapi.db.connection.transaction(async (trx) => {
        const profileRows = await trx.raw(
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
          for update of op
          `,
          [tokenHash]
        );
        const profile = profileRows?.rows?.[0] || null;
        if (!profile) throw Object.assign(new Error("reset_token_invalid"), { status: 400 });
        if (profile.password_reset_used_at) throw Object.assign(new Error("reset_token_used"), { status: 400 });
        if (!profile.password_reset_expires_at || Date.parse(profile.password_reset_expires_at) <= Date.now()) {
          throw Object.assign(new Error("reset_token_expired"), { status: 400 });
        }

        const userId = Number(profile.user_id || 0);
        if (!Number.isFinite(userId) || userId <= 0) {
          throw Object.assign(new Error("reset_token_invalid"), { status: 400 });
        }

        const hashedPassword = await hashPasswordWithStrapi(password);
        const userUpdate = await trx.raw(
          `
          update public.up_users
          set password = ?, updated_at = now()
          where id = ?
          returning id
          `,
          [hashedPassword, userId]
        );
        if (!userUpdate?.rows?.length) throw Object.assign(new Error("owner_user_not_found"), { status: 404 });
        if (injectFailure) throw Object.assign(new Error("test_failure_after_user_update"), { status: 500 });

        const profileUpdate = await trx.raw(
          `
          update public.owner_profiles
          set
            password_reset_token_hash = null,
            password_reset_expires_at = null,
            password_reset_used_at = ?::timestamptz,
            password_changed_at = ?::timestamptz,
            session_version = coalesce(session_version, 0) + 1,
            updated_at = now()
          where id = ?
          returning id, document_id as "documentId", password_changed_at, session_version
          `,
          [changedAt, changedAt, profile.id]
        );
        if (!profileUpdate?.rows?.length) throw Object.assign(new Error("password_reset_finalize_failed"), { status: 409 });

        return { profile: profileUpdate.rows[0] };
      });

      ctx.body = { ok: true, profile: result.profile };
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      return fail(ctx, status, error instanceof Error ? error.message : "password_reset_failed");
    }
  },

  async changePassword(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const userId = Number(body.user_id || 0);
    const currentPassword = cleanString(body.current_password);
    const password = validPassword(body.password);
    const injectFailure = shouldInjectTestFailure(body);
    const changedAt = new Date().toISOString();

    if (!Number.isFinite(userId) || userId <= 0 || !currentPassword || !password) {
      return fail(ctx, 400, "invalid_change_password_payload");
    }

    try {
      const result = await strapi.db.connection.transaction(async (trx) => {
        const userRows = await trx.raw(
          `
          select id, password
          from public.up_users
          where id = ?
          for update
          `,
          [userId]
        );
        const user = userRows?.rows?.[0] || null;
        if (!user?.password) throw Object.assign(new Error("owner_user_not_found"), { status: 404 });

        const validCurrent = await validatePasswordWithStrapi(currentPassword, user.password);
        if (!validCurrent) throw Object.assign(new Error("current_password_invalid"), { status: 400 });

        const hashedPassword = await hashPasswordWithStrapi(password);
        await trx.raw(
          `
          update public.up_users
          set password = ?, updated_at = now()
          where id = ?
          `,
          [hashedPassword, userId]
        );
        if (injectFailure) throw Object.assign(new Error("test_failure_after_user_update"), { status: 500 });

        const profileUpdate = await trx.raw(
          `
          update public.owner_profiles op
          set
            password_changed_at = ?::timestamptz,
            session_version = coalesce(session_version, 0) + 1,
            updated_at = now()
          from public.owner_profiles_user_lnk l
          where l.owner_profile_id = op.id
            and l.user_id = ?
          returning op.id, op.document_id as "documentId", op.password_changed_at, op.session_version
          `,
          [changedAt, userId]
        );
        if (!profileUpdate?.rows?.length) throw Object.assign(new Error("owner_profile_not_found"), { status: 404 });

        return { profile: profileUpdate.rows[0] };
      });

      ctx.body = { ok: true, profile: result.profile };
    } catch (error) {
      const status = typeof (error as any)?.status === "number" ? (error as any).status : 500;
      return fail(ctx, status, error instanceof Error ? error.message : "password_change_failed");
    }
  },
};
