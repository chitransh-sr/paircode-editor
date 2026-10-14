'use client';

import { useState, useCallback } from "react";
import { Share2, Check, User, LogOut, Settings, Eye, EyeOff, Copy, Lock } from "lucide-react";
import type { Room } from "@/types/room";
import { useMobile } from "@/hooks/use-mobile";
import { getUserColor } from "@/lib/presence/colors";
import { getRoomPassword } from "@/hooks/use-room";
import { SettingsDrawer } from "@/components/room/settings-drawer";
import { LanguageSelect } from "@/components/editor/language-select";
import { ThemeToggle } from "@/components/editor/theme-toggle";
import { ModeToggle } from "@/components/editor/mode-toggle";

interface RoomHeaderProps {
  room: Room;
  userName: string;
  /** Whether this browser owns the room (interviewer). Candidates get false. */
  canManage?: boolean;
  onClose: () => void;
  onRoomUpdate: (room: Room) => void;
}

export function RoomHeader({
  room,
  userName,
  canManage = false,
  onClose,
  onRoomUpdate,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
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

  const handleLanguageChange = useCallback(
    (lang: string) => {
      if (!canManage) return;
      const newRoom = { ...room, language: lang };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate, canManage]
  );

  const handleThemeChange = useCallback(
    (theme: string) => {
      if (!canManage) return;
      const newRoom = { ...room, theme: theme };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate, canManage]
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
    <div className="flex items-center justify-between p-3 bg-card border-b border-border transition-colors">
      {/* Left: Logo & Room Info */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl font-bold text-accent truncate hidden sm:inline">PairCode</span>
        <span className="text-xl font-bold text-accent sm:hidden">PC</span>
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <span className="hidden sm:inline">Room:</span>
          <code className="bg-background px-2 py-0.5 rounded text-xs border border-border">
            {room.id.slice(0, 8)}
          </code>
          {canManage && room.is_private && (
            <div className="relative">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1.5 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title={showPassword ? "Hide room password" : "View room password"}
                aria-label={showPassword ? "Hide room password" : "View room password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-accent" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showPassword && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowPassword(false)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-64 bg-card rounded-md shadow-lg border border-border z-30 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Room password
                    </p>
                    {storedPassword ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-background px-2 py-1 rounded text-xs border border-border truncate">
                          {storedPassword}
                        </code>
                        <button
                          onClick={copyPassword}
                          className="p-1.5 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="Copy password"
                          aria-label="Copy password"
                        >
                          {copiedPassword ? (
                            <Check className="w-4 h-4 text-accent" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Not available in this session (only on the device that created the room).
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-2 min-w-0">
        <LanguageSelect
          value={room.language}
          onChange={handleLanguageChange}
          disabled={!canManage}
        />
        <div className="hidden lg:block">
          <ThemeToggle
            theme={room.theme}
            onChange={handleThemeChange}
            disabled={!canManage}
          />
        </div>
        <ModeToggle />
        <button
          onClick={copyLink}
          className="p-1.5 hover:bg-muted/80 rounded-md transition-colors text-sm flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            className="p-1.5 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Right: User & Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <User
            className="w-4 h-4"
            style={{ color: userColor || getUserColor(0) }}
          />
          <span className="hidden sm:inline text-sm text-foreground/80" title={userName}>
            {userName || "Guest"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
