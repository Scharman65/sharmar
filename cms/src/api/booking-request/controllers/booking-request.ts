import { factories } from "@strapi/strapi";
import crypto from "crypto";
import { randomUUID } from "crypto";


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
        status: "pending",
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

      if (existing.status === "declined") {
        return ctx.conflict("Final state; cannot approve");
      }

      if (existing.status === "approved" || existing.status === "confirmed") {
        ctx.status = 200;
        ctx.body = existing;
        return;
      }

      const now = new Date().toISOString();
      const updated = await strapi.entityService.update("api::booking-request.booking-request", existing.id, {
        data: ({
          status: "approved",
          approved_at: now,
          decided_at: now,
        } as any),
      });

      const result: any = {
        ok: true,
        booking_request: updated,
        auto_capture: {
          attempted: false,
        },
      };

      try {
        const payment = await strapi.db.connection
          .select("provider_intent_id", "status")
          .from("public.payments")
          .where({ provider: "stripe", booking_request_id: existing.id })
          .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
          .first();

        const intentId = String((payment && payment.provider_intent_id) || "").trim();
        const paymentStatus = String((payment && payment.status) || "").trim();

        if (!intentId) {
          result.auto_capture = {
            attempted: false,
            reason: "payment_not_found_for_booking_request",
          };
          ctx.status = 200;
          ctx.body = result;
          return;
        }

        result.auto_capture = {
          attempted: true,
          provider_intent_id: intentId,
          payment_status_before: paymentStatus || null,
        };

        const adminToken = String(strapi.config.get("payments.adminToken") || "").trim();
        if (!adminToken) {
          result.auto_capture.ok = false;
          result.auto_capture.error = "payments_admin_token_missing";
          ctx.status = 200;
          ctx.body = result;
          return;
        }

        const idem = "owner_approve_capture:" + intentId + ":" + randomUUID();
        const response = await fetch("http://127.0.0.1:1337/api/payments/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": adminToken,
            "Idempotency-Key": idem,
          },
          body: JSON.stringify({
            provider_intent_id: intentId,
          }),
        });

        let captureBody = null;
        try {
          captureBody = await response.json();
        } catch {
          captureBody = null;
        }

        result.auto_capture.http_status = response.status;
        result.auto_capture.response = captureBody;

        if (response.ok) {
          result.auto_capture.ok = true;
        } else if (
          response.status === 409 &&
          captureBody &&
          (
            captureBody.error === "payment_not_capturable" ||
            captureBody.error === "payment_not_capturable_provider_state"
          )
        ) {
          result.auto_capture.ok = false;
          result.auto_capture.non_fatal = true;
        } else {
          result.auto_capture.ok = false;
          result.auto_capture.non_fatal = true;
        }
      } catch (err) {
        result.auto_capture = {
          attempted: true,
          ok: false,
          non_fatal: true,
          error: "auto_capture_request_failed",
          message: String((err && err.message) || "unknown"),
        };
      }

      ctx.status = 200;
      ctx.body = result;
    },

    async requestDecline(ctx) {
      if (!requireOwnerActionToken(ctx)) return;
      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const existing = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!existing) return ctx.notFound("Booking request not found");

      if (existing.status === "confirmed") {
        return ctx.conflict("Final state; cannot decline");
      }

      if (existing.status === "declined") {
        ctx.status = 200;
        ctx.body = existing;
        return;
      }

      const body = ctx.request.body;
      const reqData = extractData(body);
      const note = typeof reqData?.decision_note === "string" ? reqData.decision_note : null;

      const result: any = {
        ok: true,
        request_decline: {
          attempted: false,
        },
      };

      const knex = strapi.db.connection;

      try {
        const payment = await knex
          .select("id", "provider_intent_id", "status", "booking_id")
          .from("public.payments")
          .where({ provider: "stripe", booking_request_id: existing.id })
          .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
          .first();

        const intentId = String((payment && payment.provider_intent_id) || "").trim();
        const paymentStatus = String((payment && payment.status) || "").trim().toLowerCase();

        if (!intentId) {
          const now = new Date().toISOString();
          const updated = await strapi.entityService.update("api::booking-request.booking-request", existing.id, {
            data: ({
              status: "declined",
              decided_at: now,
              decision_note: note,
            } as any),
          });

          ctx.status = 200;
          ctx.body = {
            ok: true,
            booking_request: updated,
            request_decline: {
              attempted: false,
              reason: "payment_not_found_for_booking_request",
            },
          };
          return;
        }

        result.request_decline = {
          attempted: true,
          provider_intent_id: intentId,
          payment_status_before: paymentStatus || null,
        };

        const stripe = strapi.service("api::payment.payment").getStripeClient();

        await knex.transaction(async (trx) => {
          await trx.raw("select pg_advisory_xact_lock(hashtext(?))", ["request_decline:" + intentId]);

          const b0 = await trx.raw(
            "select id, status, payment_intent_id, refund_id from public.bookings where payment_intent_id = ? limit 1",
            [intentId]
          );
          const b = (b0 && (b0.rows?.[0] || (Array.isArray(b0[0]) ? b0[0][0] : null))) || null;

          const pi = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
          const providerStatus = String((pi && pi.status) || "").toLowerCase();
          const ch: any = (pi && (pi as any).latest_charge) ? (pi as any).latest_charge : null;
          const chStatus = ch ? String(ch.status || "").toLowerCase() : "";
          const chPaid = !!(ch && (ch.paid === true));
          const hasSuccessfulCharge = providerStatus === "succeeded";

          let action = "none";
          let actionRef: string | null = null;

          if (hasSuccessfulCharge) {
            action = "refund";

            if (b && String(b.refund_id || "").trim()) {
              actionRef = String(b.refund_id || "").trim();
            } else {
              const refund = await stripe.refunds.create(
                { payment_intent: intentId, metadata: { public_token: token, action: "request_decline" } },
                { idempotencyKey: "request_decline_refund:" + intentId }
              );
              actionRef = String((refund && refund.id) || "").trim() || null;
              if (!actionRef) {
                ctx.status = 502;
                ctx.body = { error: "refund_failed_no_id", provider_intent_id: intentId };
                return;
              }
            }

            if (b) {
              await trx.raw(
                `update public.bookings
                    set status = 'expired'::text,
                        owner_decision = 'declined'::text,
                        owner_decision_at = coalesce(owner_decision_at, now()),
                        declined_at = coalesce(declined_at, now()),
                        confirmed_at = null,
                        decline_reason = coalesce(decline_reason, ?),
                        refund_id = coalesce(refund_id, ?)
                  where id = ?`,
                [note, actionRef, b.id]
              );
            }
          } else {
            action = "cancel";

            try {
              await stripe.paymentIntents.cancel(intentId, { cancellation_reason: "requested_by_customer" });
            } catch (e: any) {
              const msg = String((e && (e.message || (e.raw && e.raw.message))) || "").toLowerCase();
              const code = String((e && (e.code || (e.raw && e.raw.code))) || "").toLowerCase();
              const already = msg.includes("already") || code.includes("payment_intent_unexpected_state");
              if (!already) throw e;
            }

            await trx.raw(
              "update public.payments set status = 'canceled', metadata = coalesce(metadata, '{}'::jsonb) || ?::jsonb, updated_at = now() where provider = 'stripe' and provider_intent_id = ? and status not in ('succeeded')",
              [JSON.stringify({ provider_status: "canceled", last_action: "request_decline_cancel" }), intentId]
            );

            if (b) {
              await trx.raw(
                `update public.bookings
                    set status = 'expired'::text,
                        owner_decision = 'declined'::text,
                        owner_decision_at = coalesce(owner_decision_at, now()),
                        declined_at = coalesce(declined_at, now()),
                        confirmed_at = null,
                        decline_reason = coalesce(decline_reason, ?)
                  where id = ?`,
                [note, b.id]
              );
            }

            actionRef = "canceled";
          }

          await trx.raw(
            `update public.booking_requests
                set status = 'declined'::text,
                    updated_at = now(),
                    decided_at = case when decided_at is null then now() else decided_at end,
                    decision_note = coalesce(decision_note, ?)
              where id = ?`,
            [note, existing.id]
          );

          result.request_decline.action = action;
          result.request_decline.action_ref = actionRef;
          result.request_decline.booking_found = !!b;
          result.request_decline.provider_status = providerStatus;
        });

        const out = await strapi.db
          .query("api::booking-request.booking-request")
          .findOne({ where: { id: existing.id } });

        ctx.status = 200;
        ctx.body = {
          ok: true,
          booking_request: out,
          request_decline: result.request_decline,
        };
      } catch (err: any) {
        ctx.status = 502;
        ctx.body = {
          error: "request_decline_failed",
          message: String((err && err.message) || "unknown"),
          request_decline: result.request_decline,
        };
      }
    },

    async ownerConfirm(ctx) {
      if (!requireOwnerActionToken(ctx)) return;

      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const knex = strapi.db.connection;

      // Load booking_request by public_token
      const br = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!br) return ctx.notFound("Booking request not found");

      const brStatus = String(br.status || "").toLowerCase();
      if (brStatus === "confirmed" || brStatus === "declined") {
        ctx.status = 200;
        ctx.body = br;
        return;
      }

      if (brStatus !== "paid_pending_owner") {
        return ctx.conflict("Not in paid_pending_owner; cannot owner-confirm");
      }

      // Resolve payment_intent_id (provider_intent_id) from payments table
      const pay = await knex
        .select("provider_intent_id", "status")
        .from("public.payments")
        .where({ provider: "stripe", booking_request_id: br.id })
        .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
        .first();

      const intentId = String((pay && pay.provider_intent_id) || "").trim();
      if (!intentId) return ctx.conflict("payment_intent_id not found for booking_request");

      await knex.transaction(async (trx) => {
        await trx.raw("select pg_advisory_xact_lock(hashtext(?))", ["owner_decision:" + intentId]);

        const b0 = await trx.raw(
          "select id, status, payment_intent_id from public.bookings where payment_intent_id = ? limit 1",
          [intentId]
        );
        const b = (b0 && (b0.rows?.[0] || (Array.isArray(b0[0]) ? b0[0][0] : null))) || null;
        if (!b) {
          ctx.status = 409;
          ctx.body = { error: "booking_not_found_for_intent", provider_intent_id: intentId };
          return;
        }

        const bst = String(b.status || "").toLowerCase();
        if (bst === "confirmed") {
          // idempotent
        } else if (bst !== "paid_pending_owner") {
          ctx.status = 409;
          ctx.body = { error: "booking_not_in_paid_pending_owner", status: b.status, provider_intent_id: intentId };
          return;
        } else {
          await trx.raw(
            `update public.bookings
                set status = \x27deposit_paid\x27::text,
                    owner_decision = \x27confirmed\x27::text,
                    owner_decision_at = coalesce(owner_decision_at, now()),
                    confirmed_at = coalesce(confirmed_at, now()),
                    declined_at = null,
                    decline_reason = null,
                    owner_decision_by = owner_decision_by
              where id = ?`,
            [b.id]
          );
        }

        await trx.raw(
          `update public.booking_requests
              set status = \x27confirmed\x27::text,
                  updated_at = now(),
                  decided_at = case when decided_at is null then now() else decided_at end
            where id = ?`,
          [br.id]
        );
      });

      const out = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { id: br.id } });

      ctx.status = 200;
      ctx.body = { ok: true, status: "confirmed", booking_request: out, public_token: token };
    },

    async ownerRefund(ctx) {
      if (!requireOwnerActionToken(ctx)) return;

      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const body = ctx.request.body;
      const reqData = (body && body.data && typeof body.data === "object") ? body.data : (body || {});
      const reason = (typeof reqData?.decline_reason === "string" && reqData.decline_reason.trim())
        ? reqData.decline_reason.trim()
        : ((typeof reqData?.refund_reason === "string" && reqData.refund_reason.trim())
          ? reqData.refund_reason.trim()
          : "owner refund after confirmation");

      const knex = strapi.db.connection;

      const br = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!br) return ctx.notFound("Booking request not found");

      const brStatus = String(br.status || "").toLowerCase();
      if (brStatus === "declined") {
        ctx.status = 200;
        ctx.body = {
          ok: true,
          status: "declined",
          booking_request: br,
          public_token: token,
          refund: { attempted: false, reason: "already_declined" },
        };
        return;
      }

      if (brStatus !== "confirmed") {
        return ctx.conflict("Only confirmed booking requests can be refunded by owner");
      }

      const pay = await knex
        .select("provider_intent_id", "status", "booking_id")
        .from("public.payments")
        .where({ provider: "stripe", booking_request_id: br.id })
        .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
        .first();

      const intentId = String((pay && pay.provider_intent_id) || "").trim();
      if (!intentId) return ctx.conflict("payment_intent_id not found for booking_request");

      const payStatus = String((pay && pay.status) || "").toLowerCase();
      if (payStatus !== "succeeded") {
        return ctx.conflict("Only succeeded payments can be refunded");
      }

      const result: any = {
        attempted: true,
        provider_intent_id: intentId,
        payment_status_before: payStatus,
      };

      await knex.transaction(async (trx) => {
        await trx.raw("select pg_advisory_xact_lock(hashtext(?))", ["owner_refund:" + intentId]);

        const b0 = await trx.raw(
          "select id, status, payment_intent_id, refund_id from public.bookings where payment_intent_id = ? limit 1",
          [intentId]
        );
        const b = (b0 && (b0.rows?.[0] || (Array.isArray(b0[0]) ? b0[0][0] : null))) || null;
        if (!b) {
          ctx.status = 409;
          ctx.body = { error: "booking_not_found_for_intent", provider_intent_id: intentId };
          return;
        }

        const bst = String(b.status || "").toLowerCase();
        if (!(bst === "deposit_paid" || bst === "confirmed")) {
          ctx.status = 409;
          ctx.body = { error: "booking_not_refundable_in_current_state", status: b.status, provider_intent_id: intentId };
          return;
        }

        let refundId = String(b.refund_id || "").trim() || null;

        if (!refundId) {
          const stripe = strapi.service("api::payment.payment").getStripeClient();
          const pi = await stripe.paymentIntents.retrieve(intentId);
          const providerStatus = String((pi && pi.status) || "").toLowerCase();

          if (providerStatus !== "succeeded") {
            ctx.status = 409;
            ctx.body = { error: "payment_intent_not_succeeded", provider_intent_id: intentId, provider_status: providerStatus };
            return;
          }

          const idem = "owner_refund:" + intentId;
          const r = await stripe.refunds.create(
            { payment_intent: intentId, metadata: { public_token: token, action: "owner_refund" } },
            { idempotencyKey: idem }
          );
          refundId = String((r && r.id) || "").trim() || null;

          if (!refundId) {
            ctx.status = 502;
            ctx.body = { error: "refund_failed_no_id", provider_intent_id: intentId };
            return;
          }
        }

        await trx.raw(
          `update public.bookings
              set status = 'expired'::text,
                  owner_decision = 'declined'::text,
                  owner_decision_at = coalesce(owner_decision_at, now()),
                  declined_at = coalesce(declined_at, now()),
                  confirmed_at = null,
                  decline_reason = coalesce(decline_reason, ?),
                  refund_id = coalesce(refund_id, ?)
            where id = ?`,
          [reason, refundId, b.id]
        );

        await trx.raw(
          `update public.booking_requests
              set status = 'declined'::text,
                  updated_at = now(),
                  decided_at = case when decided_at is null then now() else decided_at end,
                  decision_note = coalesce(decision_note, ?)
            where id = ?`,
          [reason, br.id]
        );

        result.refund_id = refundId;
        result.booking_id = b.id;
      });

      const out = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { id: br.id } });

      ctx.status = 200;
      ctx.body = { ok: true, status: "declined", booking_request: out, public_token: token, refund: result };
    },

    async ownerDecline(ctx) {
      if (!requireOwnerActionToken(ctx)) return;

      const token = String(ctx.params?.token || "").trim();
      if (!token) return ctx.badRequest("Missing token");

      const body = ctx.request.body;
      const reqData = (body && body.data && typeof body.data === "object") ? body.data : (body || {});
      const reason = (typeof reqData?.decline_reason === "string" && reqData.decline_reason.trim())
        ? reqData.decline_reason.trim()
        : null;

      const knex = strapi.db.connection;

      const br = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!br) return ctx.notFound("Booking request not found");

      const brStatus = String(br.status || "").toLowerCase();
      if (brStatus === "declined") {
        ctx.status = 200;
        ctx.body = { ok: true, status: "declined", booking_request: br, public_token: token };
        return;
      }
      if (brStatus === "confirmed") {
        return ctx.conflict("Final state; cannot owner-decline");
      }
      if (brStatus !== "paid_pending_owner") {
        return ctx.conflict("Not in paid_pending_owner; cannot owner-decline");
      }

      const pay = await knex
        .select("provider_intent_id", "status")
        .from("public.payments")
        .where({ provider: "stripe", booking_request_id: br.id })
        .orderByRaw("coalesce(updated_at, created_at) desc nulls last, id desc")
        .first();

      const intentId = String((pay && pay.provider_intent_id) || "").trim();
      if (!intentId) return ctx.conflict("payment_intent_id not found for booking_request");

      // We do refund-first (Stripe), then mark declined in DB.
      // NOTE: This holds an advisory tx lock while calling Stripe (rare action; acceptable).
      await knex.transaction(async (trx) => {
        await trx.raw("select pg_advisory_xact_lock(hashtext(?))", ["owner_decision:" + intentId]);

        const b0 = await trx.raw(
          "select id, status, payment_intent_id, refund_id from public.bookings where payment_intent_id = ? limit 1",
          [intentId]
        );
        const b = (b0 && (b0.rows?.[0] || (Array.isArray(b0[0]) ? b0[0][0] : null))) || null;
        if (!b) {
          ctx.status = 409;
          ctx.body = { error: "booking_not_found_for_intent", provider_intent_id: intentId };
          return;
        }

        const bst = String(b.status || "").toLowerCase();
        if (bst === "declined") {
          // idempotent
          return;
        }
        if (bst === "confirmed") {
          ctx.status = 409;
          ctx.body = { error: "booking_already_confirmed", provider_intent_id: intentId };
          return;
        }
        if (bst !== "paid_pending_owner") {
          ctx.status = 409;
          ctx.body = { error: "booking_not_in_paid_pending_owner", status: b.status, provider_intent_id: intentId };
          return;
        }

        // If refund already exists, just mark declined (idempotent recovery)
        let refundId = String(b.refund_id || "").trim() || null;

        if (!refundId) {
          const stripe = strapi.service("api::payment.payment").getStripeClient();
          const idem = "owner_decline_refund:" + intentId;

          // refund_guard_v1: refund only if there is a successful charge for this PaymentIntent
          const pi = await stripe.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
          const ch: any = (pi && (pi as any).latest_charge) ? (pi as any).latest_charge : null;
          const chStatus = ch ? String(ch.status || "").toLowerCase() : "";
          const chPaid = !!(ch && (ch.paid === true));
          const hasSuccessfulCharge = (chStatus === "succeeded") || chPaid;

          if (!hasSuccessfulCharge) {
            refundId = "skipped_no_successful_charge";
          } else {
            const r = await stripe.refunds.create(
              { payment_intent: intentId, metadata: { public_token: token, action: "owner_decline" } },
              { idempotencyKey: idem }
            );
            refundId = String((r && r.id) || "").trim() || null;
          }

          if (!refundId) {
            ctx.status = 502;
            ctx.body = { error: "refund_failed_no_id", provider_intent_id: intentId };
            return;
          }
        }

        await trx.raw(
          `update public.bookings
              set status = \x27expired\x27::text,
                  owner_decision = \x27declined\x27::text,
                  owner_decision_at = coalesce(owner_decision_at, now()),
                  declined_at = coalesce(declined_at, now()),
                  confirmed_at = null,
                  decline_reason = coalesce(decline_reason, ?),
                  refund_id = coalesce(refund_id, ?)
            where id = ?`,
          [reason, refundId, b.id]
        );

        await trx.raw(
          `update public.booking_requests
              set status = \x27declined\x27::text,
                  updated_at = now(),
                  decided_at = case when decided_at is null then now() else decided_at end,
                  decision_note = coalesce(decision_note, ?)
            where id = ?`,
          [reason, br.id]
        );
      });

      const out = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { id: br.id } });

      ctx.status = 200;
      ctx.body = { ok: true, status: "declined", booking_request: out, public_token: token, provider_intent_id: intentId };
    },

    async statusByToken(ctx) {
      const token = String((ctx.params && ctx.params.token) || "").trim();

      if (!token) {
        ctx.status = 400;
        ctx.body = { error: "token_required" };
        return;
      }

      const br = await strapi.db
        .query("api::booking-request.booking-request")
        .findOne({ where: { public_token: token } });

      if (!br) {
        ctx.status = 404;
        ctx.body = { error: "booking_request_not_found", public_token: token };
        return;
      }

      const payRes = await strapi.db.connection.raw(
        `select id, provider_intent_id, status, booking_id, created_at, updated_at
           from public.payments
          where provider = 'stripe' and booking_request_id = ?
          order by id desc
          limit 1`,
        [br.id]
      );

      const payment =
        (payRes && (payRes.rows?.[0] || (Array.isArray(payRes[0]) ? payRes[0][0] : null))) || null;

      let booking: any = null;

      if (payment && payment.booking_id != null) {
        const bRes = await strapi.db.connection.raw(
          `select id, status, payment_intent_id, refund_id, created_at
             from public.bookings
            where id = ?
            limit 1`,
          [payment.booking_id]
        );

        booking =
          (bRes && (bRes.rows?.[0] || (Array.isArray(bRes[0]) ? bRes[0][0] : null))) || null;
      }

      ctx.status = 200;
      ctx.body = {
        ok: true,
        public_token: token,
        booking_request: {
          id: br.id,
          status: br.status || null,
          decided_at: (br as any).decided_at || null,
          approved_at: (br as any).approved_at || null,
          decision_note: (br as any).decision_note || null,
          created_at: (br as any).createdAt || (br as any).created_at || null,
          updated_at: (br as any).updatedAt || (br as any).updated_at || null,
        },
        payment: payment
          ? {
              id: payment.id,
              provider_intent_id: payment.provider_intent_id || null,
              status: payment.status || null,
              booking_id: payment.booking_id || null,
              created_at: payment.created_at || null,
              updated_at: payment.updated_at || null,
            }
          : null,
        booking: booking
          ? {
              id: booking.id,
              status: booking.status || null,
              payment_intent_id: booking.payment_intent_id || null,
              refund_id: booking.refund_id || null,
              created_at: booking.created_at || null,
            }
          : null,
      };
    }

  })
);
