'use client';

import { useState, useEffect, useCallback, use, useRef, useId, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, Trash2, Check, Wand2, Eye, RotateCcw, Globe } from "lucide-react";
import { RoomHeader } from "@/components/room/room-header";
import { JoinModal } from "@/components/room/join-modal";
import { PasswordGate, checkRoomAccess } from "@/components/room/password-gate";
import { CodeEditor, type CodeEditorHandle } from "@/components/editor/code-editor";
import { RunButton } from "@/components/editor/run-button";
import { ConsolePanel } from "@/components/output/console-panel";
import { PreviewPanel } from "@/components/output/preview-panel";
import { PresenceBar } from "@/components/editor/presence-bar";
import { useRoom, isRoomOwner, sanitizeStoredName } from "@/hooks/use-room";
import { useLocalStorage } from "@/hooks/use-mobile";
import { useExecution } from "@/hooks/use-execution";
import { getLanguage, FORMATTABLE_LANGUAGES, getRoomFiles } from "@/lib/execute/languages";
import { buildPreviewHtml, stripTypeScript, previewError } from "@/lib/preview/build";
import { getUserColor } from "@/lib/presence/colors";
import type { Room, UpdateRoomInput } from "@/types/room";
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
  const [previewOpen, setPreviewOpen] = useState(true);
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

  // Multi-file modes (Web: index.html + styles.css): file list follows the
  // room language; the visible file is local per user while content stays
  // shared via Yjs.
  const roomFiles = useMemo(
    () => getRoomFiles(room?.language ?? "javascript"),
    [room?.language]
  );
  const [activeFile, setActiveFile] = useState<string>("");
  const activeFileRef = useRef<string>("");
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);
  // Bumped on ANY file change (background files included) so the live
  // preview rebuilds even when the edited file isn't visible.
  const [filesTick, setFilesTick] = useState(0);
  const handleActiveFileChange = useCallback((name: string) => {
    setActiveFile(name);
    // File content follows via onCodeChange from the editor on switch.
  }, []);

  // Seed the runnable code with the first file's default on first load and
  // on language switch (the editor replaces every shared file the same
  // way), so Run/Preview/Reset always match what's on screen.
  // Closes the preview pane when switching to a non-previewable language.
  useEffect(() => {
    if (!room) return;
    const langKey = room.language;
    if (lastLangRef.current === langKey) return;
    lastLangRef.current = langKey;
    const files = getRoomFiles(langKey);
    setActiveFile(files[0]?.name ?? "");
    setCode(files[0]?.defaultCode ?? "");
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
      if (!fetchedRoom) return;
      // Send only changed fields: candidates may change language/theme
      // (when not locked), but read-only stays owner-only — the API
      // rejects is_read_only without the owner token (403), and the UI
      // disables that control for candidates.
      const updates: UpdateRoomInput = {};
      if (updatedRoom.language !== fetchedRoom.language) {
        updates.language = updatedRoom.language;
      }
      if (updatedRoom.theme !== fetchedRoom.theme) {
        updates.theme = updatedRoom.theme;
      }
      if (updatedRoom.is_read_only !== fetchedRoom.is_read_only) {
        if (!isOwner) return;
        updates.is_read_only = updatedRoom.is_read_only;
      }
      if (Object.keys(updates).length === 0) return;
      // Read-only rooms are view-only for candidates — not even language
      // switches (which reset everyone's code) are allowed.
      if (!isOwner && editorReadOnly) return;
      // Persist to database (updates fetchedRoom via useRoom hook)
      fetchRoomUpdate(updates).catch(console.error);
    },
    [fetchRoomUpdate, fetchedRoom, isOwner, editorReadOnly]
  );

  const handleCodeChange = useCallback((newCode: string, fileName?: string) => {
    // Background-file edits must not clobber the active code state, but
    // they still bump the files tick so the live preview rebuilds.
    if (!fileName || fileName === activeFileRef.current) setCode(newCode);
    setFilesTick((t) => t + 1);
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

  // Signature of the code+language the visible preview was built from.
  // Guards against no-op rebuilds: background room polls mint a fresh room
  // object every few seconds, which recreates rebuildPreview below — without
  // this guard each poll would rebuild (fresh CSP nonce → new iframe key →
  // full remount) and the preview would visibly blink while idle.
  const previewSigRef = useRef<string | null>(null);
  const previewSig = (c: string, l: string) => `${l.length}:${l}\n${c}`;

  const rebuildPreview = useCallback(async () => {
    if (!room) return;
    const strategy = getLanguage(room.language)?.preview;
    if (!strategy) {
      setPreviewHtml(null);
      return;
    }
    try {
      if (strategy === "web") {
        // Merged preview reads both files live from the editor (the page
        // only tracks the visible file's code in state).
        const fileCode = (name: string) =>
          editorRef.current?.getFileCode(name) ??
          roomFiles.find((f) => f.name === name)?.defaultCode ??
          "";
        setPreviewHtml(
          await buildPreviewHtml(strategy, {
            html: fileCode("index.html"),
            css: fileCode("styles.css"),
          })
        );
      } else {
        const source =
          room.language === "typescript" ? await stripTypeScript(code) : code;
        setPreviewHtml(await buildPreviewHtml(strategy, source));
      }
    } catch {
      setPreviewHtml(previewError("Could not build preview."));
    } finally {
      previewSigRef.current =
        room.language === "web"
          ? `web\n${roomFiles
              .map((f) => editorRef.current?.getFileCode(f.name) ?? "")
              .join("\n###\n")}`
          : previewSig(code, room.language);
    }
  }, [room, code, roomFiles]);

  // Live preview: rebuild debounced while typing with the preview open.
  // Skips entirely when code+language already match the built preview, so
  // background polls never blink the iframe. Web mode compares all files.
  useEffect(() => {
    if (!previewOpen || !previewSupported) return;
    const langKey = room?.language ?? "";
    const sig =
      langKey === "web"
        ? `web\n${roomFiles
            .map((f) => editorRef.current?.getFileCode(f.name) ?? "")
            .join("\n###\n")}`
        : previewSig(code, langKey);
    if (previewSigRef.current === sig) return;
    const timer = setTimeout(() => {
      rebuildPreview();
    }, 700);
    return () => clearTimeout(timer);
  }, [previewOpen, previewSupported, rebuildPreview, room?.language, code, roomFiles, filesTick]);

  const handleTogglePreview = useCallback(() => {
    // Build immediately when opening so the pane never sits blank white.
    // (The debounced effect above handles subsequent typing.) Skips the
    // rebuild when the stored preview already matches — no blink.
    if (!previewOpen) {
      setPreviewOpen(true);
      const langKey = room?.language ?? "";
      const sig =
        langKey === "web"
          ? `web\n${roomFiles
              .map((f) => editorRef.current?.getFileCode(f.name) ?? "")
              .join("\n###\n")}`
          : previewSig(code, langKey);
      if (previewSigRef.current !== sig) {
        rebuildPreview();
      }
    } else {
      setPreviewOpen(false);
    }
  }, [previewOpen, rebuildPreview, code, room?.language, roomFiles]);

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
    // Render-only languages (HTML/CSS/Web) are preview-only; anything else
    // also runs through the execution API for console output.
    if (lang.name === "html" || lang.name === "css" || lang.name === "web") return;
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
    // Multi-file modes reset the visible file to its own default.
    const defaultCode =
      room.language === "web"
        ? (roomFiles.find((f) => f.name === activeFile)?.defaultCode ?? "")
        : (getLanguage(room.language)?.defaultCode ?? "");
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
  }, [room, code, editorReadOnly, roomFiles, activeFile]);

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

  // Read identity from storage after mount (keeps first render SSR-identical).
  // Legacy auto-generated names (UserNNN) are purged so the join modal
  // asks for the real name instead of reusing a placeholder.
  useEffect(() => {
    const storedName = sanitizeStoredName(localStorage.getItem("editor-user-name"));
    if (!storedName) {
      try {
        localStorage.removeItem("editor-user-name");
      } catch {
        // storage unavailable — modal still prompts
      }
      setUserName("");
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

      <div className="h-screen supports-[height:100dvh]:h-dvh flex flex-col bg-background">
        {/* Header */}
        <RoomHeader
          room={room}
          userName={userName}
          canManage={isOwner}
          onClose={() => router.push("/")}
          onRoomUpdate={handleRoomUpdate}
        />

        {/* Presence bar */}
        <div className="px-3 py-1.5">
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
                <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
                <button
                  onClick={handleSaveSnapshot}
                  disabled={!code || editorReadOnly}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    "flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !code || editorReadOnly
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                  className="shrink-0 p-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  title="Clear console"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleFormat}
                  disabled={!code || !canFormat || formatting || editorReadOnly}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    "flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !code || !canFormat || formatting || editorReadOnly
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
                    "shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    "flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    !code || editorReadOnly
                      ? "opacity-50 cursor-not-allowed text-muted-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Reset to default code"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
                <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
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
                  <span className="shrink-0 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-0.5 max-w-32 sm:max-w-64 truncate" title={formatMsg}>
                    {formatMsg}
                  </span>
                )}
                {roomUpdateError && (
                  <span className="shrink-0 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 max-w-32 sm:max-w-64 truncate" title={roomUpdateError}>
                    {roomUpdateError}
                  </span>
                )}
              </div>

              {/* Language info */}
              <div className="hidden md:flex text-xs text-muted-foreground items-center gap-2 shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                {getLanguage(room.language)?.label || room.language}
                {room.is_read_only && (
                  <span className="text-amber-500 bg-amber-500/15 rounded-full px-2 py-px font-medium">
                    {isOwner ? "Candidates read-only" : "Read-only"}
                  </span>
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
                files={roomFiles}
                activeFile={activeFile}
                onActiveFileChange={handleActiveFileChange}
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
