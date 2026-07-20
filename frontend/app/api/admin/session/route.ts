import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdminPassword,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  getAdminSession,
  sameOriginRequest,
  setAdminSessionCookie,
} from "@/lib/adminSession";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  const session = await getAdminSession();
  return json({
    ok: true,
    authenticated: Boolean(session),
    permissions: session?.permissions ?? [],
    expiresAt: session?.expiresAt ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (!sameOriginRequest(req)) {
    return json({ ok: false, code: "csrf_check_failed" }, 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, code: "invalid_json" }, 400);
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const session = authenticateAdminPassword(password);
  if (!session) {
    return json({ ok: false, code: "invalid_admin_password" }, 401);
  }

  const cookie = createAdminSessionCookie(session.permissions);
  if (!cookie) {
    return json({ ok: false, code: "admin_session_unavailable" }, 503);
  }

  const response = json({
    ok: true,
    authenticated: true,
    permissions: session.permissions,
    expiresAt: session.expiresAt,
  });
  setAdminSessionCookie(response, cookie);
  return response;
}

export async function DELETE(req: NextRequest) {
  if (!sameOriginRequest(req)) {
    return json({ ok: false, code: "csrf_check_failed" }, 403);
  }

  const response = json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
