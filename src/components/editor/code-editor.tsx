'use client';

import { useState, useRef, useEffect, useCallback, useImperativeHandle, useMemo, forwardRef } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
// y-monaco's MonacoBinding would sync text and render cursors, but its deep
// import path ('monaco-editor/esm/.../editor.api.js') doesn't resolve under
// Turbopack. Instead, we implement the same logic directly, generalized to
// one Monaco model + Y.Text per file (multi-file modes like Web):
//  1. Text sync via doc.on("update") + per-model onDidChangeContent()
//  2. Cursor tracking via Y.createRelativePosition → awareness (active file)
//  3. Remote cursor rendering via monaco editor deltaDecorations()
// NOTE: `monaco-editor` is imported as a type only. A static runtime import
// pulls the entire ~5MB editor into the client bundle (slow first load) and
// crashes SSR (monaco touches `window`/`self` at module scope). The real
// runtime instance comes from @monaco-editor/react's loader via `onMount`
// (see `monacoInstance` below), pinned to the installed version over CDN.
import type * as monaco from "monaco-editor";
import { getLanguage } from "@/lib/execute/languages";
import type { RoomFile } from "@/types/execution";
import { getUserColor, getUserInitials } from "@/lib/presence/colors";
import { getWsUrl } from "@/lib/yjs/ws-client";
import type { UserPresence } from "@/types/presence";
import { cn } from "@/lib/utils/cn";

// Pin the loader to the installed monaco-editor version over CDN so the
// <Editor> mount doesn't fetch an unpinned (and CSP-blocked) `latest`.
// Must match the `monaco-editor` version in package.json.
const MONACO_VS_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.57.0/min/vs";
if (typeof window !== "undefined") {
  try {
    loader.config({ paths: { vs: MONACO_VS_CDN } });
  } catch {
    // Non-fatal: loader falls back to its default CDN path.
  }
}

/** Convert a hex color ("#ff0000" or "ff0000") to an [r, g, b] tuple. */
function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "");
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return [r, g, b];
  }
  return null;
}

interface CodeEditorProps {
  language: string;
  theme?: string;
  isReadOnly?: boolean;
  userName?: string;
  userColor?: string;
  /** Files for multi-file modes (Web: index.html + styles.css). */
  files?: RoomFile[];
  /** Name of the visible file. */
  activeFile?: string;
  onActiveFileChange?: (name: string) => void;
  onCodeChange?: (code: string, fileName?: string) => void;
  onPresenceChange?: (users: UserPresence[]) => void;
}

