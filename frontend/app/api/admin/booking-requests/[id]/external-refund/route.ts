import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionStatus, sameOriginRequest } from "@/lib/adminSession";

type RouteCtx = {
  params: Promise<{
    id: string;
  }>;
};

type JsonObject = Record<string, unknown>;

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error("STRAPI_URL is not configured");
  }

  return configured.replace(/\/+$/, "");
}

function getCmsAdminToken(): string {
  return (process.env.PAYMENTS_ADMIN_TOKEN || process.env.SHARMAR_OWNER_ACTION_TOKEN || "").trim();
}

function json(body: JsonObject, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function externalRefundStatus(value: unknown): "none" | "required" | "completed" | null {
  if (value === "none" || value === "required" || value === "completed") return value;
  return null;
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const sessionStatus = await getAdminSessionStatus();
  if (!sessionStatus.authenticated) {
    return json({ ok: false, code: sessionStatus.code }, 401);
  }

  if (!sessionStatus.session.permissions.includes("moderation")) {
    return json({ ok: false, code: "missing_moderation_permission" }, 403);
  }

  if (!sameOriginRequest(req)) {
    return json({ ok: false, code: "csrf_check_failed" }, 403);
  }

  const { id } = await ctx.params;
  const bookingRequestId = Number(id);
  if (!Number.isInteger(bookingRequestId) || bookingRequestId <= 0) {
    return json({ ok: false, code: "invalid_booking_request_id" }, 400);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }

  if (!isRecord(body)) {
    return json({ ok: false, code: "invalid_payload" }, 400);
  }

  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== "external_refund_status") {
    return json({ ok: false, code: "invalid_external_refund_payload" }, 400);
  }

  const status = externalRefundStatus(body.external_refund_status);
  if (!status) {
    return json({ ok: false, code: "invalid_external_refund_status" }, 400);
  }

  const adminToken = getCmsAdminToken();
  if (!adminToken) {
    return json({ ok: false, code: "cms_admin_summary_token_missing" }, 500);
  }

  try {
    const response = await fetch(
      `${getStrapiBase()}/api/admin-dashboard/booking-requests/${encodeURIComponent(String(bookingRequestId))}/external-refund`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": `external-refund-marker:${bookingRequestId}:${status}:${randomUUID()}`,
          "x-admin-token": adminToken,
        },
        body: JSON.stringify({
          external_refund_status: status,
        }),
        cache: "no-store",
      }
    );

    const text = await response.text();
    let responseJson: unknown = null;
    try {
      responseJson = text ? JSON.parse(text) : null;
    } catch {
      responseJson = null;
    }

    return NextResponse.json(
      isRecord(responseJson)
        ? responseJson
        : { ok: false, code: "cms_external_refund_invalid_response" },
      {
        status: response.status,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch {
    return json({ ok: false, code: "cms_external_refund_unavailable" }, 502);
  }
}
