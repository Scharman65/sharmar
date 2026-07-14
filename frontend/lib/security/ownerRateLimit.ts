import crypto from "crypto";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  unavailable?: boolean;
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

function getServerToken(): string {
  return (process.env.STRAPI_WRITE_TOKEN || process.env.STRAPI_TOKEN || "").trim();
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
  const serverToken = getServerToken();
  if (!serverToken) return { allowed: false, retryAfter: 60, unavailable: true };

  const safeKey = normalizeRateLimitKey(key) || "unknown";
  const keyHash = crypto.createHash("sha256").update(safeKey).digest("hex");

  try {
    const res = await fetch(`${getStrapiBase()}/api/owner/rate-limit/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-owner-api-token": serverToken,
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
    if (!res.ok || !json || json.ok !== true) return { allowed: false, retryAfter: 60, unavailable: true };

    return {
      allowed: json.allowed === true,
      retryAfter: typeof json.retryAfter === "number" ? json.retryAfter : 0,
    };
  } catch {
    return { allowed: false, retryAfter: 60, unavailable: true };
  }
}

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
