import { getRoomRecordSecure, verifyPassword } from "@/lib/rooms/store";
import { withSecurityHeaders } from "@/lib/security/headers";

export const runtime = "nodejs";

/**
 * POST /api/rooms/:id/verify
 * Verify that a password is correct for a private room.
 * Returns { valid: true } or { valid: false, error: "..." }.
 * Never reveals whether the room exists — always returns 200.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { password?: unknown };

  try {
    body = await request.json();
  } catch {
    return withSecurityHeaders(
      Response.json({ valid: false, error: "Password is required" }, { status: 200 })
    );
  }

  const password = typeof body.password === "string" ? body.password : "";

  // SECURITY: Never reveal whether the room exists — always return 200 with
  // { valid: false } for incorrect passwords, regardless of room existence.
  const room = getRoomRecordSecure(id);

  // Check if room exists and is private
  const isPrivate = room?.is_private || false;
  const storedHash = room?.password_hash;

  // For non-private rooms or rooms without passwords, allow access
  if (!isPrivate || !storedHash) {
    return withSecurityHeaders(
      Response.json({ valid: true }, { status: 200 })
    );
  }

  // Verify password
  const isValid = verifyPassword(password, storedHash);

  return withSecurityHeaders(
    Response.json(
      isValid
        ? { valid: true }
        : { valid: false, error: "Incorrect password" },
      { status: 200 }
    )
  );
}