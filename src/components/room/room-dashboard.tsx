'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Link2, Briefcase, GraduationCap, Loader2, Lock, ChevronDown } from "lucide-react";
import type { Room } from "@/types/room";
import { createRoom, verifyRoomPassword, sanitizeStoredName } from "@/hooks/use-room";
import { LANGUAGES, getLanguage } from "@/lib/execute/languages";
import { cn } from "@/lib/utils/cn";
import { Corners, chipClasses, sweepClasses, iconClasses, labelClasses, arrowClasses } from "@/components/landing-chrome";

interface RoomDashboardProps {
  onCreateRoom: (room: Room) => void;
  onJoinRoom: (roomId: string) => void;
}

/** Recent rooms are stored locally and may carry a display name. */
interface RecentRoom extends Room {
  name?: string;
}

/** Mono section eyebrow from the landing page (`// LABEL`).
    The slashes are rendered as an expression so ESLint's
    JSX comment rule doesn't mistake the text for a comment. */
function Eyebrow({ label, className = "" }: { label: string; className?: string }) {
  return <p className={`font-mono text-[11px] tracking-[0.2em] text-accent ${className}`}>{`// ${label}`}</p>;
}

/** Input field classes shared by every dashboard modal (landing chrome). */
const inputClass =
  "w-full bg-foreground/[0.04] border border-foreground/10 rounded-[4px] px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 transition-colors";

function readRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("recent-rooms");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function readStoredName(): string {
  if (typeof window === "undefined") return "";
  try {
    return sanitizeStoredName(localStorage.getItem("editor-user-name"));
  } catch {
    return "";
  }
}

