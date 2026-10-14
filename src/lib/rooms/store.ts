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

/** Strip password_hash before returning to client. */
export function stripPassword(room: Room): Room {
  const { password_hash, ...safe } = room;
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

export function createRoomRecord(input: CreateRoomInput): Room {
  const room: Room = {
    ...defaultRoom(randomUUID()),
    language: input.language || "javascript",
    theme: input.theme || "vs-dark",
    is_private: input.is_private || false,
  };
  if (room.is_private && input.password) {
    room.password_hash = hashPassword(input.password);
  }
  rooms.set(room.id, room);
  return stripPassword(room);
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
  const room: Room = { ...getRoomRecord(id) };
  if (updates.language !== undefined) room.language = updates.language;
  if (updates.theme !== undefined) room.theme = updates.theme;
  if (updates.is_read_only !== undefined) room.is_read_only = updates.is_read_only;
  rooms.set(id, room);
  return stripPassword(room);
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