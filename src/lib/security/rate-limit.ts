/**
 * Simple in-memory rate limiter for API routes.
 *
 * Uses a sliding-window counter keyed by client identifier.
 * Intended for single-instance deployments; for multi-instance
 * setups, replace with a shared store (Redis, etc.).
 *
 * @example
 * const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });
 * const result = limiter.check(clientIp);
 * if (!result.allowed) { /* 429 Too Many Requests *\/ }
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  max: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number; // timestamp when the window resets
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

/** Create a rate limiter instance. */
export function createRateLimiter(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries (every 5 minutes)
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now >= entry.resetTime) {
          store.delete(key);
        }
      }
    }, 300_000);
  }

  return {
    /**
     * Check if the given client ID is within limits.
     * @returns {allowed, remaining, resetTime}
     */
    check(clientId: string): RateLimitResult {
      const now = Date.now();
      const existing = store.get(clientId);

      if (!existing || now >= existing.resetTime) {
        // New window
        const entry: RateLimitEntry = {
          count: 1,
          resetTime: now + options.windowMs,
        };
        store.set(clientId, entry);
        return {
          allowed: true,
          remaining: options.max - 1,
          resetTime: entry.resetTime,
        };
      }

      // Within existing window
      if (existing.count >= options.max) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: existing.resetTime,
        };
      }

      existing.count++;
      return {
        allowed: true,
        remaining: options.max - existing.count,
        resetTime: existing.resetTime,
      };
    },

    /** Get rate limit response headers for the given client. */
    getHeaders(clientId: string) {
      const result = this.check(clientId);
      return {
        "X-RateLimit-Limit": String(options.max),
        "X-RateLimit-Remaining": String(Math.max(0, result.remaining)),
        "X-RateLimit-Reset": String(Math.ceil(result.resetTime / 1000)),
        ...(result.allowed
          ? {}
          : {
              "Retry-After": String(
                Math.ceil((result.resetTime - Date.now()) / 1000)
              ),
            }),
      };
    },
  };
}

/** Shared rate limiter for the code execution API. */
export const executeRateLimiter = createRateLimiter({
  windowMs: 60_000, // 1 minute
  max: 20, // 20 requests per minute per IP
});