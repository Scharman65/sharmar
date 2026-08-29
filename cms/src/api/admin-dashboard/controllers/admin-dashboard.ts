import { timingSafeEqual } from "node:crypto";

const ROW_LIMIT = 100;

function adminTokens() {
  const paymentsConfig = strapi.config.get("payments") as { adminToken?: string } | undefined;

  return Array.from(
    new Set(
      [
        String(paymentsConfig?.adminToken || "").trim(),
        String(process.env.PAYMENTS_ADMIN_TOKEN || "").trim(),
        String(process.env.SHARMAR_OWNER_ACTION_TOKEN || "").trim(),
      ].filter(Boolean)
    )
  );
}

function tokenMatches(providedToken: string, expectedToken: string) {
  const provided = Buffer.from(providedToken);
  const expected = Buffer.from(expectedToken);

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}

function requestToken(ctx) {
  return String(ctx.request.headers["x-admin-token"] || ctx.request.headers["X-Admin-Token"] || "").trim();
}

function rawRows(result) {
  if (Array.isArray(result?.rows)) return result.rows;
  if (Array.isArray(result?.[0])) return result[0];
  return [];
}

function firstRawRow(result) {
  return rawRows(result)[0] || null;
}

function nullableString(value) {
  return value == null ? null : String(value);
}

function nullableNumber(value) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableBoolean(value) {
  if (value == null) return null;
  return Boolean(value);
}

function invalidAdminToken(ctx) {
  const expectedTokens = adminTokens();

  if (!expectedTokens.length) {
    ctx.status = 503;
    ctx.body = {
      ok: false,
      error: "admin_token_missing",
    };
    return true;
  }

  const providedToken = requestToken(ctx);

  if (
    !providedToken ||
    !expectedTokens.some((expectedToken) =>
      tokenMatches(providedToken, expectedToken)
    )
  ) {
    ctx.status = 401;
    ctx.body = {
      ok: false,
      error: "admin_unauthorized",
    };
    return true;
  }

  return false;
}

function parsePeriod(value) {
  const raw = String(value || "30").trim().toLowerCase();
  if (raw === "all") return "all";
  if (raw === "7") return 7;
  if (raw === "30") return 30;
  if (raw === "90") return 90;
  return null;
}

function parseRecentLimit(value) {
  if (value == null || value === "") return 25;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100) return null;
  return number;
}

function parseExternalRefundStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return status === "none" || status === "required" || status === "completed"
    ? status
    : null;
}

type ExternalRefundStatus = "none" | "required" | "completed";
type ExternalRefundTransition =
  | { ok: true; idempotent: boolean }
  | { ok: false; code: "external_refund_transition_invalid" | "external_refund_status_completed_terminal" };

type ExternalRefundTransitionErrorCode =
  Extract<ExternalRefundTransition, { ok: false }>["code"];

type ExternalRefundUpdateResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | ExternalRefundTransitionErrorCode
        | "external_refund_transaction_unavailable"
        | "booking_request_not_found"
        | "external_refund_transition_conflict";
    };

export function resolveExternalRefundTransition(
  current: ExternalRefundStatus,
  next: ExternalRefundStatus
): ExternalRefundTransition {
  if (current === next) return { ok: true, idempotent: true };
  if (current === "completed") return { ok: false, code: "external_refund_status_completed_terminal" };
  if (current === "none" && next === "required") return { ok: true, idempotent: false };
  if (current === "required" && (next === "completed" || next === "none")) {
    return { ok: true, idempotent: false };
  }
  return { ok: false, code: "external_refund_transition_invalid" };
}


function jsonArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

async function countTable(tableName: string, warnings: string[], label: string) {
  try {
    const result = await strapi.db.connection.raw(`select count(*)::int as count from ${tableName}`);
    return nullableNumber(firstRawRow(result)?.count) ?? 0;
  } catch (error) {
    warnings.push(`Could not count ${label}.`);
    return null;
  }
}

