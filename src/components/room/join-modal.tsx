'use client';

import { useState } from "react";
import { createPortal } from "react-dom";
import { User } from "lucide-react";
import { getUserColor } from "@/lib/presence/colors";
import { sanitizeStoredName } from "@/hooks/use-room";
import { cn } from "@/lib/utils/cn";
import { Corners } from "@/components/landing-chrome";
import SpecularCta from "@/components/specular-button/SpecularCta";

interface JoinModalProps {
  open: boolean;
  onJoin: (name: string, color: string) => void;
  defaultName?: string;
}

/** Input classes shared with the dashboard modals (landing chrome). */
const inputClass =
  "w-full bg-foreground/[0.04] border border-foreground/10 rounded-[4px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors";

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

  // Portaled to body so `fixed` layers can never inherit a transformed
  // (containing-block) ancestor — same rule as the other room overlays.
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="group relative bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto modal-scroll">
          <Corners />
          <div className="relative z-10">
            {/* Square accent plate + mono eyebrow (landing card header) */}
            <div className="w-10 h-10 bg-accent/15 border border-accent/20 flex items-center justify-center mb-5">
              <User className="w-5 h-5 text-accent" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-accent mb-3">{`// JOIN ROOM`}</p>
            <h2 className="text-xl font-medium tracking-tight text-foreground">Join Interview Room</h2>
            <p className="text-[13px] text-muted-foreground mt-1 mb-6">
              Enter your name to join the interview
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sarah Chen"
                  className={inputClass}
                  maxLength={30}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Cursor Color</label>
                <div className="flex gap-2 flex-wrap">
                  {["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"].map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={`Cursor color ${c}`}
                        aria-pressed={color === c}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all duration-200 hover:scale-110",
                          color === c && "ring-2 ring-accent ring-offset-2 ring-offset-card scale-110"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    )
                  )}
                </div>
              </div>

              <SpecularCta type="submit" className="w-full h-10" disabled={!name.trim()}>
                <User className="w-4 h-4" />
                Join Room
              </SpecularCta>
            </form>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
