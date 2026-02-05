import { factories } from "@strapi/strapi";
import crypto from "crypto";


function requireOwnerActionToken(ctx: any): boolean {
  const expected = String(process.env.SHARMAR_OWNER_ACTION_TOKEN || "").trim();
  if (!expected) {
    ctx.status = 500;
    ctx.body = { error: "Server misconfigured (missing owner action token)" };
    return false;
  }

  const raw = ctx.request?.headers?.["x-owner-action-token"];
  const got = (Array.isArray(raw) ? String(raw[0] || "") : String(raw || "")).trim();

  if (!got || got !== expected) {
    ctx.status = 401;
    ctx.body = { error: "Unauthorized" };
    return false;
  }
  return true;
}

function extractData(body: any): any {
  if (!body) return {};
  if (body.data && typeof body.data === "object") return body.data;
  return body;
}

function extractPublicToken(body: any): string | null {
  const data = extractData(body);
  if (typeof data.public_token === "string" && data.public_token.trim().length > 0) {
    return data.public_token.trim();
  }
  return null;
}

function stableStringify(v: any): string {
  if (v === null || v === undefined) return "null";
  if (typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stableStringify((v as any)[k])).join(",") + "}";
}

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function isUniqueViolationForPublicToken(err: any): boolean {
  const message = String(err?.message || "");
  const code = String(err?.code || "");
  const details = String(err?.details || "");
  return (
    code === "23505" ||
    message.includes("duplicate key value violates unique constraint") ||
    message.includes("booking_requests_public_token_uidx") ||
    details.includes("booking_requests_public_token_uidx")
  );
}

