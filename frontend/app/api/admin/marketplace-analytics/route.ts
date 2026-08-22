import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionStatus } from "@/lib/adminSession";

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

function validPeriod(value: string | null): "7" | "30" | "90" | "all" | null {
  if (value === "7" || value === "30" || value === "90" || value === "all") return value;
  return null;
}

export async function GET(req: NextRequest) {
  const sessionStatus = await getAdminSessionStatus();
  if (!sessionStatus.authenticated) {
    return json({ ok: false, code: sessionStatus.code }, 401);
  }

  if (!sessionStatus.session.permissions.includes("dashboard")) {
    return json({ ok: false, code: "missing_dashboard_permission" }, 403);
  }

  const period = validPeriod(req.nextUrl.searchParams.get("period") || "30");
  if (!period) {
    return json({ ok: false, code: "invalid_period" }, 400);
  }

  const adminToken = getCmsAdminToken();
  if (!adminToken) {
    return json({ ok: false, code: "cms_admin_summary_token_missing" }, 500);
  }

  const url = new URL(`${getStrapiBase()}/api/admin-dashboard/marketplace-analytics`);
  url.searchParams.set("period", period);
  url.searchParams.set("recentLimit", "100");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-admin-token": adminToken,
      },
      cache: "no-store",
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    return NextResponse.json(
      body && typeof body === "object" ? body : { ok: false, code: "cms_marketplace_analytics_invalid" },
      {
        status: response.status,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch {
    return json({ ok: false, code: "cms_marketplace_analytics_unavailable" }, 502);
  }
}
