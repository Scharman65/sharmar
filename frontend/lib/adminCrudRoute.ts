import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession, sameOriginRequest } from "@/lib/adminSession";
import {
  type AdminCrudAction,
  type AdminCrudEntity,
  validateAdminCrudPayload,
} from "@/lib/adminCrudContracts";

const MAX_BODY_BYTES = 48 * 1024;

type RouteParams = Promise<Record<string, string>> | Record<string, string>;

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) throw new Error("STRAPI_URL is not configured");
  return configured.replace(/\/+$/, "");
}

function internalAdminToken(): string {
  return String(
    process.env.ADMIN_MODERATION_INTERNAL_TOKEN ||
      process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN ||
      ""
  ).trim();
}

function json(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function bodyTooLarge(req: NextRequest): boolean {
  const declaredLength = Number(req.headers.get("content-length") || NaN);
  return Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES;
}

async function readBody(req: NextRequest): Promise<unknown> {
  if (bodyTooLarge(req)) return { __tooLarge: true };
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function forwardToCms(path: string, init: RequestInit = {}) {
  const token = internalAdminToken();
  if (!token) return json({ ok: false, code: "admin_crud_internal_token_missing" }, 503);

  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("x-admin-crud-token", token);

  try {
    const response = await fetch(`${getStrapiBase()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    const text = await response.text();
    let responseJson: unknown = null;
    try {
      responseJson = text ? JSON.parse(text) : null;
    } catch {
      responseJson = null;
    }
    return NextResponse.json(
      responseJson && typeof responseJson === "object"
        ? responseJson
        : { ok: false, code: "admin_crud_invalid_response" },
      { status: response.status, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return json({ ok: false, code: "admin_crud_cms_unreachable" }, 502);
  }
}

function actor() {
  return String(process.env.ADMIN_MODERATION_ACTOR || "").trim().slice(0, 160) || "sharmar-admin";
}

export async function handleAdminCrudList(req: NextRequest, entity: AdminCrudEntity) {
  const session = await requireAdminSession(req.method === "GET" ? "dashboard" : "moderation");
  if (!session) return json({ ok: false, code: "unauthorized" }, 401);

  if (req.method === "GET") {
    const search = req.nextUrl.search ? req.nextUrl.search : "";
    return forwardToCms(`/api/admin-crud/${entity}${search}`, { method: "GET" });
  }

  if (!sameOriginRequest(req)) return json({ ok: false, code: "csrf_check_failed" }, 403);
  if (process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true") {
    return json({ ok: false, code: "write_not_enabled" }, 403);
  }

  const body = await readBody(req);
  if (body && typeof body === "object" && "__tooLarge" in body) {
    return json({ ok: false, code: "payload_too_large" }, 413);
  }

  const parsed = validateAdminCrudPayload(entity, body as Record<string, unknown>, "create");
  if (!parsed.ok) return json({ ok: false, code: parsed.code, fields: parsed.fields }, 400);

  return forwardToCms(`/api/admin-crud/${entity}`, {
    method: "POST",
    body: JSON.stringify({ ...parsed, actor: actor() }),
  });
}

export async function handleAdminCrudItem(
  req: NextRequest,
  entity: AdminCrudEntity,
  id: string,
  fallbackAction: AdminCrudAction
) {
  const session = await requireAdminSession(req.method === "GET" ? "dashboard" : "moderation");
  if (!session) return json({ ok: false, code: "unauthorized" }, 401);

  const encodedId = encodeURIComponent(id);
  if (req.method === "GET") {
    return forwardToCms(`/api/admin-crud/${entity}/${encodedId}`, { method: "GET" });
  }

  if (!sameOriginRequest(req)) return json({ ok: false, code: "csrf_check_failed" }, 403);
  if (process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true") {
    return json({ ok: false, code: "write_not_enabled" }, 403);
  }

  const body = await readBody(req);
  if (body && typeof body === "object" && "__tooLarge" in body) {
    return json({ ok: false, code: "payload_too_large" }, 413);
  }

  const parsed = validateAdminCrudPayload(entity, body as Record<string, unknown>, fallbackAction);
  if (!parsed.ok) {
    return json(
      {
        ok: false,
        code: parsed.code,
        fields: parsed.fields,
        expectedPhrase: parsed.expectedPhrase,
      },
      parsed.code === "confirmation_phrase_required" ? 409 : 400
    );
  }

  return forwardToCms(`/api/admin-crud/${entity}/${encodedId}`, {
    method: req.method,
    body: JSON.stringify({ ...parsed, actor: actor() }),
  });
}

export async function handleAdminCrudDependencies(
  _req: NextRequest,
  entity: AdminCrudEntity,
  id: string
) {
  const session = await requireAdminSession("dashboard");
  if (!session) return json({ ok: false, code: "unauthorized" }, 401);

  return forwardToCms(`/api/admin-crud/${entity}/${encodeURIComponent(id)}/dependencies`, {
    method: "GET",
  });
}

export async function routeParams(params: RouteParams): Promise<Record<string, string>> {
  return params instanceof Promise ? params : Promise.resolve(params);
}
