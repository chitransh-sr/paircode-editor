'use client';

import { useState } from "react";
import { User } from "lucide-react";
import { getUserColor } from "@/lib/presence/colors";
import { sanitizeStoredName } from "@/hooks/use-room";
import { cn } from "@/lib/utils/cn";

interface JoinModalProps {
  open: boolean;
  onJoin: (name: string, color: string) => void;
  defaultName?: string;
}

export function JoinModal({ open, onJoin, defaultName }: JoinModalProps) {
  const [name, setName] = useState(() => {
    if (typeof window !== "undefined") {
      return sanitizeStoredName(localStorage.getItem("editor-user-name") || defaultName || "");
    }
    return defaultName || "";
  });
  const [color, setColor] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("editor-user-color");
      if (stored) return stored;
    }
    return getUserColor(Math.floor(Math.random() * 12));
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No random fallback: the exact entered name is the identity.
    const finalName = name.trim();
    if (!finalName) return;
    onJoin(finalName, color);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-lg p-5 sm:p-6 w-full max-w-md border border-border shadow-xl max-h-[90dvh] overflow-y-auto">
          <div className="text-center mb-6">
            <User className="w-12 h-12 mx-auto mb-2 text-accent" />
            <h2 className="text-xl font-semibold text-foreground">Join Interview Room</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your name to join the interview
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sarah Chen"
                className="w-full bg-background border border-border rounded px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                maxLength={30}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cursor Color</label>
              <div className="flex gap-2 flex-wrap">
                {["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-transform",
                        color === c && "ring-2 ring-offset-2 ring-offset-background scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className={cn(
                "w-full px-4 py-2 rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                !name.trim()
                  ? "bg-muted cursor-not-allowed text-muted-foreground"
                  : "bg-accent hover:bg-accent/90 text-accent-foreground"
              )}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
