'use client';

import { useState, useEffect } from "react";
import { Plus, Link2, Briefcase, GraduationCap, Loader2, Lock, ChevronDown } from "lucide-react";
import type { Room } from "@/types/room";
import { createRoom, verifyRoomPassword, sanitizeStoredName } from "@/hooks/use-room";
import { LANGUAGES, getLanguage } from "@/lib/execute/languages";
import { cn } from "@/lib/utils/cn";

interface RoomDashboardProps {
  onCreateRoom: (room: Room) => void;
  onJoinRoom: (roomId: string) => void;
}

/** Recent rooms are stored locally and may carry a display name. */
interface RecentRoom extends Room {
  name?: string;
}

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
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">How are you joining today?</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mb-10 sm:mb-16">
          <button
            onClick={() => setShowCreateModal(true)}
            className="group text-left bg-card rounded-xl p-6 border border-border hover:border-accent hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="w-10 h-10 bg-accent/15 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Briefcase className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-1 text-foreground">I&apos;m the Interviewer</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a room, pick a language, and share the link with your candidate.
            </p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-md font-medium text-sm transition-colors">
              <Plus className="w-4 h-4" />
              Create Interview Room
            </span>
          </button>

          <button
            onClick={() => {
              setJoinName(readStoredName());
              setShowJoinModal(true);
            }}
            className="group text-left bg-card rounded-xl p-6 border border-border hover:border-accent hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <div className="w-10 h-10 bg-accent/15 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <GraduationCap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold mb-1 text-foreground">I&apos;m the Candidate</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Have an interview link? Paste it below to join your interview room.
            </p>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md font-medium text-sm transition-colors">
              <Link2 className="w-4 h-4" />
              Join with a Link
            </span>
          </button>
        </div>

        {/* Recent rooms — suppressed until after first mount to avoid SSR/client mismatch */}
        {!suppressRecent && recentRooms.length > 0 && (
          <div className="mb-12 sm:mb-20">
            <h2 className="text-lg font-semibold mb-3 text-foreground">Recent Rooms</h2>
            <div className="space-y-2">
              {recentRooms.slice(0, 5).map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 bg-card rounded-md border border-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {room.name || `Room ${room.id.slice(0, 8)}`}
                    </span>
                    {room.is_private && (
                      <Lock className="w-3 h-3 text-accent shrink-0" aria-label="Private room" />
                    )}
                    <span className="text-sm text-muted-foreground shrink-0 hidden sm:inline">{getLanguage(room.language)?.label || room.language}</span>
                  </div>
                  <button
                    onClick={() => handleRecentJoin(room)}
                    className="text-sm text-accent hover:text-accent/90 hover:bg-accent/10 transition-colors focus-visible:opacity-100 shrink-0 ml-3 px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={closeModals}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl p-5 sm:p-6 w-full max-w-md border border-border shadow-2xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-1 text-foreground">Create Interview Room</h2>
              <p className="text-sm text-muted-foreground mb-5">Set up a private room and share the password with your candidate.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Frontend Interview - John"
                    className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/60 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition"
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
                  <label className="block text-sm font-medium mb-1.5 text-foreground">Language</label>
                  <div className="relative">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full appearance-none bg-background border border-border rounded-lg pl-3.5 pr-10 py-2.5 text-base sm:text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition cursor-pointer"
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

                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <input
                    type="checkbox"
                    id="private-room"
                    checked={isPrivateRoom}
                    onChange={(e) => setIsPrivateRoom(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent/60"
                  />
                  <label htmlFor="private-room" className="text-sm text-foreground cursor-pointer select-none">
                    Private room <span className="text-muted-foreground">(password protected)</span>
                  </label>
                </div>

                {isPrivateRoom && (
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground">Room Password</label>
                    <input
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-base sm:text-sm text-foreground font-mono placeholder:text-muted-foreground/60 placeholder:font-sans shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent transition"
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
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={closeModals}
                    disabled={creating}
                    className="flex-1 px-4 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-lg transition text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={creating || !roomName.trim()}
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2",
                      creating || !roomName.trim()
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
      )}

      {/* Password Prompt Modal (shown after room ID entered, if room is private) */}
      {requiresPassword && (
        <div>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={closeModals} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-5 sm:p-6 w-full max-w-md border border-border shadow-xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Lock className="w-12 h-12 mx-auto mb-2 text-accent" />
                <h2 className="text-xl font-semibold text-foreground">Private Room</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This interview room is password protected. Enter the password to join.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Password</label>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Enter room password"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-base sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
                  <p className="text-sm text-destructive">{joinError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setRequiresPassword(false);
                      setJoinError("");
                      setJoinPassword("");
                      setShowJoinModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={!joinPassword.trim()}
                    className={cn(
                      "flex-1 px-4 py-2 rounded transition-all text-sm font-medium flex items-center justify-center gap-2",
                      !joinPassword.trim()
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    )}
                  >
                    Unlock Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal — hidden while password step is active */}
      {showJoinModal && !requiresPassword && (
        <div>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeModals}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-5 sm:p-6 w-full max-w-md border border-border shadow-xl max-h-[90dvh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">Join Interview Room</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Room Link or ID</label>
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value)}
                    placeholder="Paste the interview link here"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-base sm:text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
                  <label className="block text-sm font-medium mb-1 text-foreground">Your Name</label>
                  <input
                    type="text"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="e.g., Sarah Chen"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-base sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
                  <p className="text-sm text-destructive">{joinError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModals}
                    className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinInput.trim()}
                    className={cn(
                      "flex-1 px-4 py-2 rounded transition-all text-sm font-medium flex items-center justify-center gap-2",
                      !joinInput.trim()
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    )}
                  >
                    Join Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
