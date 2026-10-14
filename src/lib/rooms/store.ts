import { randomUUID, pbkdf2Sync, randomBytes } from "crypto";
import type { Room, CreateRoomInput, UpdateRoomInput } from "@/types/room";

/** Generate a PBKDF2 password hash (SHA-256, 100k iterations). */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/** Verify a password against a stored hash. */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hash] = storedHash.split(":");
  const testHash = pbkdf2Sync(password, salt, 100_000, 64, "sha256").toString("hex");
  return testHash === hash;
}

/** Strip server-only secrets before returning to client. */
export function stripPassword(room: Room): Room {
  const { password_hash, owner_token, ...safe } = room;
  void password_hash;
  void owner_token;
  return safe;
}

// In-memory room store (no external database required).
// Note: state lives in the server process — it resets on restart and isn't
// shared across multiple server instances. For a single self-hosted instance
// (dev server, `next start`, Docker) this is all the app needs.

const rooms = new Map<string, Room>();

export function defaultRoom(id: string): Room {
  return {
    id,
    language: "javascript",
    theme: "vs-dark",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    created_by: null,
    is_read_only: false,
    is_private: false,
  };
}

export function createRoomRecord(input: CreateRoomInput): { room: Room; owner_token: string } {
  const owner_token = randomUUID();
  const room: Room = {
    ...defaultRoom(randomUUID()),
    language: input.language || "javascript",
    theme: input.theme || "vs-dark",
    is_private: input.is_private || false,
    owner_token,
  };
  if (room.is_private && input.password) {
    room.password_hash = hashPassword(input.password);
  }
  rooms.set(room.id, room);
  return { room: stripPassword(room), owner_token };
}

/** Get a room record (without password_hash). */
export function getRoomRecord(id: string): Room {
  const existing = rooms.get(id);
  if (existing) return stripPassword(existing);
  // Preserve "join with any link" behavior: materialize defaults on demand.
  const room = defaultRoom(id);
  rooms.set(room.id, room);
  return stripPassword(room);
}

/** Get the internal room record (with password_hash) for verification. */
export function getRoomRecordSecure(id: string): Room | undefined {
  return rooms.get(id);
}

export function updateRoomRecord(id: string, updates: UpdateRoomInput): Room {
  // Base on the secure record so server-only secrets (password_hash,
  // owner_token) survive settings changes.
  const existing = rooms.get(id);
  const room: Room = { ...(existing ?? defaultRoom(id)) };
  if (updates.language !== undefined) room.language = updates.language;
  if (updates.theme !== undefined) room.theme = updates.theme;
  if (updates.is_read_only !== undefined) room.is_read_only = updates.is_read_only;
  rooms.set(room.id, room);
  return stripPassword(room);
}

/** Verify an owner token for a room. Rooms without an owner token
 * (legacy / auto-materialized open rooms) allow updates for compatibility. */
export function verifyOwnerToken(id: string, token: string | null): boolean {
  const existing = rooms.get(id);
  if (!existing || !existing.owner_token) return true;
  return !!token && token === existing.owner_token;
}

export function deleteRoomRecord(id: string): void {
  rooms.delete(id);
}

export function listRoomRecords(limit = 10): Room[] {
  return [...rooms.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 10)
    .map(stripPassword);
}