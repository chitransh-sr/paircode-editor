// Snapshot history is kept in memory only for the "Saved" acknowledgement —
// there is no snapshot browser UI, so persistence isn't needed.

import { withSecurityHeaders } from "@/lib/security/headers";

/** Security: Maximum snapshot code length to prevent abuse. */
const MAX_CODE_LENGTH = 100_000; // 100KB
/** Security: Maximum yjs_state length. */
const MAX_YJS_STATE_LENGTH = 500_000; // 500KB

/** Validate UUID room ID. */
function isValidRoomId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    || /^[a-zA-Z0-9_-]+$/.test(id);
}

export async function POST(
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

  try {
    const body = await request.json();
    const { code, yjs_state } = body;

    // SECURITY: Enforce maximum sizes to prevent abuse
    if (code !== undefined) {
      if (typeof code !== "string") {
        return withSecurityHeaders(
          Response.json({ error: "Code must be a string" }, { status: 400 })
        );
      }
      if (code.length > MAX_CODE_LENGTH) {
        return withSecurityHeaders(
          Response.json({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` }, { status: 413 })
        );
      }
    }

    if (yjs_state !== null && yjs_state !== undefined) {
      if (typeof yjs_state !== "string" && !(yjs_state instanceof ArrayBuffer)) {
        return withSecurityHeaders(
          Response.json({ error: "Invalid yjs_state format" }, { status: 400 })
        );
      }
      const stateLen = typeof yjs_state === "string" ? yjs_state.length : yjs_state.byteLength;
      if (stateLen > MAX_YJS_STATE_LENGTH) {
        return withSecurityHeaders(
          Response.json({ error: "yjs_state too large" }, { status: 413 })
        );
      }
    }

    const snapshot = {
      id: `snapshot-${Date.now()}`,
      room_id: id,
      yjs_state: yjs_state || null,
      code: code || "",
      created_at: new Date().toISOString(),
    };
    return withSecurityHeaders(
      Response.json(snapshot, { status: 201 })
    );
  } catch (error) {
    console.error("Server error:", error);
    return withSecurityHeaders(
      Response.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

export async function GET() {
  return withSecurityHeaders(Response.json([]));
}
