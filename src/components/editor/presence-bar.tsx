'use client';

import { Circle } from "lucide-react";
import type { UserPresence } from "@/types/presence";
import { getUserInitials } from "@/lib/presence/colors";

interface PresenceBarProps {
  users?: UserPresence[];
  currentUser?: UserPresence | null;
}

export function PresenceBar({ users = [], currentUser }: PresenceBarProps) {
  const allUsers = [...users];

  // Add current user if not already in the list
  if (currentUser && !allUsers.find((u) => u.id === currentUser.id)) {
    allUsers.unshift(currentUser);
  }

  return (
    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 border border-border">
      <span className="text-xs text-muted-foreground">
        {allUsers.length} participant{allUsers.length !== 1 ? "s" : ""}
      </span>

      <div className="flex -space-x-2">
        {allUsers.slice(0, 6).map((user) => (
          <div
            key={user.id}
            className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold relative"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getUserInitials(user.name)}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-accent rounded-full border border-background" />
          </div>
        ))}

        {allUsers.length > 6 && (
          <div className="w-7 h-7 rounded-full border-2 border-gray-900 bg-muted flex items-center justify-center text-xs text-muted-foreground">
            +{allUsers.length - 6}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Circle className="w-2 h-2 fill-accent text-accent" />
        <span>Online</span>
      </div>
    </div>
  );
}