/** Accept a raw room ID or a full room URL and return the ID. */
function parseRoomId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const urlMatch = value.match(/\/room\/([^\/?#]+)/);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  if (/^[0-9a-f-]{8,}$/i.test(value)) return value;
  return null;
}

/** Landing-style inline swipe-fill CTA (span — used inside card <button>s).
    Shares its chrome with the hero CTAs (chipClasses/sweep/icon/label/arrow)
    so both stay pixel-consistent and theme-legal. pointer-events-none routes
    hover to the parent role card — the landing-lobby behavior (hovering the
    card fills its CTA) — while the card's own onClick handles activation. */
function CardCta({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: "accent" | "white" }) {
  return (
    <span
      className={cn(
        chipClasses(variant),
        "mt-1 w-fit pointer-events-none"
      )}
    >
      <Corners />
      <span className={sweepClasses(variant, "sm")} />
      <span className="relative z-10 flex items-center gap-2.5">
        <span className={iconClasses(variant, "sm")}>
          {icon}
        </span>
        <span className={labelClasses(variant, "sm")}>
          {label}
        </span>
      </span>
      <span className={cn("relative z-10", arrowClasses(variant))}>→</span>
    </span>
  );
}

export function RoomDashboard({ onCreateRoom, onJoinRoom }: RoomDashboardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [isPrivateRoom, setIsPrivateRoom] = useState(true);
  const [joinInput, setJoinInput] = useState("");
  const [joinName, setJoinName] = useState(() => readStoredName());
  const [joinPassword, setJoinPassword] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [creating, setCreating] = useState(false);

  // Get recent rooms from localStorage (lazy init to avoid setState-in-effect)
  // IMPORTANT: initialize empty on first render so it matches the SSR output
  // (localStorage is unavailable during SSR, so readRecentRooms returns []).
  // Populate client-side after mount to avoid hydration mismatches.
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [suppressRecent, setSuppressRecent] = useState(true);

  const closeModals = () => {
    setShowCreateModal(false);
    setShowJoinModal(false);
    setRequiresPassword(false);
    setJoinPassword("");
    setError("");
    setJoinError("");
  };

  // Escape closes any open modal
  useEffect(() => {
    if (!showCreateModal && !showJoinModal && !requiresPassword) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModals();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreateModal, showJoinModal, requiresPassword]);

  // After first mount, read recent rooms from localStorage and enable
  // rendering. The first client render still shows the empty list (matching
  // SSR), then this effect triggers a safe state update to populate it.
  useEffect(() => {
    setRecentRooms(readRecentRooms());
    setSuppressRecent(false);
  }, []);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setError("Room name is required");
      return;
    }

    if (isPrivateRoom && roomPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setError("");
    setCreating(true);
    try {
      const room = await createRoom({
        language: selectedLanguage,
        is_private: isPrivateRoom,
        password: isPrivateRoom ? roomPassword : undefined,
      });

      // NOTE: we intentionally do NOT set room-verified-<id> here.
      // sessionStorage is shared across tabs — if we did, a candidate
      // opening a second tab in the same browser would inherit the
      // verified flag and bypass the password prompt.
      // The owner still bypasses the room-page PasswordGate via the
      // isRoomOwner() check in checkRoomAccess (owner token is in
      // sessionStorage and read-only).

      // Store in localStorage (with the display name), then update state.
      const entry: RecentRoom = { ...room, name: roomName.trim() };
      const stored = readRecentRooms().filter((r) => r.id !== room.id);
      const updatedRooms = [entry, ...stored].slice(0, 10);

      localStorage.setItem("recent-rooms", JSON.stringify(updatedRooms));
      setRecentRooms(updatedRooms);
      setRoomName("");
      setRoomPassword("");
      setShowCreateModal(false);

      // Enter the room immediately (interviewer expectation). The password
      // remains available inside the room via the eye icon next to the
      // room ID in the header, and the full link via the Share button —
      // so nothing needed for sharing is lost by skipping a modal here.
      onCreateRoom(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  /** Switch from the history list to the password step for one room. */
  const promptHistoryPassword = (roomId: string) => {
    setJoinInput(roomId);
    setJoinName(readStoredName());
    setJoinPassword("");
    setJoinError("");
    setShowJoinModal(false);
    setRequiresPassword(true);
  };

  const handleRecentJoin = async (entry: RecentRoom) => {
    // History Join must enforce the same password step as the join modal —
    // a plain link would skip verification for protected rooms.
    //
    // We check room-verified (not isRoomOwner) because sessionStorage is
    // shared across tabs — isRoomOwner would let a candidate on the same
    // browser as the owner bypass the gate. room-verified is only set after
    // explicit password entry, so a same-browser candidate still gets
    // prompted.
    const alreadyVerified =
      typeof window !== "undefined" &&
      sessionStorage.getItem(`room-verified-${entry.id}`) === "true";

    if (alreadyVerified) {
      onJoinRoom(entry.id);
      return;
    }
    // Server is the source of truth for privacy (localStorage entries can
    // be stale). Check-only mode (?create=0) never materializes rooms, so
    // a truncated/wrong ID returns 404 instead of silently creating a new
    // empty public room (which looked like a password bypass).
    try {
      const response = await fetch(`/api/rooms/${entry.id}?create=0`, {
        headers: { Accept: "application/json" },
      });
      if (response.status === 404) {
        // Stale entry (room expired or never existed on this server) —
        // drop it from history instead of landing in a wrong empty room.
        const pruned = readRecentRooms().filter((r) => r.id !== entry.id);
        try {
          localStorage.setItem("recent-rooms", JSON.stringify(pruned));
        } catch {
          // localStorage unavailable — state update below still applies
        }
        setRecentRooms(pruned);
        return;
      }
      if (response.ok) {
        const serverRoom: Room = await response.json();
        if (serverRoom.is_private) {
          promptHistoryPassword(entry.id);
          return;
        }
        // Server confirms public → join directly.
        onJoinRoom(entry.id);
        return;
      }
    } catch {
      // Server unreachable — fall through to the stored flag below; the
      // room-page gate is the backstop when online.
    }
    // Server check failed or was inconclusive: fall back to the stored
    // entry (is_private is immutable after creation, so a stored `true`
    // is authoritative).
    if (entry.is_private === true) {
      promptHistoryPassword(entry.id);
      return;
    }
    onJoinRoom(entry.id);
  };

  const handleJoinRoom = async () => {
    // Identity first: the exact entered name is used everywhere — no
    // generated placeholders.
    const name = joinName.trim();
    if (!name) {
      setJoinError("Enter your name to join");
      return;
    }
    const roomId = parseRoomId(joinInput);
    if (!roomId) {
      setJoinError("Enter a valid room link or room ID");
      return;
    }

    // Check-only mode (?create=0): a truncated/wrong ID returns 404
    // instead of silently materializing a new empty public room.
    try {
      const response = await fetch(`/api/rooms/${roomId}?create=0`, {
        headers: { Accept: "application/json" },
      });
      if (response.status === 404) {
        setJoinError("Room not found. Check the link — copy the full URL from the interviewer.");
        return;
      }
      if (response.ok) {
        const room: Room = await response.json();
        if (room.is_private) {
          // Switch from join form to password step — unmount join modal
          // so it cannot cover the password prompt.
          setShowJoinModal(false);
          setRequiresPassword(true);
          setJoinError("");
          return; // Show password prompt instead of joining
        }
      }
    } catch {
      // If check fails, try joining anyway
    }

    // Not private or check failed — join directly
    localStorage.setItem("editor-user-name", name);
    setJoinError("");
    setRequiresPassword(false);
    setShowJoinModal(false);
    onJoinRoom(roomId);
  };

  const handlePasswordSubmit = async () => {
    const roomId = parseRoomId(joinInput);
    if (!roomId || !joinPassword) return;
    const pwdName = joinName.trim();
    if (!pwdName) {
      setJoinError("Enter your name to join");
      return;
    }

    setJoinError("");
    try {
      const valid = await verifyRoomPassword(roomId, joinPassword);
      if (!valid) {
        setJoinError("Incorrect password. Please try again.");
        return;
      }

      // Store verification token in sessionStorage (session-only, not localStorage)
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`room-verified-${roomId}`, "true");
      }

      localStorage.setItem("editor-user-name", pwdName);
      setRequiresPassword(false);
      setShowJoinModal(false);
      setJoinPassword("");
      onJoinRoom(roomId);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to verify password");
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Role selection */}
        <div className="text-center mb-8">
          <Eyebrow label="PICK YOUR SEAT" className="mb-3" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-medium tracking-[-0.02em] text-foreground leading-tight mb-2">How are you joining today?</h2>
          <p className="text-[15px] text-muted-foreground">Pick your seat — the room handles the rest.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-10 sm:mb-14">
          <button
            onClick={() => setShowCreateModal(true)}
            className="group text-left bg-card border border-border hover:border-accent/40 card-lift p-6 sm:p-7 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Corners />
            <div className="w-10 h-10 bg-accent/15 border border-accent/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-medium text-foreground tracking-tight mb-1">I&apos;m the Interviewer</h3>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              Create a room, pick a language, and share the link with your candidate.
            </p>
            <div className="mt-auto">
              <CardCta icon={<Plus className="w-4 h-4" />} label="Create Interview Room" variant="accent" />
            </div>
          </button>

          <button
            onClick={() => {
              setJoinName(readStoredName());
              setShowJoinModal(true);
            }}
            className="group text-left bg-card border border-border hover:border-accent/40 card-lift p-6 sm:p-7 flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Corners />
            <div className="w-10 h-10 bg-accent/15 border border-accent/20 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300">
              <GraduationCap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-medium text-foreground tracking-tight mb-1">I&apos;m the Candidate</h3>
            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              Have an interview link? Paste it below to join your interview room.
            </p>
            <div className="mt-auto">
              <CardCta icon={<Link2 className="w-4 h-4" />} label="Join with a Link" variant="white" />
            </div>
          </button>
        </div>

        {/* Recent rooms — suppressed until after first mount to avoid SSR/client mismatch */}
        {!suppressRecent && recentRooms.length > 0 && (
          <div className="mb-12 sm:mb-16">
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <Eyebrow label="RECENT ROOMS" className="text-muted-foreground/70" />
              <span className="font-mono text-[11px] text-muted-foreground/50">
                {recentRooms.length} saved locally
              </span>
            </div>
            <div className="space-y-2">
              {recentRooms.slice(0, 5).map((room) => (
                <div
                  key={room.id}
                  className="group flex items-center justify-between px-3.5 py-3 bg-card border border-border hover:border-accent/40 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative w-1.5 h-1.5 rounded-full bg-accent shrink-0 ping-ring" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {room.name || `Room ${room.id.slice(0, 8)}`}
                    </span>
                    {room.is_private && (
                      <Lock className="w-3 h-3 text-accent shrink-0" aria-label="Private room" />
                    )}
                    <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:inline">
                      {getLanguage(room.language)?.label || room.language}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRecentJoin(room)}
                    className="shrink-0 ml-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs border border-foreground/15 text-muted-foreground hover:border-foreground/40 hover:text-foreground font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Join →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal — portaled to body: this dashboard is wrapped in a
          Reveal (transform + will-change), which would otherwise become the
          containing block for `fixed` elements and clip the modal. */}
      {showCreateModal &&
        createPortal(
        <div>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={closeModals}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="group relative bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Corners />
              <div className="relative z-10">
                <Eyebrow label="CREATE ROOM" className="mb-3" />
                <h2 className="text-xl font-medium tracking-tight text-foreground mb-1">Create Interview Room</h2>
                <p className="text-[13px] text-muted-foreground mb-6">Set up a private room and share the password with your candidate.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Room Name</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g., Frontend Interview - John"
                      className={inputClass}
                      maxLength={50}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateRoom();
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Language</label>
                    <div className="relative">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className={cn(inputClass, "appearance-none pr-10 cursor-pointer")}
                      >
                        {LANGUAGES.filter((lang) => !lang.hidden).map((lang) => (
                          <option key={lang.id} value={lang.name}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 border border-foreground/10 bg-foreground/[0.03] px-3 py-2.5">
                    <input
                      type="checkbox"
                      id="private-room"
                      checked={isPrivateRoom}
                      onChange={(e) => setIsPrivateRoom(e.target.checked)}
                      className="w-4 h-4 rounded-[2px] border-border accent-[#22C55E] cursor-pointer"
                    />
                    <label htmlFor="private-room" className="text-sm text-foreground cursor-pointer select-none flex-1">
                      Private room <span className="text-muted-foreground">(password protected)</span>
                    </label>
                    <span className="relative w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  </div>

                  {isPrivateRoom && (
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Room Password</label>
                      <input
                        type="password"
                        value={roomPassword}
                        onChange={(e) => setRoomPassword(e.target.value)}
                        placeholder="Minimum 4 characters"
                        className={cn(inputClass, "font-mono placeholder:font-sans")}
                        maxLength={128}
                        minLength={4}
                        autoComplete="new-password"
                      />
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Share this password with your candidate so they can join.
                      </p>
                    </div>
                  )}

                  {error && (
                    <p className="text-[13px] text-destructive font-mono">{error}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={closeModals}
                      disabled={creating}
                      className="flex-1 px-4 py-2.5 border border-foreground/15 text-muted-foreground hover:text-foreground hover:border-foreground/40 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      disabled={creating || !roomName.trim()}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                        creating || !roomName.trim()
                          ? "bg-foreground/[0.06] text-muted-foreground border border-foreground/10 cursor-not-allowed"
                          : "bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-[0_0_24px_-8px_rgba(34,197,94,0.6)]"
                      )}
                    >
                      {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                      {creating ? "Creating..." : "Create Room"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Password Prompt Modal (shown after room ID entered, if room is private) */}
      {requiresPassword &&
        createPortal(
        <div>
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={closeModals} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="group relative bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Corners />
              <div className="relative z-10">
                <Eyebrow label="PRIVATE ROOM" className="mb-3" />
                <div className="flex flex-col items-start mb-5">
                  <h2 className="text-xl font-medium tracking-tight text-foreground">Private Room</h2>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    This interview room is password protected. Enter the password to join.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Password</label>
                    <input
                      type="password"
                      value={joinPassword}
                      onChange={(e) => setJoinPassword(e.target.value)}
                      placeholder="Enter room password"
                      className={cn(inputClass, "font-mono placeholder:font-sans")}
                      autoComplete="new-password"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handlePasswordSubmit();
                        }
                      }}
                    />
                  </div>

                  {joinError && (
                    <p className="text-[13px] text-destructive font-mono">{joinError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setRequiresPassword(false);
                        setJoinError("");
                        setJoinPassword("");
                        setShowJoinModal(true);
                      }}
                      className="flex-1 px-4 py-2.5 border border-foreground/15 text-muted-foreground hover:text-foreground hover:border-foreground/40 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePasswordSubmit}
                      disabled={!joinPassword.trim()}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                        !joinPassword.trim()
                          ? "bg-foreground/[0.06] text-muted-foreground border border-foreground/10 cursor-not-allowed"
                          : "bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-[0_0_24px_-8px_rgba(34,197,94,0.6)]"
                      )}
                    >
                      <Lock className="w-4 h-4" />
                      Unlock Room
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Join Room Modal — hidden while password step is active (also portaled) */}
      {showJoinModal && !requiresPassword &&
        createPortal(
        <div>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={closeModals}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="group relative bg-card border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)] p-5 sm:p-6 w-full max-w-md max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <Corners />
              <div className="relative z-10">
                <Eyebrow label="JOIN ROOM" className="mb-3" />
                <h2 className="text-xl font-medium tracking-tight text-foreground mb-5">Join Interview Room</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Room Link or ID</label>
                    <input
                      type="text"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      placeholder="Paste the interview link here"
                      className={cn(inputClass, "font-mono placeholder:font-sans")}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleJoinRoom();
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-muted-foreground/80 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      placeholder="e.g., Sarah Chen"
                      className={inputClass}
                      maxLength={30}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleJoinRoom();
                        }
                      }}
                    />
                  </div>

                  {joinError && (
                    <p className="text-[13px] text-destructive font-mono">{joinError}</p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={closeModals}
                      className="flex-1 px-4 py-2.5 border border-foreground/15 text-muted-foreground hover:text-foreground hover:border-foreground/40 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleJoinRoom}
                      disabled={!joinInput.trim()}
                      className={cn(
                        "flex-1 px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                        !joinInput.trim()
                          ? "bg-foreground/[0.06] text-muted-foreground border border-foreground/10 cursor-not-allowed"
                          : "bg-accent text-accent-foreground hover:bg-accent/90 font-semibold shadow-[0_0_24px_-8px_rgba(34,197,94,0.6)]"
                      )}
                    >
                      <Link2 className="w-4 h-4" />
                      Join Room
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
