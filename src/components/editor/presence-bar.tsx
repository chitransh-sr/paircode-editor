'use client';

import type { UserPresence } from "@/types/presence";
import { getUserInitials } from "@/lib/presence/colors";
import { cn } from "@/lib/utils/cn";

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
    <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-border bg-card/80 py-1 pl-3 pr-2 shadow-sm backdrop-blur">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {allUsers.length} online
      </span>

      <div className="flex -space-x-1.5">
        {allUsers.slice(0, 6).map((user) => (
          <div
            key={user.id}
            className="w-6 h-6 rounded-full ring-2 ring-card flex items-center justify-center text-[10px] font-bold text-accent-foreground"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getUserInitials(user.name)}
          </div>
        ))}

        {allUsers.length > 6 && (
          <div className="h-6 px-1.5 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{allUsers.length - 6}
          </div>
        )}
      </div>

      {allUsers.slice(0, 3).map((user) => (
        <span key={`name-${user.id}`} className="hidden xl:inline text-xs text-muted-foreground truncate max-w-24">
          {user.name}
        </span>
      ))}
    </div>
  );
}
