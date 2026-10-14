import { useState, useEffect, useCallback } from "react";
import type { Room, CreateRoomInput, UpdateRoomInput } from "@/types/room";

// Default room used when the API is unreachable
const DEFAULT_ROOM = (id: string = "default"): Room => ({
  id,
  language: "javascript",
  theme: "vs-dark",
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_by: null,
  is_read_only: false,
  is_private: false,
});

export function useRoom(roomId?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(!!roomId);
  const [error, setError] = useState<Error | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    if (!roomId) {
      setError(new Error("Room ID not provided"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setRoom(data);
      } else {
        // Fall back to a default room for unknown IDs / errors
        setRoom(DEFAULT_ROOM(roomId));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("Failed to fetch room, using default:", message);
      setRoom(DEFAULT_ROOM(roomId));
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const updateRoom = useCallback(
    async (updates: UpdateRoomInput) => {
      if (!roomId) return;
      setUpdateError(null);

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const ownerToken = getRoomOwnerToken(roomId);
        if (ownerToken) headers["x-room-owner-token"] = ownerToken;
        const response = await fetch(`/api/rooms/${roomId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updates),
        });

        if (response.status === 403) {
          // Candidate (or anyone without the owner token) tried to change
          // settings — do NOT apply locally, surface the denial instead.
          setUpdateError("Only the interviewer can change room settings");
          return room ?? DEFAULT_ROOM(roomId);
        }

        if (response.ok) {
          const data = await response.json();
          setRoom(data);
          return data;
        }
      } catch (err) {
        console.warn("Failed to update room, using local:", err);
      }

      // Update locally as fallback
      setRoom((prev) => (prev ? { ...prev, ...updates } : prev));
      return { ...(room || DEFAULT_ROOM(roomId)), ...updates } as Room;
    },
    [roomId, room]
  );

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  return { room, isLoading, error, updateError, refetch: fetchRoom, updateRoom };
}

/** sessionStorage key holding this browser's owner token for a room. */
function ownerKey(roomId: string): string {
  return `room-owner-${roomId}`;
}

/** sessionStorage key holding the room password for the creating browser. */
function passwordKey(roomId: string): string {
  return `room-password-${roomId}`;
}

/** Read this browser's stored room password (creator only, session-only). */
export function getRoomPassword(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(passwordKey(roomId));
  } catch {
    return null;
  }
}

/** Read this browser's owner token for a room (SSR-safe). */
export function getRoomOwnerToken(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(ownerKey(roomId));
  } catch {
    return null;
  }
}

/** Whether this browser created (owns) the room. */
export function isRoomOwner(roomId: string): boolean {
  return !!getRoomOwnerToken(roomId);
}

export async function verifyRoomPassword(
  roomId: string,
  password: string
): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

export async function createRoom(input?: CreateRoomInput): Promise<Room> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {}),
  });

  if (!response.ok) {
    // Generate local fallback (browser-safe: no node builtins)
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    // Local-only room: this browser is the owner.
    try {
      sessionStorage.setItem(ownerKey(id), "local-owner");
      if (input?.password) {
        sessionStorage.setItem(passwordKey(id), input.password);
      }
    } catch {
      // sessionStorage unavailable — ownership checks fall back gracefully
    }
    return {
      id,
      language: input?.language || "javascript",
      theme: input?.theme || "vs-dark",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: null,
      is_read_only: false,
      is_private: input?.is_private || false,
    };
  }

  const data = await response.json();
  // The server returns owner_token once at creation — persist it as this
  // browser's proof of ownership, then strip it from the room object.
  const { owner_token, ...room } = data as Room & { owner_token?: string };
  if (owner_token) {
    try {
      sessionStorage.setItem(ownerKey(room.id), owner_token);
    } catch {
      // sessionStorage unavailable — ownership checks fall back gracefully
    }
  }
  // Keep the room password in this session so the interviewer can view it
  // later via the header eye icon. Session-only: cleared on browser close.
  if (input?.password) {
    try {
      sessionStorage.setItem(passwordKey(room.id), input.password);
    } catch {
      // sessionStorage unavailable — password viewer falls back gracefully
    }
  }
  return room as Room;
}
