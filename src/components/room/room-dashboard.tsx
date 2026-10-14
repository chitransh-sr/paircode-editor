'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Link2, Briefcase, GraduationCap, Loader2, Lock } from "lucide-react";
import type { Room } from "@/types/room";
import { createRoom, verifyRoomPassword } from "@/hooks/use-room";
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
    const raw = localStorage.getItem("editor-user-name");
    if (!raw) return "";
    // Tolerate both raw strings and JSON-encoded strings
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : raw;
    } catch {
      return raw;
    }
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
  const [createdRoomPassword, setCreatedRoomPassword] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);

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

      // Store in localStorage (with the display name), then update state.
      const entry: RecentRoom = { ...room, name: roomName.trim() };
      const stored = readRecentRooms().filter((r) => r.id !== room.id);
      const updatedRooms = [entry, ...stored].slice(0, 10);

      localStorage.setItem("recent-rooms", JSON.stringify(updatedRooms));
      setRecentRooms(updatedRooms);
      setRoomName("");
      setRoomPassword("");
      setShowCreateModal(false);

      // If private, show the password to the interviewer for sharing
      if (isPrivateRoom) {
        setCreatedRoom(room);
        setCreatedRoomPassword(roomPassword);
      } else {
        setCreatedRoomPassword(null);
        setCreatedRoom(null);
      }

      onCreateRoom(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    const roomId = parseRoomId(joinInput);
    if (!roomId) {
      setJoinError("Enter a valid room link or room ID");
      return;
    }

    // Check if room is private
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        headers: { Accept: "application/json" },
      });
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
    const name = joinName.trim();
    if (name) {
      localStorage.setItem("editor-user-name", name);
    }
    setJoinError("");
    setRequiresPassword(false);
    setShowJoinModal(false);
    onJoinRoom(roomId);
  };

  const handlePasswordSubmit = async () => {
    const roomId = parseRoomId(joinInput);
    if (!roomId || !joinPassword) return;

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

      const name = joinName.trim();
      if (name) {
        localStorage.setItem("editor-user-name", name);
      }
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
        <div className="grid sm:grid-cols-2 gap-4 mb-16">
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
          <div className="mb-20">
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
                    <span className="text-sm text-muted-foreground shrink-0">{getLanguage(room.language)?.label || room.language}</span>
                  </div>
                  <Link
                    href={`/room/${room.id}`}
                    className="text-sm text-accent hover:text-accent/90 transition-opacity focus-visible:opacity-100 shrink-0 ml-3"
                  >
                    Join
                  </Link>
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
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeModals}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">Create Interview Room</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-foreground">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Frontend Interview - John"
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
                  <label className="block text-sm font-medium mb-1 text-foreground">Language</label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.name}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="private-room"
                    checked={isPrivateRoom}
                    onChange={(e) => setIsPrivateRoom(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <label htmlFor="private-room" className="text-sm text-foreground cursor-pointer">
                    Private room (password protected)
                  </label>
                </div>

                {isPrivateRoom && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-foreground">Room Password</label>
                    <input
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
                      maxLength={128}
                      minLength={4}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Share this password with your candidate so they can join.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModals}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={creating || !roomName.trim()}
                    className={cn(
                      "flex-1 px-4 py-2 rounded transition-all text-sm font-medium flex items-center justify-center gap-2",
                      creating || !roomName.trim()
                        ? "bg-muted cursor-not-allowed text-muted-foreground"
                        : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-xl"
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
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-xl"
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
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-colors"
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

      {/* Password Display Modal (shown after creating a private room) */}
      {createdRoomPassword && createdRoom && (
        <div>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => { setCreatedRoomPassword(null); setCreatedRoom(null); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border shadow-xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-accent/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-2">Room Created Successfully!</h2>
                <p className="text-sm text-muted-foreground">
                  Share this password with your candidate so they can join the interview.
                </p>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 mb-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Room ID</p>
                <p className="text-sm font-mono text-foreground break-all break-before">
                  {createdRoom.id}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={createdRoomPassword}
                      readOnly
                      className="flex-1 bg-background border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdRoomPassword);
                      }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 rounded transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      title="Copy password to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`/room/${createdRoom.id}`);
                    setCreatedRoomPassword(null);
                    setCreatedRoom(null);
                  }}
                  className="w-full px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Copy Room Link & Close
                </button>

                <button
                  onClick={() => { setCreatedRoomPassword(null); setCreatedRoom(null); }}
                  className="w-full px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
                <p className="text-xs text-muted-foreground text-center">
                  The room link has also been saved to your recent rooms.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
