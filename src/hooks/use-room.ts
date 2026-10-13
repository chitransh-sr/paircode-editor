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
});

export function useRoom(roomId?: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(!!roomId);
  const [error, setError] = useState<Error | null>(null);

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

      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

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

  return { room, isLoading, error, refetch: fetchRoom, updateRoom };
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
    return {
      id,
      language: input?.language || "javascript",
      theme: input?.theme || "vs-dark",
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      created_by: null,
      is_read_only: false,
    };
  }

  return response.json();
}
