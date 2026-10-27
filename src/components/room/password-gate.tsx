'use client';

import { useState, useEffect } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyRoomPassword, isRoomOwner } from "@/hooks/use-room";
import type { Room } from "@/types/room";
import { Corners } from "@/components/landing-chrome";

interface PasswordGateProps {
  room: Room;
  onUnlocked?: () => void;
}

/**
 * PasswordGate — shown when joining a private (password-protected) room.
 * Verifies the password via the API and stores it in sessionStorage for
 * the duration of the session. The stored password is never persisted to
 * localStorage (cleared on browser close).
 */
export function PasswordGate({ room, onUnlocked }: PasswordGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Check if we already have a verified password in sessionStorage
  const isPasswordVerified = (): boolean => {
    return sessionStorage.getItem(`room-verified-${room.id}`) === "true";
  };

  useEffect(() => {
    const handler = () => {
      if (isPasswordVerified()) {
        onUnlocked?.();
      }
    };
    window.addEventListener("room-unlocked", handler);
    // Check immediately in case it was set during a previous render
    handler();
    return () => window.removeEventListener("room-unlocked", handler);
  }, [onUnlocked, isPasswordVerified]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setVerifying(true);
    setError("");

    try {
      const isValid = await verifyRoomPassword(room.id, password);
      if (!isValid) {
        setError("Incorrect password. Please try again.");
        return;
      }

      // Store verification in sessionStorage (not localStorage — session-only)
      sessionStorage.setItem(`room-verified-${room.id}`, "true");
      onUnlocked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify password");
    } finally {
      setVerifying(false);
    }
  };

  // If already verified, don't render the gate
  if (isPasswordVerified()) {
    return null;
  }

  return (
    <div className="min-h-screen supports-[min-height:100dvh]:min-h-dvh bg-background flex items-center justify-center px-4 py-8 overflow-x-clip">
      {/* Ambient accent glow (landing backdrop language) */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[640px] h-[360px] bg-accent/10 blur-[130px] rounded-full animate-drift" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="group relative bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-6 sm:p-8">
          <Corners />
          <div className="relative z-10">
            {/* Header */}
            <div className="w-12 h-12 bg-accent/15 border border-accent/20 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-accent" />
            </div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-accent mb-3">{`// PRIVATE ROOM`}</p>
            <h1 className="text-2xl font-medium tracking-tight text-foreground mb-2">
              Private Interview Room
            </h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              This room is password protected. Enter the password shared by your
              interviewer to join.
            </p>
          </div>

          {/* Room Info */}
          <div className="relative z-10 border border-foreground/10 bg-foreground/[0.03] p-3 mt-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-accent">
                  Room ID
                </p>
                <p className="text-sm font-mono text-foreground truncate mt-0.5">
                  {room.id}
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-foreground/[0.06] hover:text-foreground transition-colors text-muted-foreground shrink-0"
                title="Back to home"
                aria-label="Back to home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full bg-foreground/[0.04] border border-foreground/10 rounded-[4px] px-3 py-2.5 text-sm text-foreground font-mono placeholder:font-sans placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors"
                autoComplete="current-password"
                minLength={4}
                maxLength={128}
                required
              />
            </div>

            {error && (
              <p className="text-[13px] text-destructive font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="w-full px-4 py-2.5 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-[0_0_24px_-8px_rgba(34,197,94,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {verifying ? "Verifying..." : "Unlock Room"}
            </button>
          </form>

          {/* Hint */}
          <div className="relative z-10 mt-6 p-3 border border-accent/20 bg-accent/5">
            <p className="text-xs text-muted-foreground text-center">
              If you do not have the password, ask the interviewer to share it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Check if a room requires password and if the user has been verified. */
export function checkRoomAccess(roomId: string, room: Room | null): boolean {
  if (!room || !room.is_private) return true;
  // Owner (interviewer) always has access — they created the room and
  // hold the owner token in sessionStorage. Without this, the owner
  // would be stuck behind their own password gate (the verified flag
  // is never set for the creator, only the password is stored).
  if (isRoomOwner(roomId)) return true;
  return sessionStorage.getItem(`room-verified-${roomId}`) === "true";
}