function mapBookingRequest(row) {
  return {
    id: nullableNumber(row.id),
    public_token: nullableString(row.public_token),
    status: nullableString(row.status),
    locale: nullableString(row.locale),
    customer_name: nullableString(row.customer_name),
    customer_email: nullableString(row.customer_email),
    customer_phone: nullableString(row.customer_phone),
    boat_id: nullableNumber(row.boat_id),
    boat_document_id: nullableString(row.boat_document_id),
    boat_title: nullableString(row.boat_title),
    experience_id: nullableNumber(row.experience_id),
    experience_title: nullableString(row.experience_title),
    owner_amount: nullableNumber(row.owner_amount),
    marketplace_fee_amount: nullableNumber(row.marketplace_fee_amount),
    customer_total_amount: nullableNumber(row.customer_total_amount),
    currency: nullableString(row.currency),
    external_refund_status: nullableString(row.external_refund_status) || "none",
    external_refund_marked_at: nullableString(row.external_refund_marked_at),
    external_refund_completed_at: nullableString(row.external_refund_completed_at),
    created_at: nullableString(row.created_at),
    updated_at: nullableString(row.updated_at),
  };
}

async function loadBookingRequests(warnings: string[]) {
  try {
    const result = await strapi.db.connection.raw(
      `
      select
        br.id,
        br.public_token,
        br.status,
        null::text as locale,
        br.full_name as customer_name,
        br.email as customer_email,
        br.phone as customer_phone,
        min(bl.boat_id) as boat_id,
        min(b.document_id) as boat_document_id,
        min(b.title) as boat_title,
        min(el.experience_id) as experience_id,
        min(e.title) as experience_title,
        br.owner_amount,
        br.marketplace_fee_amount,
        br.customer_total_amount,
        br.currency,
        br.external_refund_status,
        br.external_refund_marked_at,
        br.external_refund_completed_at,
        br.created_at,
        br.updated_at
      from public.booking_requests br
      left join public.booking_requests_boat_lnk bl
        on bl.booking_request_id = br.id
      left join public.boats b
        on b.id = bl.boat_id
      left join public.booking_requests_experience_lnk el
        on el.booking_request_id = br.id
      left join public.experiences e
        on e.id = el.experience_id
      group by br.id
      order by br.created_at desc nulls last, br.id desc
      limit ?
      `,
      [ROW_LIMIT]
    );

    return rawRows(result).map(mapBookingRequest);
  } catch (error) {
    warnings.push("Could not load linked booking request details; returning base booking request rows.");
  }

  try {
    const result = await strapi.db.connection.raw(
      `
      select
        id,
        public_token,
        status,
        null::text as locale,
        full_name as customer_name,
        email as customer_email,
        phone as customer_phone,
        null::int as boat_id,
        null::text as boat_document_id,
        null::text as boat_title,
        null::int as experience_id,
        null::text as experience_title,
        owner_amount,
        marketplace_fee_amount,
        customer_total_amount,
        currency,
        external_refund_status,
        external_refund_marked_at,
        external_refund_completed_at,
        created_at,
        updated_at
      from public.booking_requests
      order by created_at desc nulls last, id desc
      limit ?
      `,
      [ROW_LIMIT]
    );

    return rawRows(result).map(mapBookingRequest);
  } catch (error) {
    warnings.push("Could not load booking requests.");
    return [];
  }
}

async function loadPayments(warnings: string[]) {
  try {
    const result = await strapi.db.connection.raw(
      `
      select
        p.id,
        p.provider,
        p.provider_intent_id,
        p.amount_cents,
        p.currency,
        p.status,
        p.booking_request_id,
        min(b.document_id) as boat_document_id,
        min(b.title) as boat_title,
        min(marina.name) as marina_name,
        p.metadata ->> 'provider_status' as provider_status,
        p.metadata ->> 'last_event_type' as last_event_type,
        p.metadata ->> 'webhook_received_at' as webhook_received_at,
        p.created_at,
        p.updated_at
      from public.payments p
      left join public.booking_requests br
        on br.id = p.booking_request_id
      left join public.booking_requests_boat_lnk bl
        on bl.booking_request_id = br.id
      left join public.boats b
        on b.id = bl.boat_id
      left join public.boats_home_marina_lnk bml
        on bml.boat_id = b.id
      left join public.locations marina
        on marina.id = bml.location_id
      group by p.id
      order by p.created_at desc nulls last, p.id desc
      limit ?
      `,
      [ROW_LIMIT]
    );

    return rawRows(result).map((row) => {
      const amountCents = nullableNumber(row.amount_cents);

      return {
        id: nullableNumber(row.id),
        provider: nullableString(row.provider),
        provider_intent_id: nullableString(row.provider_intent_id),
        provider_payment_id: nullableString(row.provider_intent_id),
        amount_cents: amountCents == null ? null : Math.trunc(amountCents),
        currency: nullableString(row.currency),
        status: nullableString(row.status),
        booking_request_id: nullableNumber(row.booking_request_id),
        boat_document_id: nullableString(row.boat_document_id),
        boat_title: nullableString(row.boat_title),
        marina_name: nullableString(row.marina_name),
        provider_status: nullableString(row.provider_status),
        last_event_type: nullableString(row.last_event_type),
        webhook_received_at: nullableString(row.webhook_received_at),
        created_at: nullableString(row.created_at),
        updated_at: nullableString(row.updated_at),
      };
    });
  } catch (error) {
    warnings.push("Could not load payments.");
    return [];
  }
}

