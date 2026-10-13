import { randomUUID } from "crypto";
import type { Room, CreateRoomInput, UpdateRoomInput } from "@/types/room";

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
  };
}

export function createRoomRecord(input: CreateRoomInput): Room {
  const room: Room = {
    ...defaultRoom(randomUUID()),
    language: input.language || "javascript",
    theme: input.theme || "vs-dark",
  };
  rooms.set(room.id, room);
  return room;
}

export function getRoomRecord(id: string): Room {
  const existing = rooms.get(id);
  if (existing) return existing;
  // Preserve "join with any link" behavior: materialize defaults on demand.
  const room = defaultRoom(id);
  rooms.set(id, room);
  return room;
}

export function updateRoomRecord(id: string, updates: UpdateRoomInput): Room {
  const room: Room = { ...getRoomRecord(id) };
  if (updates.language !== undefined) room.language = updates.language;
  if (updates.theme !== undefined) room.theme = updates.theme;
  if (updates.is_read_only !== undefined) room.is_read_only = updates.is_read_only;
  rooms.set(id, room);
  return room;
}

export function deleteRoomRecord(id: string): void {
  rooms.delete(id);
}

export function listRoomRecords(limit = 10): Room[] {
  return [...rooms.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 10);
}
