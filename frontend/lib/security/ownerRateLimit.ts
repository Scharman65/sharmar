export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

type Entry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Entry>();

export const RATE_LIMIT_SCOPE = "in_memory_per_nextjs_instance";

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

export function resetRateLimitsForTests(): void {
  buckets.clear();
}
