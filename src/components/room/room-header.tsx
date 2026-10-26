'use client';

import { useState, useCallback } from "react";
import { Share2, Check, CodeXml, LogOut, Settings, Eye, EyeOff, Copy, Lock } from "lucide-react";
import type { Room } from "@/types/room";
import { useMobile } from "@/hooks/use-mobile";
import { getUserColor, getUserInitials } from "@/lib/presence/colors";
import { getRoomPassword } from "@/hooks/use-room";
import { SettingsDrawer } from "@/components/room/settings-drawer";
import { LanguageSelect } from "@/components/editor/language-select";
import { ThemeToggle } from "@/components/editor/theme-toggle";
import { ModeToggle } from "@/components/editor/mode-toggle";
import { WhiteboardToggle } from "@/components/editor/whiteboard-toggle";

interface RoomHeaderProps {
  room: Room;
  userName: string;
  /** Whether this browser owns the room (interviewer). Candidates get false. */
  canManage?: boolean;
  onClose: () => void;
  onRoomUpdate: (room: Room) => void;
  /** Whiteboard overlay state; rendered when a toggle handler is provided. */
  whiteboardOpen?: boolean;
  /** Toggles the whiteboard; the button renders to the right of ModeToggle. */
  onToggleWhiteboard?: () => void;
}

export function RoomHeader({
  room,
  userName,
  canManage = false,
  onClose,
  onRoomUpdate,
  whiteboardOpen = false,
  onToggleWhiteboard,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [userColor] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("editor-user-color");
      if (stored) return stored;
      const newColor = getUserColor(Math.floor(Math.random() * 12));
      localStorage.setItem("editor-user-color", newColor);
      return newColor;
    }
    return "";
  });
  const isMobile = useMobile();

  const copyLink = useCallback(async () => {
    const url = `${window.location.origin}/room/${room.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy room link:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [room.id]);

  const copyRoomId = useCallback(async () => {
    const url = `${window.location.origin}/room/${room.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy room link:", url);
      return;
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }, [room.id]);

  // Candidates may switch language/theme unless the room is read-only
  // (view-only); the read-only flag itself stays owner-only.
  const locked = room.is_read_only && !canManage;

  const handleLanguageChange = useCallback(
    (lang: string) => {
      if (locked) return;
      const newRoom = { ...room, language: lang };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate, locked]
  );

  const handleThemeChange = useCallback(
    (theme: string) => {
      if (locked) return;
      const newRoom = { ...room, theme: theme };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate, locked]
  );

  const handleReadOnlyChange = useCallback(
    (readOnly: boolean) => {
      if (!canManage) return;
      const newRoom = { ...room, is_read_only: readOnly };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate, canManage]
  );

  const storedPassword =
    canManage && room.is_private ? getRoomPassword(room.id) : null;

  const copyPassword = useCallback(async () => {
    const pwd = getRoomPassword(room.id);
    if (!pwd) return;
    try {
      await navigator.clipboard.writeText(pwd);
    } catch {
      window.prompt("Room password:", pwd);
      return;
    }
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  }, [room.id]);

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-2.5 bg-card border-b border-border transition-colors">
      {/* Left: Logo & Room Info */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <CodeXml className="w-5 h-5 text-accent" />
          <span className="text-lg font-bold text-accent truncate hidden sm:inline tracking-tight">PairCode</span>
          <span className="text-lg font-bold text-accent sm:hidden">PC</span>
        </span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <span className="hidden sm:inline">Room:</span>
          <button
            onClick={copyLink}
            title={`Copy full room link:\n${room.id}`}
            className="bg-background px-2 py-0.5 rounded text-xs border border-border font-mono hover:border-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
          >
            {room.id.slice(0, 8)}
          </button>
          <button
            onClick={copyRoomId}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Copy room link"
            aria-label="Copy room link"
          >
            {copiedId ? (
              <Check className="w-4 h-4 text-accent" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {room.is_private && (
            <Lock className="w-3 h-3 text-accent shrink-0" aria-label="Private room" />
          )}
          {canManage && room.is_private && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-muted-foreground">Password:</span>
              <code
                className="bg-background px-2 py-0.5 rounded text-xs border border-border font-mono max-w-28 truncate"
                title={
                  storedPassword
                    ? showPassword
                      ? "Room password"
                      : "Click the eye icon to reveal the password"
                    : "Not available in this session (only on the device that created the room)"
                }
              >
                {showPassword ? (storedPassword ?? "—") : "••••••"}
              </code>
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title={showPassword ? "Hide room password" : "View room password"}
                aria-label={showPassword ? "Hide room password" : "View room password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-accent" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {storedPassword && (
                <button
                  onClick={copyPassword}
                  className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title="Copy password"
                  aria-label="Copy password"
                >
                  {copiedPassword ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-px h-6 bg-border hidden lg:block shrink-0" />

      {/* Center: Controls */}
      <div className="flex items-center gap-2 min-w-0">
        <LanguageSelect
          value={room.language}
          onChange={handleLanguageChange}
          disabled={locked}
        />
        <div className="hidden lg:block">
          <ThemeToggle
            theme={room.theme}
            onChange={handleThemeChange}
            disabled={locked}
          />
        </div>
        <ModeToggle />
        {onToggleWhiteboard && (
          <WhiteboardToggle open={whiteboardOpen} onToggle={onToggleWhiteboard} />
        )}
        <button
          onClick={copyLink}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-sm flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Share room link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-accent" />
          ) : (
            <Share2 className="w-4 h-4 text-muted-foreground" />
          )}
          {!isMobile && <span className="text-muted-foreground">Share</span>}
        </button>
        {canManage && (
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <div className="w-px h-6 bg-border hidden lg:block shrink-0" />

      {/* Right: User & Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2" title={userName || "Guest"}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground shrink-0"
            style={{ backgroundColor: userColor || getUserColor(0) }}
          >
            {getUserInitials(userName || "Guest")}
          </div>
          <span className="hidden sm:inline text-sm text-foreground/80 max-w-28 truncate">
            {userName || "Guest"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Leave room"
        >
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        language={room.language}
        theme={room.theme}
        isReadOnly={room.is_read_only}
        canManage={canManage}
        onLanguageChange={handleLanguageChange}
        onThemeChange={handleThemeChange}
        onReadOnlyChange={handleReadOnlyChange}
      />
    </div>
  );
}