async function loadOwners(warnings: string[]) {
  try {
    const result = await strapi.db.connection.raw(
      `
      select
        op.id as profile_id,
        l.user_id,
        nullif(to_jsonb(u) ->> 'email', '') as email,
        nullif(to_jsonb(u) ->> 'username', '') as username,
        nullif(to_jsonb(u) ->> 'confirmed', '')::boolean as confirmed,
        nullif(to_jsonb(u) ->> 'blocked', '')::boolean as blocked,
        nullif(trim(concat(coalesce(op.first_name, ''), ' ', coalesce(op.last_name, ''))), '') as display_name,
        op.phone,
        op.verification_status,
        op.documents_uploaded_at,
        op.verified_at,
        op.rejected_at,
        op.rejection_reason,
        op.archived_at,
        coalesce(u.must_change_password, false) as must_change_password,
        coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', file.id,
                'name', file.name,
                'url', file.url,
                'mime', file.mime,
                'field', relation.field
              )
              order by relation.field, relation."order", file.id
            )
            from public.files_related_mph relation
            inner join public.files file
              on file.id = relation.file_id
            where
              relation.related_type = 'api::owner-profile.owner-profile'
              and relation.related_id = op.id
              and relation.field in (
                'passport_document',
                'identity_document',
                'license_document'
              )
          ),
          '[]'::jsonb
        ) as documents,
        op.created_at,
        op.updated_at
      from public.owner_profiles op
      left join public.owner_profiles_user_lnk l
        on l.owner_profile_id = op.id
      left join public.up_users u
        on u.id = l.user_id
      order by op.created_at desc nulls last, op.id desc
      limit ?
      `,
      [ROW_LIMIT]
    );

    return rawRows(result).map((row) => ({
      id: nullableNumber(row.profile_id),
      user_id: nullableNumber(row.user_id),
      email: nullableString(row.email),
      username: nullableString(row.username),
      confirmed: nullableBoolean(row.confirmed),
      blocked: nullableBoolean(row.blocked),
      profile_id: nullableNumber(row.profile_id),
      display_name: nullableString(row.display_name),
      phone: nullableString(row.phone),
      verification_status: nullableString(row.verification_status),
      documents_uploaded_at: nullableString(row.documents_uploaded_at),
      verified_at: nullableString(row.verified_at),
      rejected_at: nullableString(row.rejected_at),
      rejection_reason: nullableString(row.rejection_reason),
      archived_at: nullableString(row.archived_at),
      must_change_password: nullableBoolean(row.must_change_password),
      documents: jsonArray(row.documents),
      document_count: jsonArray(row.documents).length,
      created_at: nullableString(row.created_at),
      updated_at: nullableString(row.updated_at),
    }));
  } catch (error) {
    warnings.push("Could not load owners.");
    return [];
  }
}

