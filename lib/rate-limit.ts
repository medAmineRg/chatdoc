/**
 * In-memory fixed-window rate limiter.
 *
 * Keyed by client identifier (IP). Each key gets a counter that resets every
 * `windowMs`. This is per-instance state: on a multi-instance serverless deploy
 * each instance limits independently, so it is a best-effort guard rather than a
 * global quota — adequate for this test; a real deploy would back it with Redis
 * (e.g. Upstash). `now` is injectable so the behaviour is unit-testable.
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterS: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Default budgets per endpoint (requests per minute, per client). */
export const UPLOAD_LIMIT: RateLimitOptions = { limit: 10, windowMs: 60_000 };
export const CHAT_LIMIT: RateLimitOptions = { limit: 30, windowMs: 60_000 };

export function checkRateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: RateLimitOptions,
): RateLimitResult {
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterS: 0 };
  }

  if (bucket.count < limit) {
    bucket.count += 1;
    return { ok: true, remaining: limit - bucket.count, retryAfterS: 0 };
  }

  return { ok: false, remaining: 0, retryAfterS: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

/** Best-effort client identifier from proxy headers, falling back to "local". */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return req.headers.get("x-real-ip") ?? "local";
}

/** Test-only: clear all counters between cases. */
export function __resetRateLimits(): void {
  buckets.clear();
}
