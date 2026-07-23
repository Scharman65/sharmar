function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isValidIsoDate(value: string): boolean {
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function getBearerToken(ctx: any): string {
  const authorization = cleanString(
    ctx.request?.headers?.authorization ||
    ctx.headers?.authorization
  );

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
}

function requireOwnerApiToken(ctx: any): boolean {
  const expected = cleanString(process.env.OWNER_API_TOKEN);
  const received = getBearerToken(ctx);

  if (!expected || !received || received !== expected) {
    ctx.status = 401;
    ctx.body = {
      ok: false,
      error: "owner_api_token_required",
    };
    return false;
  }

  return true;
}

async function resolveBoatIdByOwnerToken(strapi: any, token: string): Promise<number> {
  const row = await strapi.db.connection.raw(
    `
    select l.boat_id
    from public.booking_requests br
    join public.booking_requests_boat_lnk l
      on l.booking_request_id = br.id
    where br.public_token = ?
    order by br.id desc
    limit 1
    `,
    [token]
  );

  const item = row?.rows?.[0] || null;
  return toNumber(item?.boat_id);
}

async function resolveLogicalBoat(strapi: any, boatId: number) {
  const result = await strapi.db.connection.raw(
    `
    select
      requested.id as requested_boat_id,
      requested.document_id,
      array_agg(logical.id order by logical.id)::int[] as boat_ids
    from public.boats requested
    join public.boats logical
      on logical.document_id = requested.document_id
    where requested.id = ?
    group by requested.id, requested.document_id
    limit 1
    `,
    [boatId]
  );

  const row = result?.rows?.[0];
  if (!row?.document_id || !Array.isArray(row.boat_ids)) return null;

  return {
    requestedBoatId: toNumber(row.requested_boat_id),
    documentId: String(row.document_id),
    boatIds: row.boat_ids
      .map((value: unknown) => toNumber(value))
      .filter((value: number) => value > 0),
  };
}

export default {
  async list(ctx) {
    if (!requireOwnerApiToken(ctx)) return;

    const token = cleanString(ctx.query?.token);
    const boatIdFromQuery = toNumber(ctx.query?.boat_id);
    const boatId = boatIdFromQuery || (token ? await resolveBoatIdByOwnerToken(strapi, token) : 0);

    if (!boatId) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "boat_id_required" };
      return;
    }

    const logical = await resolveLogicalBoat(strapi, boatId);
    if (!logical) {
      ctx.status = 404;
      ctx.body = { ok: false, error: "boat_not_found" };
      return;
    }

    const rows = await strapi.db.connection.raw(
      `
      select
        id,
        boat_id,
        start_utc,
        end_utc,
        reason,
        created_at
      from public.boat_blackouts
      where boat_id = any(?::int[])
      order by start_utc asc, id asc
      limit 300
      `,
      [logical.boatIds]
    );

    ctx.body = {
      ok: true,
      boat_id: logical.requestedBoatId,
      boat_document_id: logical.documentId,
      blackouts: rows?.rows || [],
    };
  },

  async create(ctx) {
    if (!requireOwnerApiToken(ctx)) return;

    const body = ctx.request?.body || {};

    const token = cleanString(body.token || ctx.query?.token);
    const boatIdFromBody = toNumber(body.boat_id || ctx.query?.boat_id);
    const boatId = boatIdFromBody || (token ? await resolveBoatIdByOwnerToken(strapi, token) : 0);

    const logical = await resolveLogicalBoat(strapi, boatId);
    if (!logical) {
      ctx.status = 404;
      ctx.body = { ok: false, error: "boat_not_found" };
      return;
    }

    const startUtc = cleanString(body.start_utc);
    const endUtc = cleanString(body.end_utc);
    const reason = cleanString(body.reason) || "owner_blocked";

    if (!boatId) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "boat_id_required" };
      return;
    }

    if (!startUtc || !endUtc || !isValidIsoDate(startUtc) || !isValidIsoDate(endUtc)) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "valid_start_utc_and_end_utc_required" };
      return;
    }

    if (Date.parse(endUtc) <= Date.parse(startUtc)) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "end_must_be_after_start" };
      return;
    }

    const conflict = await strapi.db.connection.raw(
      `
      select id
      from public.bookings
      where boat_id = any(?::int[])
        and status in ('hold','deposit_paid','paid_pending_owner','confirmed')
        and tstzrange(slot_start_utc, slot_end_utc, '[)') && tstzrange(?::timestamptz, ?::timestamptz, '[)')
      limit 1
      `,
      [logical.boatIds, startUtc, endUtc]
    );

    if (conflict?.rows?.length) {
      ctx.status = 409;
      ctx.body = { ok: false, error: "active_booking_conflict", booking_id: conflict.rows[0].id };
      return;
    }

    const inserted = await strapi.db.connection.raw(
      `
      insert into public.boat_blackouts
        (boat_id, start_utc, end_utc, reason, created_at)
      values
        (?, ?::timestamp, ?::timestamp, ?, now())
      returning id, boat_id, start_utc, end_utc, reason, created_at
      `,
      [logical.requestedBoatId, startUtc, endUtc, reason]
    );

    ctx.status = 201;
    ctx.body = {
      ok: true,
      blackout: inserted?.rows?.[0] || null,
    };
  },

  async remove(ctx) {
    if (!requireOwnerApiToken(ctx)) return;

    const id = toNumber(ctx.params?.id);
    const token = cleanString(ctx.query?.token);
    const boatIdFromQuery = toNumber(ctx.query?.boat_id);
    const boatId = boatIdFromQuery || (token ? await resolveBoatIdByOwnerToken(strapi, token) : 0);

    if (!id) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "valid_id_required" };
      return;
    }

    if (!boatId) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "boat_id_required" };
      return;
    }

    const logical = await resolveLogicalBoat(strapi, boatId);
    if (!logical) {
      ctx.status = 404;
      ctx.body = { ok: false, error: "boat_not_found" };
      return;
    }

    const deleted = await strapi.db.connection.raw(
      `
      delete from public.boat_blackouts
      where id = ?
        and boat_id = any(?::int[])
      returning id, boat_id, start_utc, end_utc, reason, created_at
      `,
      [id, logical.boatIds]
    );

    if (!deleted?.rows?.length) {
      ctx.status = 404;
      ctx.body = { ok: false, error: "blackout_not_found" };
      return;
    }

    ctx.body = {
      ok: true,
      deleted: deleted.rows[0],
    };
  },
};
