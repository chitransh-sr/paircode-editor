/**
 * Security headers applied to all API route responses.
 *
 * These complement the headers set in next.config.js and add API-specific
 * protections such as rate-limit info (when used) and nosniff on all
 * responses.
 */

/** Standard security headers for API endpoints. */
export const API_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
  "Cross-Origin-Opener-Policy": "same-origin",
  // API routes should not be framed
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=()",
};

/**
 * Apply security headers to a Next.js Response.
 * Returns a new Response with the security headers merged in.
 */
export function withSecurityHeaders(
  response: Response,
  extra: Record<string, string> = {}
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries({
    ...API_SECURITY_HEADERS,
    ...extra,
  })) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
