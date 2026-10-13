'use client';

import { useState, useCallback } from "react";
import { Share2, Check, User, LogOut, Settings } from "lucide-react";
import type { Room } from "@/types/room";
import { useMobile } from "@/hooks/use-mobile";
import { getUserColor } from "@/lib/presence/colors";
import { SettingsDrawer } from "@/components/room/settings-drawer";
import { LanguageSelect } from "@/components/editor/language-select";
import { ThemeToggle } from "@/components/editor/theme-toggle";
import { ModeToggle } from "@/components/editor/mode-toggle";

interface RoomHeaderProps {
  room: Room;
  userName: string;
  onClose: () => void;
  onRoomUpdate: (room: Room) => void;
}

export function RoomHeader({
  room,
  userName,
  onClose,
  onRoomUpdate,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
      const newRoom = { ...room, language: lang };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate]
  );

  const handleThemeChange = useCallback(
    (theme: string) => {
      const newRoom = { ...room, theme: theme };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate]
  );

  const handleReadOnlyChange = useCallback(
    (readOnly: boolean) => {
      const newRoom = { ...room, is_read_only: readOnly };
      onRoomUpdate(newRoom);
    },
    [room, onRoomUpdate]
  );

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
        </div>
      </div>

      {/* Center: Controls */}
      <div className="flex items-center gap-2 min-w-0">
        <LanguageSelect
          value={room.language}
          onChange={handleLanguageChange}
          disabled={room.is_read_only}
        />
        <div className="hidden lg:block">
          <ThemeToggle
            theme={room.theme}
            onChange={handleThemeChange}
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
        <button
          onClick={() => setShowSettings(true)}
          className="p-1.5 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Settings"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
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
        onLanguageChange={handleLanguageChange}
        onThemeChange={handleThemeChange}
        onReadOnlyChange={handleReadOnlyChange}
      />
    </div>
  );
}
