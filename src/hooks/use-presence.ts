'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import type { UserPresence } from "@/types/presence";
import { getUserColor } from "@/lib/presence/colors";

interface UsePresenceResult {
  users: UserPresence[];
  currentUser: UserPresence | null;
  updateCursor: (cursor: { line: number; ch: number }) => void;
  updateSelection: (
    anchor: { line: number; ch: number },
    head: { line: number; ch: number }
  ) => void;
}

export function usePresence(
  _roomId: string,
  userName: string
): UsePresenceResult {
  const [users, _setUsers] = useState<UserPresence[]>([]);
  const [currentUser, setCurrentUser] = useState<UserPresence | null>(null);

  const userColorRef = useRef<string>("");

  // Assign a consistent color for the current user
  useEffect(() => {
    const storedColor = localStorage.getItem("editor-user-color");
    if (storedColor) {
      userColorRef.current = storedColor;
    } else {
      const color = getUserColor(Math.floor(Math.random() * 12));
      userColorRef.current = color;
      localStorage.setItem("editor-user-color", color);
    }

    const user: UserPresence = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: userName || "Anonymous",
      color: userColorRef.current,
      lastActive: new Date().toISOString(),
    };

    setCurrentUser(user);
  }, [userName]);

  const updateCursor = useCallback((cursor: { line: number; ch: number }) => {
    // Cursor updates would be broadcast via websocket in a full implementation
    if (currentUser) {
      setCurrentUser((prev) =>
        prev
          ? { ...prev, cursor, lastActive: new Date().toISOString() }
          : prev
      );
    }
  }, [currentUser]);

  const updateSelection = useCallback(
    (
      anchor: { line: number; ch: number },
      head: { line: number; ch: number }
    ) => {
      if (currentUser) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                selection: { anchor, head },
                lastActive: new Date().toISOString(),
              }
            : prev
        );
      }
    },
    [currentUser]
  );

  return {
    users,
    currentUser,
    updateCursor,
    updateSelection,
  };
}
