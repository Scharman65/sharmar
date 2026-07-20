import crypto from "crypto";

import { OWNER_INTERNAL_HEADER, getOwnerInternalToken } from "../auth/ownerInternalAuth";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  unavailable?: boolean;
  reason?: "missing_configuration" | "internal_auth_rejected" | "cms_unavailable" | "rate_limited";
};

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export const RATE_LIMIT_SCOPE = "in_memory_per_nextjs_instance";
export const PERSISTENT_RATE_LIMIT_SCOPE = "cms_postgres_owner_rate_limits";

function getStrapiBase(): string {
  const configured = (
    process.env.STRAPI_URL ||
    process.env.NEXT_PUBLIC_STRAPI_URL ||
    ""
  ).trim();

  if (!configured) {
    throw new Error(
      "STRAPI_URL is not configured"
    );
  }

  return configured.replace(/\/+$/, "");
}

export function normalizeRateLimitKey(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const safeKey = normalizeRateLimitKey(key) || "unknown";
  const bucketKey = `${scope}:${safeKey}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return { allowed: true, retryAfter: 0 };
}

export async function checkPersistentRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const serverToken = getOwnerInternalToken();
  if (!serverToken) {
    return { allowed: false, retryAfter: 60, unavailable: true, reason: "missing_configuration" };
  }

  const safeKey = normalizeRateLimitKey(key) || "unknown";
  const keyHash = crypto.createHash("sha256").update(safeKey).digest("hex");

  try {
    const res = await fetch(`${getStrapiBase()}/api/owner/rate-limit/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [OWNER_INTERNAL_HEADER]: serverToken,
      },
      cache: "no-store",
      body: JSON.stringify({
        scope,
        key_hash: keyHash,
        limit,
        window_ms: windowMs,
      }),
    });
    const json = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.status === 401 || res.status === 403) {
      return { allowed: false, retryAfter: 60, unavailable: true, reason: "internal_auth_rejected" };
    }

    if (res.status === 429) {
      return {
        allowed: false,
        retryAfter: typeof json?.retryAfter === "number" ? json.retryAfter : 60,
        reason: "rate_limited",
      };
    }

    if (!res.ok || !json || json.ok !== true) {
      return { allowed: false, retryAfter: 60, unavailable: true, reason: "cms_unavailable" };
    }

    return {
      allowed: json.allowed === true,
      retryAfter: typeof json.retryAfter === "number" ? json.retryAfter : 0,
      reason: json.allowed === true ? undefined : "rate_limited",
    };
  } catch {
    return { allowed: false, retryAfter: 60, unavailable: true, reason: "cms_unavailable" };
  }
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