function parseDate(value: any): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default factories.createCoreController(
  "api::booking-request.booking-request",
  ({ strapi }) => ({
    async create(ctx) {
      const body = ctx.request.body;
      const data = extractData(body);
      const publicToken = extractPublicToken(body);

      try {
        const created = await strapi.entityService.create("api::booking-request.booking-request", {
          data,
        });
        ctx.status = 201;
        ctx.body = created;
      } catch (err: any) {
        if (publicToken && isUniqueViolationForPublicToken(err)) {
          ctx.status = 409;
          ctx.body = { error: "public_token already exists" };
          return;
        }
        throw err;
      }
    },

    async idempotentCreate(ctx) {
      const body = ctx.request.body;
      const data = extractData(body);

      const raw = ctx?.request?.headers?.["idempotency-key"] ?? "";
      const idemKey = (Array.isArray(raw) ? String(raw[0] || "") : String(raw || "")).trim();
      if (!idemKey) {
        ctx.status = 400;
        ctx.body = { error: "Idempotency-Key header is required" };
        return;
      }

      const endpoint = "POST:/api/booking-requests-idempotent";
      const requestHash = sha256Hex(stableStringify(data));
      const knex = strapi.db.connection;

      const existing = await knex("idempotency_keys").where({ key: idemKey, endpoint }).first();
      if (existing) {
        if (String(existing.request_hash) !== requestHash) {
          ctx.status = 409;
          ctx.body = { error: "Idempotency-Key conflict (payload differs)" };
          return;
        }

        let out = existing.response_body;
        if (existing.booking_id) {
          const entity = await strapi.db
            .query("api::booking-request.booking-request")
            .findOne({ where: { id: existing.booking_id } });
          if (entity) out = entity;
        }

        ctx.set("X-Idempotency-Replayed", "true");
        ctx.status = Number(existing.response_status) || 200;
        ctx.body = out;
        return;
      }

      try {
        const created = await strapi.entityService.create("api::booking-request.booking-request", {
          data,
        });

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        try {
          await knex("idempotency_keys").insert({
            key: idemKey,
            endpoint,
            request_hash: requestHash,
            response_status: 201,
            response_body: { id: created?.id ?? null },
            booking_id: created?.id ?? null,
            expires_at: expiresAt,
          });
        } catch (e) {
          const code = String(e?.code || "");
          const msg = String(e?.message || "");
          const detail = String(e?.detail || "");
          const constraint = String(e?.constraint || "");
          const isUnique =
            code === "23505" ||
            constraint.includes("idempotency_keys_key_endpoint_key") ||
            msg.includes("idempotency_keys_key_endpoint_key") ||
            detail.includes("idempotency_keys_key_endpoint_key");

          if (!isUnique) throw e;

          const raced = await knex("idempotency_keys").where({ key: idemKey, endpoint }).first();
          if (!raced) throw e;

          if (String(raced.request_hash) !== requestHash) {
            ctx.status = 409;
            ctx.body = { error: "Idempotency-Key conflict (payload differs)" };
            return;
          }

          let out = raced.response_body;
          if (raced.booking_id) {
            const entity = await strapi.db
              .query("api::booking-request.booking-request")
              .findOne({ where: { id: raced.booking_id } });
            if (entity) out = entity;
          }

          ctx.set("X-Idempotency-Replayed", "true");
          ctx.status = Number(raced.response_status) || 200;
          ctx.body = out;
          return;
        }

        ctx.set("X-Idempotency-Replayed", "false");
        ctx.status = 201;
        ctx.body = created;
      } catch (err) {
        const token = extractPublicToken(body);
        if (token && isUniqueViolationForPublicToken(err)) {
          const existing2 = await strapi.db
            .query("api::booking-request.booking-request")
            .findOne({ where: { public_token: token } });

          ctx.status = 409;
          ctx.body = { error: "public_token already exists", existing_id: existing2?.id ?? null };
          return;
        }
        throw err;
      }
    },


    async requestCreate(ctx) {
      const body = ctx.request.body;
      const data = extractData(body);

      const fullName = data.full_name;
      const phone = data.phone;
      const startRaw = data.start_datetime;
      const endRaw = data.end_datetime;

      if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
        return ctx.badRequest("full_name must be defined");
      }
      if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
        return ctx.badRequest("phone must be defined");
      }

      const start = parseDate(startRaw);
      const end = parseDate(endRaw);
      if (!start) return ctx.badRequest("start_datetime must be a valid datetime");
      if (!end) return ctx.badRequest("end_datetime must be a valid datetime");
      if (end.getTime() <= start.getTime()) return ctx.badRequest("end_datetime must be after start_datetime");

      const publicToken = extractPublicToken(body);
      const ip = String(ctx.request?.ip || "");
      const ua = String(ctx.request?.header?.["user-agent"] || "");

      const merged: any = {
        ...data,
        status: "new",
        source_ip: data.source_ip ?? ip,
        user_agent: data.user_agent ?? ua,
      };

      if (!merged.fingerprint) {
        merged.fingerprint = sha256Hex(
          stableStringify({
            full_name: merged.full_name,
            phone: merged.phone,
            start: merged.start_datetime,
            end: merged.end_datetime,
            boat: merged.boat ?? null,
          })
        );
      }

      try {
        const created = await strapi.entityService.create("api::booking-request.booking-request", {
          data: merged,
        });
        ctx.status = 201;
        ctx.body = created;
      } catch (err: any) {
        if (publicToken && isUniqueViolationForPublicToken(err)) {
          ctx.status = 409;
          ctx.body = { error: "public_token already exists" };
          return;
        }
        throw err;
      }
    },

    async requestApprove(ctx) {
      if (!requireOwnerActionToken(ctx)) return;
      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const existing = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!existing) return ctx.notFound("Booking request not found");

      if (existing.status === "confirmed" || existing.status === "declined") {
        return ctx.conflict("Final state; cannot approve");
      }

      const now = new Date().toISOString();
      const updated = await strapi.entityService.update("api::booking-request.booking-request", existing.id, {
        data: ({
          status: "confirmed",
          approved_at: now,
          decided_at: now,
        } as any),
      });

      ctx.status = 200;
      ctx.body = updated;
    },

    async requestDecline(ctx) {
      if (!requireOwnerActionToken(ctx)) return;
      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const existing = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!existing) return ctx.notFound("Booking request not found");

      if (existing.status === "confirmed" || existing.status === "declined") {
        return ctx.conflict("Final state; cannot decline");
      }

      const body = ctx.request.body;
      const reqData = extractData(body);
      const note = typeof reqData?.decision_note === "string" ? reqData.decision_note : null;

      const now = new Date().toISOString();
      const updated = await strapi.entityService.update("api::booking-request.booking-request", existing.id, {
        data: ({
          status: "declined",
          decided_at: now,
          decision_note: note,
        } as any),
      });

      ctx.status = 200;
      ctx.body = updated;
    },
  })
);
