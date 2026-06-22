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

export default {
  async list(ctx) {
    const token = cleanString(ctx.query?.token);
    const boatIdFromQuery = toNumber(ctx.query?.boat_id);
    const boatId = boatIdFromQuery || (token ? await resolveBoatIdByOwnerToken(strapi, token) : 0);

    if (!boatId) {
      ctx.status = 400;
      ctx.body = { ok: false, error: "boat_id_required" };
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
      where boat_id = ?
      order by start_utc asc, id asc
      limit 300
      `,
      [boatId]
    );

    ctx.body = {
      ok: true,
      boat_id: boatId,
      blackouts: rows?.rows || [],
    };
  },

  async create(ctx) {
    const body = ctx.request?.body || {};

    const token = cleanString(body.token || ctx.query?.token);
    const boatIdFromBody = toNumber(body.boat_id || ctx.query?.boat_id);
    const boatId = boatIdFromBody || (token ? await resolveBoatIdByOwnerToken(strapi, token) : 0);

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
      where boat_id = ?
        and status in ('hold','deposit_paid','paid_pending_owner','confirmed')
        and tstzrange(slot_start_utc, slot_end_utc, '[)') && tstzrange(?::timestamptz, ?::timestamptz, '[)')
      limit 1
      `,
      [boatId, startUtc, endUtc]
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
      [boatId, startUtc, endUtc, reason]
    );

    ctx.status = 201;
    ctx.body = {
      ok: true,
      blackout: inserted?.rows?.[0] || null,
    };
  },

  async remove(ctx) {
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

    const deleted = await strapi.db.connection.raw(
      `
      delete from public.boat_blackouts
      where id = ?
        and boat_id = ?
      returning id, boat_id, start_utc, end_utc, reason, created_at
      `,
      [id, boatId]
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
