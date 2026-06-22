import { factories } from "@strapi/strapi";
import * as crypto from "crypto";
function isIsoUtcTimestamp(v: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z$/.test(
    v
  );
}

function clampInt(v: any, min: number, max: number, def: number): number {
  const n = Number.parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

function clampRate(v: any, def: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  if (n <= 0) return def;
  if (n > 1) return def;
  return n;
}

function normalizeCode(v: unknown): string {
  const s = String(v ?? "").trim();
  return s ? s.toUpperCase() : "FAILED";
}

function sha256Hex(obj: any): string {
  return crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export default factories.createCoreController("api::boat.boat", ({ strapi }) => ({
  async create(ctx) {
    const body = (ctx.request as any)?.body ?? {};
    const data = (body as any)?.data ?? body;

    const endpoint = "POST:/api/hold";

    const getHeader = (name: string): string | null => {
      const v = (ctx as any)?.get ? (ctx as any).get(name) : null;
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s || null;
    };

    const headerKey = getHeader("Idempotency-Key") || getHeader("X-Idempotency-Key") || null;

    const headers = ((ctx.request as any)?.headers ?? {}) as Record<string, unknown>;
    const headerKeyFallbackRaw =
      (headers["idempotency-key"] as any) ?? (headers["x-idempotency-key"] as any) ?? null;

    const headerKeyFallback =
      headerKeyFallbackRaw === null || headerKeyFallbackRaw === undefined
        ? null
        : String(headerKeyFallbackRaw).trim() || null;

    const bodyKeyRaw = (data as any)?.idempotency_key;
    const bodyKey =
      bodyKeyRaw === null || bodyKeyRaw === undefined ? null : String(bodyKeyRaw).trim() || null;

    const idempotencyKey = headerKey || headerKeyFallback || bodyKey;

    const boatId = Number.parseInt(String((data as any)?.boatId ?? ""), 10);
    if (!Number.isFinite(boatId) || boatId <= 0) {
      return ctx.badRequest("Invalid boatId");
    }

    const slotStartUtc = String((data as any)?.slot_start_utc ?? "");
    const slotEndUtc = String((data as any)?.slot_end_utc ?? "");
    if (!isIsoUtcTimestamp(slotStartUtc) || !isIsoUtcTimestamp(slotEndUtc)) {
      return ctx.badRequest(
        "Invalid slot_start_utc/slot_end_utc (expected ISO UTC, e.g. 2026-02-01T10:00:00.000Z)"
      );
    }

    const depositRate = clampRate((data as any)?.deposit_rate, 0.2);
    const holdMinutes = clampInt((data as any)?.hold_minutes, 5, 120, 15);

    const requestShape = {
      boatId,
      slot_start_utc: slotStartUtc,
      slot_end_utc: slotEndUtc,
      deposit_rate: depositRate,
      hold_minutes: holdMinutes,
    };
    const requestHash = sha256Hex(requestShape);

    if (idempotencyKey) {
      const prev = await strapi.db.connection.raw(
        "SELECT request_hash, response_status, response_body, booking_id, expires_at FROM idempotency_keys WHERE key = ? AND endpoint = ? LIMIT 1",
        [idempotencyKey, endpoint]
      );
      const row = (prev?.rows ?? [])[0];

      if (row) {
        const prevHash = String(row.request_hash ?? "");
        if (prevHash !== requestHash) {
          ctx.status = 409;
          ctx.body = { ok: false, code: "IDEMPOTENCY_KEY_REUSE" };
          return;
        }

        const prevBookingId =
          row.booking_id !== null && row.booking_id !== undefined
            ? Number.parseInt(String(row.booking_id), 10)
            : null;

        if (prevBookingId && Number.isFinite(prevBookingId) && prevBookingId > 0) {
          const b = await strapi.db.connection.raw(
            "SELECT status, expires_at FROM bookings WHERE id = ? LIMIT 1",
            [prevBookingId]
          );
          const br = (b?.rows ?? [])[0];
          if (!br) {
            ctx.status = 409;
            ctx.body = { ok: false, code: "HOLD_EXPIRED" };
            return;
          }
          const st = String(br.status ?? "");
          if (st !== "hold") {
            ctx.status = 409;
            ctx.body = { ok: false, code: "HOLD_EXPIRED" };
            return;
          }
          if (br.expires_at && new Date(br.expires_at).getTime() <= Date.now()) {
            ctx.status = 409;
            ctx.body = { ok: false, code: "HOLD_EXPIRED" };
            return;
          }
        }

        if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
          ctx.status = 409;
          ctx.body = { ok: false, code: "HOLD_EXPIRED" };
          return;
        }

        ctx.status = Number(row.response_status) || 200;
        const rb = (row as any).response_body;
        if (typeof rb === "string") {
          try {
            ctx.body = JSON.parse(rb);
          } catch {
            ctx.body = { ok: false, code: "IDEMPOTENCY_BODY_PARSE" };
            ctx.status = 500;
          }
        } else {
          ctx.body = rb;
        }
        (ctx as any).set?.("Idempotency-Key", idempotencyKey);
        if (ctx.body && typeof ctx.body === "object") (ctx.body as any).replayed = true;
        return;
      }
    }

    const boatRows = await strapi.db.connection.raw(
      "SELECT id, listing_type, published_at FROM boats WHERE id = ? AND published_at IS NOT NULL LIMIT 1",
      [boatId]
    );
    const boat = (boatRows?.rows ?? [])[0];
    if (!boat) {
      return ctx.notFound("Boat not found");
    }
    if (boat.listing_type !== "rent") {
      return ctx.badRequest("Hold is allowed only for rent listing_type");
    }

    const r = await strapi.db.connection.raw(
      "SELECT ok, code, out_booking_id, out_public_id, out_expires_at FROM public.hold_booking(?::int, ?::timestamptz, ?::timestamptz, ?::numeric, ?::int)",
      [boatId, slotStartUtc, slotEndUtc, depositRate, holdMinutes]
    );

    const out = (r?.rows ?? [])[0];
    if (!out) {
      ctx.status = 500;
      ctx.body = { ok: false, code: "NO_RESULT" };
    } else if (out.ok === true) {
      ctx.status = 201;
      ctx.body = {
        ok: true,
        code: normalizeCode(out.code),
        boatId,
        booking_id: out.out_booking_id,
        public_id: out.out_public_id,
        expires_at: out.out_expires_at,
        deposit_rate: depositRate,
        hold_minutes: holdMinutes,
      };
    } else {
      const code = normalizeCode(out.code);
      if (code === "SLOT_TAKEN" || code === "CONFLICT" || code === "NOT_AVAILABLE" || code === "OCCUPIED") {
        ctx.status = 409;
        ctx.body = { ok: false, code };
      } else {
        ctx.status = 422;
        ctx.body = { ok: false, code };
      }
    }

    if (idempotencyKey) {
      (ctx as any).set?.("Idempotency-Key", idempotencyKey);
      if (ctx.body && typeof ctx.body === "object") (ctx.body as any).replayed = false;
      const bookingId =
        (ctx.body as any)?.booking_id !== null && (ctx.body as any)?.booking_id !== undefined
          ? Number.parseInt(String((ctx.body as any)?.booking_id), 10)
          : null;

      const expiresAt = (ctx.body as any)?.expires_at ?? null;

      let resolvedExpiresAt = expiresAt;
      if (!resolvedExpiresAt && bookingId && Number.isFinite(bookingId) && bookingId > 0) {
        const bx = await strapi.db.connection.raw(
          "SELECT expires_at FROM bookings WHERE id = ? LIMIT 1",
          [bookingId]
        );
        const brx = (bx?.rows ?? [])[0];
        if (brx?.expires_at) resolvedExpiresAt = brx.expires_at;
      }

      await strapi.db.connection.raw(
        `INSERT INTO idempotency_keys
          (key, endpoint, request_hash, response_status, response_body, booking_id, expires_at)
         VALUES
          (?, ?, ?, ?, ?::jsonb, ?, COALESCE(?::timestamptz, now() + interval '10 minutes'))
         ON CONFLICT (key, endpoint) DO NOTHING`,
        [
          idempotencyKey,
          endpoint,
          requestHash,
          ctx.status,
          JSON.stringify(ctx.body ?? {}),
          bookingId && Number.isFinite(bookingId) ? bookingId : null,
          resolvedExpiresAt,
        ]
      );
    }
  },
}));
