'use client';

import { useState, useEffect, useCallback, use, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Trash2, Check, Wand2, Eye, RotateCcw } from "lucide-react";
import { RoomHeader } from "@/components/room/room-header";
import { JoinModal } from "@/components/room/join-modal";
import { PasswordGate, checkRoomAccess } from "@/components/room/password-gate";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { RunButton } from "@/components/editor/run-button";
import { ConsolePanel } from "@/components/output/console-panel";
import { PreviewPanel } from "@/components/output/preview-panel";
import { PresenceBar } from "@/components/editor/presence-bar";
import { useRoom, isRoomOwner } from "@/hooks/use-room";
import { useLocalStorage } from "@/hooks/use-mobile";
import { useExecution } from "@/hooks/use-execution";
import { getLanguage, FORMATTABLE_LANGUAGES } from "@/lib/execute/languages";
import { buildPreviewHtml, stripTypeScript, previewError } from "@/lib/preview/build";
import { getUserColor } from "@/lib/presence/colors";
import type { Room } from "@/types/room";
import type { UserPresence } from "@/types/presence";
import { cn } from "@/lib/utils/cn";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();

  // Unwrap params - Next.js 15+ requires this
  const resolvedParams = use(params);
  const roomId = resolvedParams?.id;

  const {
    room: fetchedRoom,
    isLoading,
    error: roomError,
    updateError: roomUpdateError,
    updateRoom: fetchRoomUpdate,
  } = useRoom(roomId);

  const [userName, setUserName] = useLocalStorage<string>("editor-user-name", "");
  // Start closed/empty to match SSR HTML; storage is read after mount.
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [userColor, setUserColor] = useState("");
  const [code, setCode] = useState("");
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [formatMsg, setFormatMsg] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const editorRef = useRef<CodeEditorHandle | null>(null);
  const lastLangRef = useRef<string | null>(null);
  const [forceRender, setForceRender] = useState(0);
  // Ownership is resolved client-side after mount (sessionStorage is
  // unavailable during SSR, so start false to match the SSR output).
  const [isOwner, setIsOwner] = useState(false);

  // Use execution hook at the page level so the result reaches the console
  const { execute, isExecuting, result: executionResult, clearResult } = useExecution();

  // Stable user identity (useId is SSR-safe, unlike Date.now())
  const currentUserId = useId();

  // Warm up the Yjs WebSocket server (the /api/yjs/start route starts it
  // lazily on the server). This ensures availability before the editor
  // component mounts and the WebsocketProvider tries to connect.
  useEffect(() => {
    if (roomId) {
      fetch(`/api/yjs/start`).catch(() => {
        /* server-less: non-blocking */
      });
    }
  }, [roomId]);

  // Resolve ownership client-side once the room is known. Starts false so
  // the first client render matches SSR; refreshed after unlock events.
  useEffect(() => {
    if (fetchedRoom?.id) {
      setIsOwner(isRoomOwner(fetchedRoom.id));
    }
  }, [fetchedRoom?.id, forceRender]);

  useEffect(() => {
    const onUnlock = () => {
      if (fetchedRoom?.id) setIsOwner(isRoomOwner(fetchedRoom.id));
    };
    window.addEventListener("room-unlocked", onUnlock);
    return () => window.removeEventListener("room-unlocked", onUnlock);
  }, [fetchedRoom?.id]);

  // Derived error: combine hook error and roomId validation
  const error = roomError?.message || (!roomId && !roomError && !isLoading ? "Room ID not provided" : null);

  const room = fetchedRoom;

  // Read-only applies to candidates only — the interviewer (owner) always
  // keeps full edit access so they can demonstrate and assist.
  const editorReadOnly = !!room?.is_read_only && !isOwner;

  // Seed the runnable code with the language default on first load and on
  // language switch (unless the user already typed custom code).
  // Closes the preview pane when switching to a non-previewable language.
  useEffect(() => {
    if (!room) return;
    const langKey = room.language;
    if (lastLangRef.current === langKey) return;
    const prevDefault = lastLangRef.current
      ? getLanguage(lastLangRef.current)?.defaultCode ?? ""
      : "";
    lastLangRef.current = langKey;
    const nextDefault = getLanguage(langKey)?.defaultCode ?? "";
    setCode((prev) => (prev === "" || prev === prevDefault ? nextDefault : prev));
    if (!getLanguage(langKey)?.preview) {
      setPreviewOpen(false);
      setPreviewHtml(null);
    }
  }, [room]);

  const handleJoin = (name: string, color: string) => {
    setUserName(name);
    setUserColor(color);
    localStorage.setItem("editor-user-name", name);
    localStorage.setItem("editor-user-color", color);
    setShowJoinModal(false);
  };

  const handleRoomUpdate = useCallback(
    (updatedRoom: Room) => {
      // Only the interviewer (owner) may change room settings — candidates
      // get a disabled UI, and the API rejects direct PATCH calls with 403.
      if (!isOwner) return;
      // Persist to database (updates fetchedRoom via useRoom hook)
      fetchRoomUpdate({
        language: updatedRoom.language,
        theme: updatedRoom.theme,
        is_read_only: updatedRoom.is_read_only,
      }).catch(console.error);
    },
    [fetchRoomUpdate, isOwner]
  );

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
  }, []);

  const handlePresenceChange = useCallback((users: UserPresence[]) => {
    setActiveUsers(users);
  }, []);

  const handleSaveSnapshot = useCallback(async () => {
    if (!room || !code) return;

    try {
      const response = await fetch(`/api/rooms/${room.id}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error("Failed to save snapshot");

      setSnapshotSaved(true);
      setTimeout(() => setSnapshotSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save snapshot:", err);
    }
  }, [room, code]);

  const handleClearConsole = useCallback(() => {
    clearResult();
  }, [clearResult]);

  const previewSupported = !!room && !!getLanguage(room.language)?.preview;

  const rebuildPreview = useCallback(async () => {
    if (!room) return;
    const strategy = getLanguage(room.language)?.preview;
    if (!strategy) {
      setPreviewHtml(null);
      return;
    }
    try {
      const source =
        room.language === "typescript" ? await stripTypeScript(code) : code;
      setPreviewHtml(await buildPreviewHtml(strategy, source));
    } catch {
      setPreviewHtml(previewError("Could not build preview."));
    }
  }, [room, code]);

  // Live preview: rebuild debounced while typing with the preview open
  useEffect(() => {
    if (!previewOpen || !previewSupported) return;
    const timer = setTimeout(() => {
      rebuildPreview();
    }, 700);
    return () => clearTimeout(timer);
  }, [previewOpen, previewSupported, rebuildPreview]);

  const handleTogglePreview = useCallback(() => {
    // Build immediately when opening so the pane never sits blank white.
    // (The debounced effect above handles subsequent typing.)
    if (!previewOpen) {
      setPreviewOpen(true);
      rebuildPreview();
    } else {
      setPreviewOpen(false);
    }
  }, [previewOpen, rebuildPreview]);

  const handleRun = useCallback(async () => {
    if (!room || !code) return;
    const lang = getLanguage(room.language);
    if (!lang) return;
    // Build the visual preview FIRST (local + instant) so it stays in sync
    // with the code the moment Run is clicked. Code execution is a server
    // roundtrip (seconds) — awaiting it first made the preview feel broken.
    if (lang.preview) {
      setPreviewOpen(true);
      void rebuildPreview();
    }
    // Render-only languages (HTML/CSS) are preview-only; anything else
    // also runs through the execution API for console output.
    if (lang.name === "html" || lang.name === "css") return;
    await execute(code, lang.id);
  }, [room, code, execute, rebuildPreview]);

  const canFormat = !!room && FORMATTABLE_LANGUAGES.has(room.language);

  const handleFormat = useCallback(async () => {
    if (!room || !code || formatting || !FORMATTABLE_LANGUAGES.has(room.language)) return;
    setFormatting(true);
    setFormatMsg(null);
    try {
      const response = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: room.language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Format failed");
      editorRef.current?.setCode(data.code);
    } catch (err) {
      setFormatMsg(err instanceof Error ? err.message : "Format failed");
      setTimeout(() => setFormatMsg(null), 4000);
    } finally {
      setFormatting(false);
    }
  }, [room, code, formatting]);

  const handleReset = useCallback(() => {
    if (!room || editorReadOnly) return;
    const defaultCode = getLanguage(room.language)?.defaultCode ?? "";
    if (!defaultCode || code === defaultCode) return;
    // Shared document: resetting replaces the code for everyone in the
    // room (via the editor's Yjs-synced setCode), so confirm first.
    if (
      !window.confirm(
        "Reset code to the language default? This replaces the current code for everyone in the room."
      )
    ) {
      return;
    }
    editorRef.current?.setCode(defaultCode);
  }, [room, code, editorReadOnly]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save snapshot
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveSnapshot();
      }
      // Ctrl/Cmd + Shift + F to format code
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        handleFormat();
      }
    },
    [handleSaveSnapshot, handleFormat]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Read identity from storage after mount (keeps first render SSR-identical)
  useEffect(() => {
    if (!localStorage.getItem("editor-user-name")) {
      setShowJoinModal(true);
    }
    const storedColor = localStorage.getItem("editor-user-color");
    if (storedColor) {
      setUserColor(storedColor);
    } else {
      const newColor = getUserColor(Math.floor(Math.random() * 12));
      localStorage.setItem("editor-user-color", newColor);
      setUserColor(newColor);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-foreground mb-4">{error || "Room not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Security: If the room is private and the user hasn't verified the password,
  // show the PasswordGate before allowing access to the editor.
  const roomAccessOk = checkRoomAccess(room.id, room);
  if (!roomAccessOk) {
    return (
      <PasswordGate
        room={room}
        onUnlocked={() => {
          // Force a re-render by updating a key state
          setForceRender((n) => n + 1);
        }}
      />
    );
  }

  // Build current user object for presence bar
  const currentUser: UserPresence | null = userName
    ? {
        id: currentUserId,
        name: userName,
        color: userColor || getUserColor(0),
        lastActive: new Date().toISOString(),
      }
    : null;

  return (
    <>
      {/* Join Modal */}
      <JoinModal
        open={showJoinModal}
        onJoin={handleJoin}
        defaultName={userName || ""}
      />

      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <RoomHeader
          room={room}
          userName={userName}
          canManage={isOwner}
          onClose={() => router.push("/")}
          onRoomUpdate={handleRoomUpdate}
        />

        {/* Presence bar */}
        <div className="px-3 py-1">
          <PresenceBar users={activeUsers} currentUser={currentUser} />
        </div>

        {/* Editor + preview split area.
            Mobile-first: stacked (editor top, preview below, scrolls if short).
            Desktop (lg+): side-by-side halves. */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* Editor (left half on desktop) */}
          <div className="flex-1 min-h-[320px] lg:min-h-0 min-w-0 flex flex-col">
            <div className="bg-card px-3 py-2 border-b border-border flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 overflow-x-auto py-0.5 min-w-0">
                <div className="shrink-0">
                  <RunButton
                    code={code}
                    isExecuting={isExecuting}
                    result={executionResult}
                    onExecute={handleRun}
                    disabled={editorReadOnly}
                  />
                </div>
                <button
                  onClick={handleSaveSnapshot}
                  disabled={!code || editorReadOnly}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    "flex items-center gap-2",
                    !code || editorReadOnly
                      ? "bg-muted cursor-not-allowed text-muted-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  title="Save snapshot (Ctrl/Cmd + S)"
                >
                  {snapshotSaved ? (
                    <Check className="w-4 h-4 text-accent" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">{snapshotSaved ? "Saved" : "Save"}</span>
                </button>
                <button
                  onClick={handleClearConsole}
                  className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title="Clear console"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFormat}
                  disabled={!code || !canFormat || formatting || editorReadOnly}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    "flex items-center gap-2",
                    !code || !canFormat || formatting || editorReadOnly
                      ? "bg-muted cursor-not-allowed text-muted-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  title={
                    canFormat
                      ? "Format code (Ctrl/Cmd + Shift + F)"
                      : `Formatting is not supported for ${getLanguage(room.language)?.label || room.language} yet`
                  }
                >
                  {formatting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Format</span>
                </button>
                <button
                  onClick={handleReset}
                  disabled={!code || editorReadOnly}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    "flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !code || editorReadOnly
                      ? "bg-muted cursor-not-allowed text-muted-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  title="Reset to default code"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
                <button
                  onClick={handleTogglePreview}
                  disabled={!previewSupported}
                  aria-pressed={previewOpen}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    "flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !previewSupported
                      ? "bg-muted cursor-not-allowed text-muted-foreground"
                      : previewOpen
                        ? "bg-accent/20 text-foreground hover:bg-accent/30"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                  title={
                    previewSupported
                      ? "Toggle live preview"
                      : "Preview is available for HTML, CSS, JavaScript, TypeScript and React"
                  }
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                {formatMsg && (
                  <span className="shrink-0 text-xs text-destructive max-w-32 sm:max-w-64 truncate" title={formatMsg}>
                    {formatMsg}
                  </span>
                )}
                {roomUpdateError && (
                  <span className="shrink-0 text-xs text-orange-400 max-w-32 sm:max-w-64 truncate" title={roomUpdateError}>
                    {roomUpdateError}
                  </span>
                )}
              </div>

              {/* Language info */}
              <div className="hidden md:flex text-xs text-muted-foreground/70 items-center gap-2 shrink-0">
                {getLanguage(room.language)?.label || room.language}
                {room.is_read_only && (
                  <>
                    <span>•</span>
                    <span className="text-orange-400">
                      {isOwner ? "Candidates read-only" : "Read-only"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <CodeEditor
                ref={editorRef}
                language={room.language}
                theme={room.theme}
                isReadOnly={editorReadOnly}
                userName={userName}
                userColor={userColor}
                onNameChange={setUserName}
                onCodeChange={handleCodeChange}
                onPresenceChange={handlePresenceChange}
              />
            </div>
          </div>

          {/* Preview (right half on desktop, below editor on mobile) */}
          {previewOpen && previewSupported && (
            <div className="shrink-0 h-[340px] sm:h-[420px] lg:h-auto lg:w-1/2 border-t lg:border-t-0 lg:border-l border-border flex flex-col min-w-0 bg-card">
              <PreviewPanel
                html={previewHtml}
                onRefresh={rebuildPreview}
                onClose={() => setPreviewOpen(false)}
              />
            </div>
          )}
        </div>

        {/* Console (always at the bottom) */}
        <ConsolePanel
          result={executionResult}
          onStdinSubmit={(input) => {
            console.log("STDIN:", input);
          }}
          waitingForInput={false}
          onClear={clearResult}
        />
      </div>
    </>
  );
}
