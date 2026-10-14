import { getRoomRecord, getRoomRecordSecure, updateRoomRecord, deleteRoomRecord, verifyOwnerToken } from "@/lib/rooms/store";
import { withSecurityHeaders } from "@/lib/security/headers";
import { executeRateLimiter } from "@/lib/security/rate-limit";
import type { UpdateRoomInput } from "@/types/room";

/** Validate a UUID room ID — prevents path traversal / injection. */
function isValidRoomId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Sanitize language — only allow known values. */
function sanitizeLanguage(lang: unknown): string | undefined {
  if (lang === undefined) return undefined;
  const valid = ["javascript", "typescript", "jsx", "react", "web", "html", "css", "python", "go", "rust", "c", "cpp", "java", "ruby", "php"];
  if (typeof lang === "string" && valid.includes(lang)) return lang;
  return undefined;
}

/** Extract client IP from request. */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "api-client";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // SECURITY: Validate room ID format
  if (!isValidRoomId(id)) {
    return withSecurityHeaders(
      Response.json({ error: "Invalid room ID format" }, { status: 400 })
    );
  }
  // ?create=0 is a check-only mode: return 404 for unknown rooms instead
  // of materializing a new public room. Join flows use this to detect
  // truncated/wrong links — without it, a typo'd private-room ID would
  // silently land the candidate in a brand-new EMPTY public room with no
  // password prompt (looks like a password bypass, but it's the wrong room).
  const url = new URL(_request.url);
  if (url.searchParams.get("create") === "0" && !getRoomRecordSecure(id)) {
    return withSecurityHeaders(
      Response.json({ error: "Room not found. Check the link." }, { status: 404 })
    );
  }
  return withSecurityHeaders(Response.json(getRoomRecord(id)));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // SECURITY: Validate room ID format
  if (!isValidRoomId(id)) {
    return withSecurityHeaders(
      Response.json({ error: "Invalid room ID format" }, { status: 400 })
    );
  }

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

  try {
    const body = await request.json();

    // SECURITY: Split permissions — collaborators may change language and
    // theme (candidates can switch languages), but only the room owner
    // (interviewer) may flip read-only mode. Direct API calls that include
    // is_read_only without the owner token get 403. Rooms without an owner
    // token keep legacy open behavior.
    if (body.is_read_only !== undefined) {
      const ownerToken = request.headers.get("x-room-owner-token");
      if (!verifyOwnerToken(id, ownerToken)) {
        return withSecurityHeaders(
          Response.json({ error: "Only the interviewer can change read-only mode" }, { status: 403 })
        );
      }
    }

    const updates: UpdateRoomInput = {};
    // SECURITY: Only allow known fields; sanitize language value
    const lang = sanitizeLanguage(body.language);
    if (lang !== undefined) updates.language = lang;
    if (body.theme !== undefined) {
      const validThemes = ["vs-dark", "light", "hc-black", "github-dark", "one-dark"];
      if (typeof body.theme === "string" && validThemes.includes(body.theme)) {
        updates.theme = body.theme;
      }
    }
    if (body.is_read_only !== undefined) updates.is_read_only = Boolean(body.is_read_only);

    return withSecurityHeaders(
      Response.json(updateRoomRecord(id, updates)),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // SECURITY: Validate room ID format before deletion
  if (!isValidRoomId(id)) {
    return withSecurityHeaders(
      Response.json({ error: "Invalid room ID format" }, { status: 400 })
    );
  }
  // SECURITY: Only the owner may delete the room (same rule as PATCH).
  if (!verifyOwnerToken(id, _request.headers.get("x-room-owner-token"))) {
    return withSecurityHeaders(
      Response.json({ error: "Only the interviewer can delete this room" }, { status: 403 })
    );
  }
  deleteRoomRecord(id);
  return withSecurityHeaders(Response.json({ success: true }));
}
