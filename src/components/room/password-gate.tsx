'use client';

import { useState, useEffect } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { verifyRoomPassword } from "@/hooks/use-room";
import type { Room } from "@/types/room";

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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-accent/5" />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-card rounded-xl p-8 border border-border shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Private Interview Room
            </h1>
            <p className="text-sm text-muted-foreground">
              This room is password protected. Enter the password shared by your
              interviewer to join.
            </p>
          </div>

          {/* Room Info */}
          <div className="bg-muted/30 rounded-lg p-3 mb-6 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Room ID
                </p>
                <p className="text-sm font-mono text-foreground truncate">
                  {room.id}
                </p>
              </div>
              <button
                onClick={() => router.push("/")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter room password"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                autoComplete="current-password"
                minLength={4}
                maxLength={128}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? "Verifying..." : "Unlock Room"}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-6 p-3 bg-accent/5 rounded-lg border border-accent/20">
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
  return sessionStorage.getItem(`room-verified-${roomId}`) === "true";
}