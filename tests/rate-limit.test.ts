import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, clientKey, __resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => __resetRateLimits());

describe("checkRateLimit", () => {
  it("allows requests up to the limit", () => {
    const opts = { limit: 3, windowMs: 1000, now: 0 };
    expect(checkRateLimit("ip", opts).ok).toBe(true);
    expect(checkRateLimit("ip", opts).ok).toBe(true);
    const third = checkRateLimit("ip", opts);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("blocks once the limit is exceeded, with a retry hint", () => {
    const opts = { limit: 2, windowMs: 1000, now: 0 };
    checkRateLimit("ip", opts);
    checkRateLimit("ip", opts);
    const blocked = checkRateLimit("ip", opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterS).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    checkRateLimit("ip", { limit: 1, windowMs: 1000, now: 0 });
    expect(checkRateLimit("ip", { limit: 1, windowMs: 1000, now: 500 }).ok).toBe(false);
    expect(checkRateLimit("ip", { limit: 1, windowMs: 1000, now: 1000 }).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const opts = { limit: 1, windowMs: 1000, now: 0 };
    expect(checkRateLimit("a", opts).ok).toBe(true);
    expect(checkRateLimit("b", opts).ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first hop of x-forwarded-for", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(req)).toBe("1.2.3.4");
  });

  it("falls back to 'local' with no proxy headers", () => {
    expect(clientKey(new Request("http://x"))).toBe("local");
  });
});
