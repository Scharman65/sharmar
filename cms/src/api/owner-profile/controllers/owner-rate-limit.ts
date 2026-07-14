import { isOwnerInternalAuthorized } from "../../../utils/ownerInternalAuth";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}



function fail(ctx: any, status: number, error: string, extra?: Record<string, unknown>) {
  ctx.status = status;
  ctx.body = { ok: false, error, ...(extra || {}) };
}

let tableReady: Promise<void> | null = null;

async function ensureTable() {
  tableReady ??= strapi.db.connection.raw(`
    create table if not exists public.owner_rate_limits (
      scope text not null,
      key_hash text not null,
      count integer not null,
      reset_at timestamptz not null,
      updated_at timestamptz not null default now(),
      primary key (scope, key_hash)
    )
  `).then(() => undefined);
  await tableReady;
}

export default {
  async check(ctx) {
    if (!isOwnerInternalAuthorized(ctx)) return fail(ctx, 401, "unauthorized");

    const body = ctx.request?.body || {};
    const scope = cleanString(body.scope);
    const keyHash = cleanString(body.key_hash);
    const limit = Number(body.limit || 0);
    const windowMs = Number(body.window_ms || 0);

    if (!/^[a-z0-9:_-]{3,80}$/i.test(scope) || !/^[a-f0-9]{64}$/i.test(keyHash)) {
      return fail(ctx, 400, "invalid_rate_limit_key");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000 || !Number.isInteger(windowMs) || windowMs < 1000) {
      return fail(ctx, 400, "invalid_rate_limit_window");
    }

    await ensureTable();

    const result = await strapi.db.connection.transaction(async (trx) => {
      const now = Date.now();
      const resetAt = new Date(now + windowMs).toISOString();
      const upsert = await trx.raw(
        `
        insert into public.owner_rate_limits(scope, key_hash, count, reset_at, updated_at)
        values (?, ?, 1, ?::timestamptz, now())
        on conflict (scope, key_hash)
        do update set
          count = case
            when owner_rate_limits.reset_at <= now() then 1
            else owner_rate_limits.count + 1
          end,
          reset_at = case
            when owner_rate_limits.reset_at <= now() then excluded.reset_at
            else owner_rate_limits.reset_at
          end,
          updated_at = now()
        returning count, reset_at
        `,
        [scope, keyHash, resetAt]
      );

      const row = upsert?.rows?.[0] || null;
      if (Number(row.count || 0) > limit) {
        return {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil((Date.parse(row.reset_at) - now) / 1000)),
        };
      }

      return { allowed: true, retryAfter: 0 };
    });

    ctx.body = { ok: true, ...result };
  },
};
