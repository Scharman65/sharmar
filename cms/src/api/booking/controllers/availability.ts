import { factories } from "@strapi/strapi";

function isIsoDate(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v);
}

function clampInt(v: any, min: number, max: number, def: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export default factories.createCoreController("api::boat.boat", ({ strapi }) => ({
  async get(ctx) {
    const boatId = Number.parseInt(ctx.params.boatId, 10);
    if (!Number.isFinite(boatId) || boatId <= 0) {
      return ctx.badRequest("Invalid boatId");
    }

    const from = String(ctx.query.from ?? "");
    const to = String(ctx.query.to ?? "");
    if (!isIsoDate(from) || !isIsoDate(to)) {
      return ctx.badRequest("Invalid from/to (expected YYYY-MM-DD)");
    }

    const stepMinutes = clampInt(ctx.query.step, 30, 240, 60);

    const boatRows = await strapi.db.connection.raw(
      "SELECT id, timezone, listing_type, published_at FROM boats WHERE id = ? AND published_at IS NOT NULL LIMIT 1",
      [boatId]
    );

    const boat = (boatRows?.rows ?? [])[0];
    if (!boat) {
      return ctx.notFound("Boat not found");
    }

    const rows = await strapi.db.connection.raw(
      "SELECT slot_start_utc, slot_end_utc FROM public.get_boat_availability(?, ?::date, ?::date, ?) ORDER BY slot_start_utc",
      [boatId, from, to, stepMinutes]
    );

    const data = (rows?.rows ?? []).map((r: any) => ({
      slot_start_utc: r.slot_start_utc,
      slot_end_utc: r.slot_end_utc,
    }));

    ctx.body = {
      ok: true,
      boatId,
      listing_type: boat.listing_type,
      timezone: boat.timezone || "Europe/Podgorica",
      from,
      to,
      stepMinutes,
      data,
    };
  },
}));
