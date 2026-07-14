import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type JsonObject = Record<string, unknown>;

const MAX_BODY_BYTES = 32 * 1024;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function publicAdminToken(): string {
  return String(
    process.env.ADMIN_MODERATION_TOKEN ||
      process.env.ADMIN_TRANSLATION_TOKEN ||
      ""
  ).trim();
}

function internalAdminToken(): string {
  return String(
    process.env.ADMIN_MODERATION_INTERNAL_TOKEN ||
      process.env.ADMIN_TRANSLATION_INTERNAL_TOKEN ||
      ""
  ).trim();
}

function tokensMatch(requestToken: string, configuredToken: string): boolean {
  const request = Buffer.from(requestToken);
  const configured = Buffer.from(configuredToken);

  return (
    request.length === configured.length &&
    timingSafeEqual(request, configured)
  );
}

function json(
  body: JsonObject,
  status: number
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const configuredToken = publicAdminToken();

  if (!configuredToken) {
    return json(
      {
        ok: false,
        code: "admin_moderation_token_missing",
      },
      503
    );
  }

  if (
    !tokensMatch(
      req.headers.get("x-admin-token") || "",
      configuredToken
    )
  ) {
    return json(
      {
        ok: false,
        code: "unauthorized",
      },
      401
    );
  }

  if (process.env.ADMIN_MODERATION_WRITE_ENABLED !== "true") {
    return json(
      {
        ok: false,
        code: "write_not_enabled",
      },
      403
    );
  }

  const internalToken = internalAdminToken();

  if (!internalToken) {
    return json(
      {
        ok: false,
        code: "admin_moderation_internal_token_missing",
      },
      503
    );
  }

  const declaredLength = Number(
    req.headers.get("content-length") || NaN
  );

  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_BODY_BYTES
  ) {
    return json(
      {
        ok: false,
        code: "payload_too_large",
      },
      413
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return json(
      {
        ok: false,
        code: "invalid_json",
      },
      400
    );
  }

  if (!isRecord(body)) {
    return json(
      {
        ok: false,
        code: "invalid_payload",
      },
      400
    );
  }

  const encoded = JSON.stringify({
    ...body,
    actor:
      String(process.env.ADMIN_MODERATION_ACTOR || "")
        .trim()
        .slice(0, 160) || "sharmar-admin",
  });

  if (Buffer.byteLength(encoded, "utf8") > MAX_BODY_BYTES) {
    return json(
      {
        ok: false,
        code: "payload_too_large",
      },
      413
    );
  }

  try {
    const response = await fetch(
      `${getStrapiBase()}/api/admin-moderation/action`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-moderation-token": internalToken,
        },
        body: encoded,
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
        : {
            ok: false,
            code: "strapi_moderation_invalid_response",
          },
      {
        status: response.status,
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch {
    return json(
      {
        ok: false,
        code: "strapi_moderation_failed",
      },
      502
    );
  }
}
