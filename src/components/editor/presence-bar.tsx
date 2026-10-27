'use client';

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
    <div className="inline-flex max-w-full items-center gap-2.5 border border-foreground/10 bg-card/85 backdrop-blur px-3 py-1 shadow-sm">
      <span className="relative w-2 h-2 rounded-full bg-accent ping-ring shrink-0" />
      <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap tracking-wide">
        {allUsers.length} online
      </span>

      <div className="flex -space-x-1.5">
        {allUsers.slice(0, 6).map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-black"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getUserInitials(user.name)}
          </div>
        ))}

        {allUsers.length > 6 && (
          <div className="h-6 px-1.5 rounded-full ring-2 ring-card bg-foreground/[0.08] flex items-center justify-center text-[10px] font-mono text-muted-foreground">
            +{allUsers.length - 6}
          </div>
        )}
      </div>

      {allUsers.slice(0, 3).map((user) => (
        <span key={`name-${user.id}`} className="hidden xl:inline font-mono text-[11px] text-muted-foreground truncate max-w-24">
          {user.name}
        </span>
      ))}
    </div>
  );
}