async function loadBoatOwnerLinks(warnings: string[]) {
  try {
    const result = await strapi.db.connection.raw(
      `
      select
        b.id as boat_id,
        b.document_id as boat_document_id,
        b.locale as boat_locale,
        b.owner_user_id,
        b.created_by_id,
        op.id as owner_profile_id,
        nullif(to_jsonb(u) ->> 'email', '') as owner_email,
        nullif(to_jsonb(u) ->> 'username', '') as owner_username,
        nullif(trim(concat(coalesce(op.first_name, ''), ' ', coalesce(op.last_name, ''))), '') as owner_display_name,
        op.phone as owner_phone,
        op.verification_status as owner_verification_status,
        nullif(to_jsonb(u) ->> 'confirmed', '')::boolean as owner_confirmed,
        nullif(to_jsonb(u) ->> 'blocked', '')::boolean as owner_blocked,
        marina.id as home_marina_id,
        marina.document_id as home_marina_document_id,
        marina.name as home_marina_name,
        marina.slug as home_marina_slug,
        marina.locale as home_marina_locale
      from public.boats b
      left join public.up_users u
        on u.id = coalesce(b.owner_user_id, b.created_by_id)
      left join public.owner_profiles_user_lnk opul
        on opul.user_id = u.id
      left join public.owner_profiles op
        on op.id = opul.owner_profile_id
      left join public.boats_home_marina_lnk bhml
        on bhml.boat_id = b.id
      left join public.locations marina
        on marina.id = bhml.location_id
      order by b.updated_at desc nulls last, b.id desc
      limit ?
      `,
      [ROW_LIMIT * 5]
    );

    return rawRows(result).map((row) => ({
      boat_id: nullableNumber(row.boat_id),
      boat_document_id: nullableString(row.boat_document_id),
      boat_locale: nullableString(row.boat_locale),
      owner_user_id: nullableNumber(row.owner_user_id),
      created_by_id: nullableNumber(row.created_by_id),
      owner_profile_id: nullableNumber(row.owner_profile_id),
      owner_email: nullableString(row.owner_email),
      owner_username: nullableString(row.owner_username),
      owner_display_name: nullableString(row.owner_display_name),
      owner_phone: nullableString(row.owner_phone),
      owner_verification_status: nullableString(row.owner_verification_status),
      owner_confirmed: nullableBoolean(row.owner_confirmed),
      owner_blocked: nullableBoolean(row.owner_blocked),
      home_marina_id: nullableNumber(row.home_marina_id),
      home_marina_document_id: nullableString(row.home_marina_document_id),
      home_marina_name: nullableString(row.home_marina_name),
      home_marina_slug: nullableString(row.home_marina_slug),
      home_marina_locale: nullableString(row.home_marina_locale),
    }));
  } catch (error) {
    warnings.push("Could not load boat owner links.");
    return [];
  }
}

