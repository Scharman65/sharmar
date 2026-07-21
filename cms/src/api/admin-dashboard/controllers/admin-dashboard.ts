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
        id,
        provider,
        status,
        booking_request_id,
        amount_cents,
        currency,
        provider_intent_id,
        metadata ->> 'provider_status' as provider_status,
        metadata ->> 'last_event_type' as last_event_type,
        metadata ->> 'webhook_received_at' as webhook_received_at,
        created_at,
        updated_at
      from public.payments
      order by created_at desc nulls last, id desc
      limit ?
      `,
      [ROW_LIMIT]
    );

    return rawRows(result).map((row) => {
      const amountCents = nullableNumber(row.amount_cents);

      return {
        id: nullableNumber(row.id),
        provider: nullableString(row.provider),
        status: nullableString(row.status),
        booking_request_id: nullableNumber(row.booking_request_id),
        amount: amountCents == null ? null : amountCents / 100,
        currency: nullableString(row.currency),
        provider_payment_id: nullableString(row.provider_intent_id),
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
        u.email,
        u.username,
        u.confirmed,
        u.blocked,
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
        u.email as owner_email,
        u.username as owner_username,
        nullif(trim(concat(coalesce(op.first_name, ''), ' ', coalesce(op.last_name, ''))), '') as owner_display_name,
        op.phone as owner_phone,
        u.confirmed as owner_confirmed,
        u.blocked as owner_blocked
      from public.boats b
      left join public.up_users u
        on u.id = coalesce(b.owner_user_id, b.created_by_id)
      left join public.owner_profiles_user_lnk opul
        on opul.user_id = u.id
      left join public.owner_profiles op
        on op.id = opul.owner_profile_id
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
      owner_confirmed: nullableBoolean(row.owner_confirmed),
      owner_blocked: nullableBoolean(row.owner_blocked),
    }));
  } catch (error) {
    warnings.push("Could not load boat owner links.");
    return [];
  }
}

export default {
  async summary(ctx) {
    const expectedTokens = adminTokens();

    if (!expectedTokens.length) {
      ctx.status = 503;
      ctx.body = {
        ok: false,
        error: "admin_token_missing",
      };
      return;
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
      return;
    }

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
      warnings,
    };
  },
};
