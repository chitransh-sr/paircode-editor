import { createRoomRecord, listRoomRecords } from "@/lib/rooms/store";
import { withSecurityHeaders } from "@/lib/security/headers";
import { executeRateLimiter } from "@/lib/security/rate-limit";

/** Validate language value against supported set. */
function sanitizeLanguage(lang: unknown): string {
  const valid = ["javascript", "typescript", "jsx", "react", "web", "html", "css", "python", "go", "rust", "c", "cpp", "java", "ruby", "php"];
  if (typeof lang === "string" && valid.includes(lang)) return lang;
  return "javascript";
}

/** Validate theme value against supported set. */
function sanitizeTheme(theme: unknown): string {
  const valid = ["vs-dark", "light", "hc-black", "github-dark", "one-dark"];
  if (typeof theme === "string" && valid.includes(theme)) return theme;
  return "vs-dark";
}

/** Extract client IP from request. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "api-client";
}

export async function POST(request: Request) {
  try {
    // Rate limit
    const clientIp = getClientIp(request);
    const rateCheck = executeRateLimiter.check(clientIp);
    if (!rateCheck.allowed) {
      return withSecurityHeaders(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((rateCheck.resetTime - Date.now()) / 1000)),
          },
        })
      );
    }

    const body = await request.json().catch(() => ({}));
    // SECURITY: Sanitize all inputs — only allow known-safe values
    const language = sanitizeLanguage(body.language);
    const theme = sanitizeTheme(body.theme);
    // SECURITY: Validate password length
    const password = typeof body.password === "string" ? body.password : undefined;
    const is_private = Boolean(body.is_private);

    if (is_private && (!password || password.length < 4)) {
      return withSecurityHeaders(
        new Response(
          JSON.stringify({
            success: false,
            error: "Password must be at least 4 characters for private rooms",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        ),
        { "X-RateLimit-Limit": "20", "X-RateLimit-Remaining": String(rateCheck.remaining) }
      );
    }

    return withSecurityHeaders(
      Response.json(
        (() => {
          const { room, owner_token } = createRoomRecord({ language, theme, password, is_private });
          // owner_token is returned once at creation; the creator stores it
          // and sends it back as `x-room-owner-token` on PATCH.
          return { ...room, owner_token };
        })(),
        { status: 201 }
      ),
      {
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    return withSecurityHeaders(
      Response.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  // SECURITY: Clamp limit to prevent excessive data fetching
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10", 10), 100);

  return withSecurityHeaders(Response.json(listRoomRecords(isNaN(limit) ? 10 : limit)));
}