export default {
  async summary(ctx) {
    if (invalidAdminToken(ctx)) return;

    const warnings: string[] = [];
    const [bookingRequests, payments, owners, boatOwnerLinks, totalBookingRequests, totalPayments, totalOwners] = await Promise.all([
      loadBookingRequests(warnings),
      loadPayments(warnings),
      loadOwners(warnings),
      loadBoatOwnerLinks(warnings),
      countTable("public.booking_requests", warnings, "booking requests"),
      countTable("public.payments", warnings, "payments"),
      countTable("public.owner_profiles", warnings, "owners"),
    ]);
    const bookingRequestComplete = totalBookingRequests !== null && bookingRequests.length >= totalBookingRequests;
    const paymentsComplete = totalPayments !== null && payments.length >= totalPayments;

    ctx.set("cache-control", "no-store");
    ctx.status = 200;
    ctx.body = {
      ok: true,
      bookingRequests,
      payments,
      owners,
      boatOwnerLinks,
      summary: {
        totalBookingRequests: totalBookingRequests ?? bookingRequests.length,
        totalPayments: totalPayments ?? payments.length,
        totalOwners: totalOwners ?? owners.length,
      },
      collectionCompleteness: {
        bookingRequests: {
          rowLimit: ROW_LIMIT,
          returned: bookingRequests.length,
          total: totalBookingRequests,
          complete: bookingRequestComplete,
        },
        payments: {
          rowLimit: ROW_LIMIT,
          returned: payments.length,
          total: totalPayments,
          complete: paymentsComplete,
        },
      },
      warnings,
    };
  },

  async moderationEvents(ctx) {
    if (invalidAdminToken(ctx)) return;

    const rows = await strapi.db
      .query("api::moderation-event.moderation-event")
      .findMany({
        select: [
          "id",
          "entity_type",
          "entity_document_id",
          "entity_id",
          "action",
          "previous_status",
          "new_status",
          "comment",
          "actor",
          "occurred_at",
          "metadata",
        ],
        orderBy: {
          occurred_at: "desc",
        },
        limit: 50,
      });

    ctx.set("cache-control", "no-store");
    ctx.status = 200;
    ctx.body = {
      ok: true,
      data: Array.isArray(rows) ? rows : [],
    };
  },

  async marketplaceAnalytics(ctx) {
    if (invalidAdminToken(ctx)) return;

    const period = parsePeriod(ctx.query?.period);
    if (!period) {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        code: "invalid_period",
      };
      return;
    }

    const recentLimit = parseRecentLimit(ctx.query?.recentLimit);
    if (recentLimit === null) {
      ctx.status = 400;
      ctx.body = {
        ok: false,
        code: "invalid_recent_limit",
      };
      return;
    }

    const result = await strapi
      .service("api::admin-dashboard.marketplace-analytics")
      .build({ period, recentLimit });

    ctx.set("cache-control", "no-store");
    ctx.status = 200;
    ctx.body = result;
  },

  async updateExternalRefund(ctx) {
    if (invalidAdminToken(ctx)) return;

    const id = Number(ctx.params?.id);
    if (!Number.isInteger(id) || id <= 0) {
      ctx.status = 400;
      ctx.body = { ok: false, code: "invalid_booking_request_id" };
      return;
    }

    const data = ctx.request.body && typeof ctx.request.body === "object" && ctx.request.body.data
      ? ctx.request.body.data
      : ctx.request.body;
    const keys = data && typeof data === "object" ? Object.keys(data) : [];
    if (keys.length !== 1 || keys[0] !== "external_refund_status") {
      ctx.status = 400;
      ctx.body = { ok: false, code: "invalid_external_refund_payload" };
      return;
    }

    const status = parseExternalRefundStatus(data.external_refund_status);
    if (!status) {
      ctx.status = 400;
      ctx.body = { ok: false, code: "invalid_external_refund_status" };
      return;
    }

    let row: any = null;
    let previousStatus: ExternalRefundStatus = "none";
    let transitionIdempotent = false;

    const transitionResult: ExternalRefundUpdateResult = await strapi.db.transaction(
      async ({ trx } = {}): Promise<ExternalRefundUpdateResult> => {
      if (!trx) {
        return { ok: false, code: "external_refund_transaction_unavailable" };
      }

      const current = await trx("public.booking_requests")
        .select(
          "id",
          "status",
          "external_refund_status",
          "external_refund_marked_at",
          "external_refund_completed_at"
        )
        .where({ id })
        .forUpdate()
        .first();

      if (!current) return { ok: false, code: "booking_request_not_found" };

      previousStatus = parseExternalRefundStatus(current.external_refund_status) || "none";
      const transition = resolveExternalRefundTransition(previousStatus, status);
      if (!transition.ok) return transition;
      transitionIdempotent = transition.idempotent;

      if (transition.idempotent) {
        row = current;
      }

      const patch =
        status === "none"
          ? {
              external_refund_status: "none",
              external_refund_marked_at: null,
              external_refund_completed_at: null,
            }
          : status === "required"
            ? {
                external_refund_status: "required",
                external_refund_marked_at: trx.raw("coalesce(external_refund_marked_at, now())"),
                external_refund_completed_at: null,
              }
            : {
                external_refund_status: "completed",
                external_refund_marked_at: trx.raw("coalesce(external_refund_marked_at, now())"),
                external_refund_completed_at: trx.fn.now(),
              };

      if (!transition.idempotent) {
        const updated = await trx("public.booking_requests")
          .where({ id })
          .andWhereRaw("coalesce(external_refund_status, 'none') = ?", [previousStatus])
          .update({
            ...patch,
            updated_at: trx.fn.now(),
          })
          .returning([
            "id",
            "status",
            "external_refund_status",
            "external_refund_marked_at",
            "external_refund_completed_at",
          ]);

        row = Array.isArray(updated) ? updated[0] : null;
        if (!row) return { ok: false, code: "external_refund_transition_conflict" };
      }

      await strapi.db.query("api::moderation-event.moderation-event").create({
        data: {
          entity_type: "booking_request",
          entity_id: id,
          action: transition.idempotent
            ? "external_refund_marker_idempotent"
            : "external_refund_marker_update",
          previous_status: previousStatus,
          new_status: status,
          actor: "sharmar-admin",
          occurred_at: new Date().toISOString(),
          metadata: {
            bookingRequestId: id,
            previousStatus,
            newStatus: status,
            externalRefundStatus: status,
            idempotent: transition.idempotent,
          },
        },
      });

      return { ok: true };
    });

    if ("code" in transitionResult) {
      ctx.status = transitionResult.code === "booking_request_not_found" ? 404 : 409;
      ctx.body = { ok: false, code: transitionResult.code };
      return;
    }

    ctx.set("cache-control", "no-store");
    ctx.status = 200;
    ctx.body = {
      ok: true,
      previous_status: previousStatus,
      new_status: status,
      idempotent: transitionIdempotent,
      booking_request: {
        id: row.id,
        status: row.status || null,
        external_refund_status: row.external_refund_status || "none",
        external_refund_marked_at: row.external_refund_marked_at || null,
        external_refund_completed_at: row.external_refund_completed_at || null,
      },
    };
  },
};