export interface CodeEditorHandle {
  /** Replace the entire active file content (syncs Yjs + notifies parent). */
  setCode: (code: string) => void;
  /** Current content of the active file. */
  getCode: () => string;
  /** Current content of any file by name (for merged previews). */
  getFileCode: (name: string) => string;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      language,
      theme = "vs-dark",
      isReadOnly = false,
      userName = "",
      userColor = "",
      files = [],
      activeFile = "",
      onActiveFileChange,
      onCodeChange,
      onPresenceChange,
    }: CodeEditorProps,
    ref
  ) {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const docRef = useRef<Y.Doc | null>(null);
    const providerRef = useRef<WebsocketProvider | null>(null);
    const awarenessRef = useRef<WebsocketProvider["awareness"] | null>(null);
    const isRemoteChangeRef = useRef(false);
    const cursorDebounceRef = useRef<NodeJS.Timeout | null>(null);
    const decorationIdsRef = useRef<string[] | null>(null);
    const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
    // Multi-file state: one Monaco model + one Y.Text per file.
    const modelsRef = useRef(new Map<string, monaco.editor.ITextModel>());
    const yTextsRef = useRef(new Map<string, Y.Text>());
    const ownedModelsRef = useRef(new Set<string>());
    const bindDisposersRef = useRef(new Map<string, () => void>());
    const activeFileRef = useRef<string>("");

    // Effective file list (single-file modes synthesize one entry) and the
    // resolved visible file. Memoized so binding effects don't churn.
    const effectiveFiles = useMemo<RoomFile[]>(() => {
      if (files.length) return files;
      const meta = getLanguage(language);
      if (!meta) return [];
      return [
        {
          name: `main.${meta.monacoLanguage}`,
          monacoLanguage: meta.monacoLanguage,
          defaultCode: meta.defaultCode ?? "",
        },
      ];
    }, [files, language]);
    const visibleActive =
      effectiveFiles.some((f) => f.name === activeFile)
        ? activeFile
        : (effectiveFiles[0]?.name ?? "");

    // Mirror the visible file for closures (set synchronously on switches).
    useEffect(() => {
      activeFileRef.current = visibleActive;
    }, [visibleActive]);

    // ─── Multi-file Yjs helpers (one Monaco model + Y.Text per file) ───

    // Register the Monaco → Yjs listener for one file's model.
    const bindFileModel = useCallback(
      (file: RoomFile) => {
        const doc = docRef.current;
        const model = modelsRef.current.get(file.name);
        const yText = yTextsRef.current.get(file.name);
        if (!doc || !model || !yText || model.isDisposed()) return;
        bindDisposersRef.current.get(file.name)?.();
        const subscription = model.onDidChangeContent(() => {
          if (isRemoteChangeRef.current) return;
          const current = docRef.current;
          const text = yTextsRef.current.get(file.name);
          const liveModel = modelsRef.current.get(file.name);
          if (!current || !text || !liveModel || liveModel.isDisposed()) return;
          const newCode = liveModel.getValue();
          if (newCode !== text.toString()) {
            current.transact(() => {
              text.delete(0, text.length);
              text.insert(0, newCode);
            }, "monaco");
            if (file.name === activeFileRef.current) onCodeChange?.(newCode, file.name);
          }
        });
        bindDisposersRef.current.set(file.name, () => subscription.dispose());
      },
      [onCodeChange]
    );

    // Ensure one Monaco model + Y.Text per file; adopt the auto-created
    // model for the visible file; dispose removed files; show active.
    const syncFileModels = useCallback(() => {
      const editor = editorRef.current;
      const monacoInstance = monacoRef.current;
      const doc = docRef.current;
      if (!editor || !monacoInstance || !doc) return;
      const wanted = new Set(effectiveFiles.map((f) => f.name));
      for (const [name, model] of modelsRef.current) {
        if (!wanted.has(name)) {
          bindDisposersRef.current.get(name)?.();
          bindDisposersRef.current.delete(name);
          if (ownedModelsRef.current.has(name)) {
            if (!model.isDisposed()) model.dispose();
            ownedModelsRef.current.delete(name);
          }
          modelsRef.current.delete(name);
          yTextsRef.current.delete(name);
        }
      }
      // First bind: adopt the auto-created model for the visible file.
      const autoModel = editor.getModel();
      if (autoModel && ![...modelsRef.current.values()].includes(autoModel)) {
        modelsRef.current.set(activeFileRef.current, autoModel);
      }
      for (const file of effectiveFiles) {
        let yText = yTextsRef.current.get(file.name);
        if (!yText) {
          yText = doc.getText(`file:${file.name}`);
          yTextsRef.current.set(file.name, yText);
        }
        let model = modelsRef.current.get(file.name);
        if (!model || model.isDisposed()) {
          model = monacoInstance.editor.createModel(
            yText.toString() || file.defaultCode,
            file.monacoLanguage
          );
          ownedModelsRef.current.add(file.name);
          modelsRef.current.set(file.name, model);
        } else {
          monacoInstance.editor.setModelLanguage(model, file.monacoLanguage);
        }
        bindFileModel(file);
      }
      const activeModel = modelsRef.current.get(activeFileRef.current);
      if (activeModel && !activeModel.isDisposed() && editor.getModel() !== activeModel) {
        editor.setModel(activeModel);
      }
    }, [effectiveFiles, bindFileModel]);

    // Seed-or-adopt once the relay sync lands: fresh room → publish each
    // default exactly once; existing room → adopt relay content.
    const settleSharedDocs = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return;
      for (const file of effectiveFiles) {
        const yText = yTextsRef.current.get(file.name);
        if (!yText) continue;
        const shared = yText.toString();
        const model = modelsRef.current.get(file.name);
        if (shared) {
          if (model && !model.isDisposed() && shared !== model.getValue()) {
            isRemoteChangeRef.current = true;
            model.setValue(shared);
            isRemoteChangeRef.current = false;
            if (file.name === activeFileRef.current) onCodeChange?.(shared, file.name);
          }
        } else if (file.defaultCode) {
          yText.insert(0, file.defaultCode);
        }
      }
    }, [effectiveFiles, onCodeChange]);

    // Yjs → Monaco router across all files (remote edits + sync merges).
    // Only the visible file is reported — background files sync silently
    // so Run/Preview keep the right code.
    const handleDocUpdate = useCallback(
      (_update: Uint8Array, origin: unknown) => {
        if (origin === "monaco" || isRemoteChangeRef.current) return;
        isRemoteChangeRef.current = true;
        try {
          for (const file of effectiveFiles) {
            const yText = yTextsRef.current.get(file.name);
            const model = modelsRef.current.get(file.name);
            if (!yText || !model || model.isDisposed()) continue;
            const newCode = yText.toString();
            if (newCode !== model.getValue()) {
              model.setValue(newCode);
              if (file.name === activeFileRef.current) onCodeChange?.(newCode, file.name);
            }
          }
        } finally {
          isRemoteChangeRef.current = false;
        }
      },
      [effectiveFiles, onCodeChange]
    );

    // Switch the visible file (tab click). Content follows via onCodeChange.
    const switchToFile = useCallback(
      (name: string) => {
        const editor = editorRef.current;
        const model = modelsRef.current.get(name);
        if (!editor || !model || model.isDisposed()) return;
        if (editor.getModel() !== model) {
          const prev = editor.getModel();
          if (prev && decorationIdsRef.current?.length) {
            prev.deltaDecorations(decorationIdsRef.current, []);
            decorationIdsRef.current = null;
          }
          editor.setModel(model);
        }
        activeFileRef.current = name;
        awarenessRef.current?.setLocalStateField("file", name);
        onCodeChange?.(model.getValue(), name);
        onActiveFileChange?.(name);
      },
      [onActiveFileChange, onCodeChange]
    );

    // Yjs binding to Monaco, using a shared WebsocketProvider so that
    // changes are broadcast to other collaborators in the same room.
    // This binding handles text sync + remote cursor rendering manually
    // (avoids the y-monaco deep-import resolution issue in Turbopack).
    const setupYjsBinding = useCallback(
      (
        editor: monaco.editor.IStandaloneCodeEditor,
        monacoInstance: typeof monaco,
        doc: Y.Doc,
        provider: WebsocketProvider
      ) => {
        docRef.current = doc;
        providerRef.current = provider;
        const awareness = provider.awareness;
        awarenessRef.current = awareness;

        // Local user profile (for presence display + same-file cursors)
        awareness.setLocalState({
          user: {
            id: `user-${Date.now()}`,
            name: userName || "Anonymous",
            color: localStorage.getItem("editor-user-color") || getUserColor(Math.floor(Math.random() * 12)),
          },
          file: activeFileRef.current,
        });

        const monacoModel = editor.getModel();

        /** Convert a Monaco position to a Yjs relative position (active file). */
        const posToRelative = (pos: monaco.IPosition): Y.RelativePosition | null => {
          const yText = yTextsRef.current.get(activeFileRef.current);
          const model = editor.getModel();
          if (!pos || !model || !yText) return null;
          const index = model.getOffsetAt(pos);
          return Y.createRelativePositionFromTypeIndex(yText, index, 0);
        };

        /** Convert a Yjs absolute position to a Monaco position. */
        const absToMonaco = (abs: Y.AbsolutePosition | null): monaco.IPosition | null => {
          const model = editor.getModel();
          if (!abs || !model) return null;
          const offset = Math.min(abs.index, model.getValueLength());
          return model.getPositionAt(offset);
        };

        // Awareness change handler — updates user list and renders remote cursors
        const handleAwarenessChange = () => {
          if (!awarenessRef.current) return;

          const states = awarenessRef.current.getStates() as Map<
            number,
            {
              user: { id: string; name: string; color: string };
              file?: string;
              selection?: {
                anchor: Y.RelativePosition;
                head: Y.RelativePosition;
              };
            }
          >;

          const users: UserPresence[] = [];
          const cssRules: string[] = [];
          const decorations: monaco.editor.IModelDeltaDecoration[] = [];

          states.forEach((state, clientId) => {
            // Exclude the local client — parent adds it via currentUser.
            if (clientId === awarenessRef.current?.clientID || !state?.user) return;
            // Cursors only make sense on the same file.
            const sameFile = !state.file || state.file === activeFileRef.current;

            // Build CSS for per-user cursor colors
            if (state.user.color) {
              const color = state.user.color;
              const rgb = hexToRgb(color);
              if (rgb) {
                const [r, g, b] = rgb;
                const bg = `rgba(${r}, ${g}, ${b}, 0.25)`;
                cssRules.push(
                  `.remote-sel-${clientId} { background-color: ${bg} !important; }` +
                  `.remote-cursor-${clientId} { border-left: 2px solid ${color} !important; }`
                );
              }
            }

            // Render remote selection/cursor as Monaco decorations
            if (sameFile && state.selection?.anchor && state.selection?.head) {
              try {
                const anchorAbs = Y.createAbsolutePositionFromRelativePosition(
                  state.selection.anchor, doc
                );
                const headAbs = Y.createAbsolutePositionFromRelativePosition(
                  state.selection.head, doc
                );
                const startPos = absToMonaco(anchorAbs);
                const endPos = absToMonaco(headAbs);

                if (startPos && endPos) {
                  const range = new monacoInstance.Range(
                    startPos.lineNumber, startPos.column,
                    endPos.lineNumber, endPos.column
                  );
                  decorations.push({
                    range,
                    options: {
                      className: `remote-sel-${clientId}`,
                      after: {
                        content: state.user.name ? `  ${state.user.name}` : "",
                        inlineClassName: `remote-cursor-${clientId}`,
                      },
                    },
                  });
                }
              } catch {
                // Relative position not resolvable yet (doc not fully synced)
              }
            }

            const cursorPos = absToMonaco(
              sameFile && state.selection?.head
                ? Y.createAbsolutePositionFromRelativePosition(state.selection.head, doc)
                : null
            );

            const user: UserPresence = {
              id: state.user.id,
              name: state.user.name,
              color: state.user.color,
              cursor: cursorPos
                ? { line: cursorPos.lineNumber, ch: cursorPos.column }
                : undefined,
              lastActive: new Date().toISOString(),
            };
            users.push(user);
          });

          // Apply remote cursor decorations to the visible editor model
          const activeModel = editor.getModel();
          if (activeModel && !activeModel.isDisposed()) {
            if (decorations.length > 0) {
              const ids = activeModel.deltaDecorations(
                decorationIdsRef.current || [],
                decorations
              );
              decorationIdsRef.current = ids;
            } else if (decorationIdsRef.current && decorationIdsRef.current.length > 0) {
              // All remote users disconnected — clear decorations
              activeModel.deltaDecorations(decorationIdsRef.current, []);
              decorationIdsRef.current = null;
            }
          }

          // Inject per-user cursor CSS
          if (cssRules.length > 0) {
            let styleEl = document.getElementById("yjs-cursor-styles") as HTMLStyleElement | null;
            if (!styleEl) {
              styleEl = document.createElement("style");
              styleEl.id = "yjs-cursor-styles";
              document.head.appendChild(styleEl);
            }
            styleEl.textContent = cssRules.join("\n");
          }

          setActiveUsers(users);
          onPresenceChange?.(users);
        };

        if (monacoModel) {
          // Multi-file bind: one Monaco model + Y.Text per file (the
          // auto-created model is adopted for the visible file).
          // Per-file content listeners register inside syncFileModels.
          syncFileModels();

          // Single doc-level update router for Yjs → Monaco sync.
          doc.on("update", handleDocUpdate);

          // Report the visible file (Monaco already shows its default).
          const activeModel = editor.getModel();
          if (activeModel) onCodeChange?.(activeModel.getValue(), activeFileRef.current);

          // Local cursor tracking → awareness (for remote cursor rendering)
          editor.onDidChangeCursorPosition(() => {
            if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
            cursorDebounceRef.current = setTimeout(() => {
              const position = editor.getPosition();
              if (position && awarenessRef.current) {
                awarenessRef.current.setLocalStateField("cursor", {
                  line: position.lineNumber,
                  ch: position.column,
                });
              }
            }, 50);
          });

          editor.onDidChangeCursorSelection(() => {
            const selection = editor.getSelection();
            if (selection && awarenessRef.current) {
              const selStart = new monacoInstance.Position(
                selection.startLineNumber, selection.startColumn
              );
              const selEnd = new monacoInstance.Position(
                selection.endLineNumber, selection.endColumn
              );
              const relAnchor = posToRelative(selStart);
              const relHead = posToRelative(selEnd);
              if (relAnchor && relHead) {
                awarenessRef.current.setLocalStateField("selection", {
                  anchor: relAnchor,
                  head: relHead,
                });
              }
            }
          });
        }

        // Seed-or-adopt once the relay sync lands (fresh room → publish
        // each default once; existing room → adopt relay content).
        const onSync = (synced: boolean) => {
          if (synced) {
            settleSharedDocs();
            clearTimeout(syncFallback);
          }
        };
        provider.on("sync", onSync);
        // Fallback: relay unreachable — still publish local defaults.
        const syncFallback = setTimeout(() => settleSharedDocs(), 2500);

        // Listen for awareness changes (other users join/leave/update)
        awareness.on("change", handleAwarenessChange);
        handleAwarenessChange();

        docRef.current = doc;

        return () => {
          if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
          clearTimeout(syncFallback);
          provider.off("sync", onSync);
          for (const dispose of bindDisposersRef.current.values()) dispose();
          bindDisposersRef.current.clear();
          for (const name of ownedModelsRef.current) {
            modelsRef.current.get(name)?.dispose();
          }
          ownedModelsRef.current.clear();
          modelsRef.current.clear();
          yTextsRef.current.clear();
          awareness.off("change", handleAwarenessChange);
          awareness.destroy();
          provider.destroy();
          doc.destroy();
        };
      },
      [userName, onCodeChange, onPresenceChange, syncFileModels, handleDocUpdate, settleSharedDocs]
    );

    // Handle editor mount
    const handleEditorMount = useCallback(
      (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
        editorRef.current = editor;
        monacoRef.current = monacoInstance;

        // Register custom themes referenced by the theme toggle
        // ("vs-dark", "light", "hc-black" are built-in).
        monacoInstance.editor.defineTheme("githubDarkDefault", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "8b949e", fontStyle: "italic" },
            { token: "keyword", foreground: "ff7b72" },
            { token: "string", foreground: "a5d6ff" },
            { token: "number", foreground: "79c0ff" },
          ],
          colors: {
            "editor.background": "#0d1117",
            "editor.foreground": "#e6edf3",
            "editor.lineHighlightBackground": "#161b22",
            "editorLineNumber.foreground": "#6e7681",
          },
        });
        monacoInstance.editor.defineTheme("oneDark", {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "7f848e", fontStyle: "italic" },
            { token: "keyword", foreground: "c678dd" },
            { token: "string", foreground: "98c379" },
            { token: "number", foreground: "d19a66" },
          ],
          colors: {
            "editor.background": "#282c34",
            "editor.foreground": "#abb2bf",
            "editor.lineHighlightBackground": "#2c313c",
            "editorLineNumber.foreground": "#636d83",
          },
        });

        // Derive the room ID from the URL path (e.g. /room/abc-123 → "abc-123").
        // Fallback to "default" for safety.
        const roomId =
          typeof window !== "undefined"
            ? (window.location.pathname.split("/")[2] ?? "default")
            : "default";

        // Create a shared Y.Doc connected to the WebSocket server for this room.
        const doc = new Y.Doc();
        const wsUrl = getWsUrl(roomId);
        const provider = new WebsocketProvider(wsUrl, roomId, doc);
        providerRef.current = provider;

        // Configure editor options
        editor.focus();
        editor.updateOptions({
          readOnly: isReadOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          bracketPairColorization: { enabled: true },
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          insertSpaces: true,
          wordWrap: "on",
          smoothScrolling: true,
          cursorBlinking: "smooth",
          renderWhitespace: "selection",
          contextmenu: true,
          multiCursorModifier: "alt",
          padding: { top: 16, bottom: 16 },
          mouseWheelZoom: true,
        });

        const cleanup = setupYjsBinding(editor, monacoInstance, doc, provider);

        return cleanup;
      },
      [isReadOnly, setupYjsBinding]
    );

    // Track previous language to detect changes
    const prevLangRef = useRef<string>(language);

    // Handle language change — swap the file set and reset every file to
    // its new default (shared doc + views), so all collaborators see the
    // new starter code. Shows the first file afterwards.
    useEffect(() => {
      const editor = editorRef.current;
      const monacoInstance = monacoRef.current;
      const doc = docRef.current;
      if (!editor || !monacoInstance || !doc) return;
      if (prevLangRef.current === language) return;

      // Sync models to the new file set (adds/removes/relanguages).
      syncFileModels();

      isRemoteChangeRef.current = true;
      try {
        for (const file of effectiveFiles) {
          const yText = doc.getText(`file:${file.name}`);
          yTextsRef.current.set(file.name, yText);
          doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, file.defaultCode);
          }, "language-switch");
          const model = modelsRef.current.get(file.name);
          if (model && !model.isDisposed()) {
            monacoInstance.editor.setModelLanguage(model, file.monacoLanguage);
            model.setValue(file.defaultCode);
          }
        }
      } finally {
        isRemoteChangeRef.current = false;
      }

      const first = effectiveFiles[0]?.name ?? "";
      const firstModel = modelsRef.current.get(first);
      if (firstModel && !firstModel.isDisposed()) {
        if (editor.getModel() !== firstModel) editor.setModel(firstModel);
        activeFileRef.current = first;
        awarenessRef.current?.setLocalStateField("file", first);
        onCodeChange?.(firstModel.getValue(), first);
        onActiveFileChange?.(first);
      }
      prevLangRef.current = language;
    }, [language, effectiveFiles, syncFileModels, onCodeChange, onActiveFileChange]);

    // Apply read-only toggles live (settings drawer can change this anytime)
    useEffect(() => {
      editorRef.current?.updateOptions({ readOnly: isReadOnly });
    }, [isReadOnly]);

    // Sync awareness state when userName or userColor changes (e.g. after
    // the user renames themselves via the "Change Name" menu).
    useEffect(() => {
      const awareness = awarenessRef.current;
      if (!awareness) return;
      const current = awareness.getLocalState();
      if (current) {
        awareness.setLocalStateField("user", {
          ...(current as { user: { id: string; color: string } }).user,
          name: userName || "Anonymous",
        });
      }
    }, [userName]);

    // Expose imperative helpers (e.g. applying formatted code from the toolbar).
    // setCode/getCode target the visible file; getFileCode reads any file.
    useImperativeHandle(
      ref,
      () => ({
        setCode: (newCode: string) => {
          const active = activeFileRef.current;
          const model = active ? modelsRef.current.get(active) : undefined;
          const yText = active ? yTextsRef.current.get(active) : undefined;
          const doc = docRef.current;
          if (!model || model.isDisposed() || !yText || !doc) return;
          isRemoteChangeRef.current = true;
          model.setValue(newCode);
          isRemoteChangeRef.current = false;
          doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, newCode);
          }, "external");
          onCodeChange?.(newCode, activeFileRef.current);
        },
        getCode: () => {
          const active = activeFileRef.current;
          const model = active ? modelsRef.current.get(active) : undefined;
          return model && !model.isDisposed() ? model.getValue() : "";
        },
        getFileCode: (name: string) => {
          const model = modelsRef.current.get(name);
          if (model && !model.isDisposed()) return model.getValue();
          return yTextsRef.current.get(name)?.toString() ?? "";
        },
      }),
      [onCodeChange, ref]
    );

    // Handle theme change
    const getMonacoTheme = (themeValue: string) => {
      const themeMap: Record<string, string> = {
        "vs-dark": "vs-dark",
        light: "vs",
        "hc-black": "hc-black",
        "github-dark": "githubDarkDefault",
        "one-dark": "oneDark",
      };
      return themeMap[themeValue] || "vs-dark";
    };

    const tabActive =
      effectiveFiles.some((f) => f.name === activeFile) && activeFile
        ? activeFile
        : (effectiveFiles[0]?.name ?? "");
    const tabDefault =
      effectiveFiles.find((f) => f.name === tabActive) ?? effectiveFiles[0];

    return (
      <div className="relative h-full w-full flex flex-col">
        {/* File tabs (multi-file modes like Web) */}
        {effectiveFiles.length > 1 && (
          <div className="flex items-center gap-1 px-3 pt-2 bg-card overflow-x-auto shrink-0" role="tablist" aria-label="Files">
            {effectiveFiles.map((f) => {
              const isActive = f.name === tabActive;
              return (
                <button
                  key={f.name}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => switchToFile(f.name)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    isActive
                      ? "text-foreground border-accent bg-muted/40"
                      : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: f.name.endsWith(".css")
                        ? "#38bdf8"
                        : f.name.endsWith(".html")
                          ? "#f97316"
                          : "#22c55e",
                    }}
                  />
                  {f.name}
                </button>
              );
            })}
          </div>
        )}
        {/* Remote cursors overlay */}
        {activeUsers.length > 0 && (
          <div className="absolute bottom-12 left-3 z-20 flex items-center gap-2">
            {activeUsers.slice(0, 5).map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1 border border-border"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground"
                  style={{ backgroundColor: user.color }}
                >
                  {getUserInitials(user.name)}
                </div>
                <span style={{ color: user.color }}>{user.name}</span>
                {user.cursor && (
                  <span className="text-muted-foreground">
                    L:{user.cursor.line} C:{user.cursor.ch}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage={tabDefault?.monacoLanguage || "javascript"}
            defaultValue={
              tabDefault?.defaultCode ||
              "// Start coding here..."
            }
            theme={getMonacoTheme(theme)}
            onMount={handleEditorMount}
            loading={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
              </div>
            }
          />
        </div>
      </div>
    );
  }
);
