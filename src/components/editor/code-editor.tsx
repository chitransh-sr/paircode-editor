'use client';

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
// y-monaco's MonacoBinding would sync text and render cursors, but its deep
// import path ('monaco-editor/esm/.../editor.api.js') doesn't resolve under
// Turbopack. Instead, we implement the same logic directly:
//  1. Text sync via doc.on("update") + monacoModel.onDidChangeContent()
//  2. Cursor tracking via Y.createRelativePosition → awareness
//  3. Remote cursor rendering via monaco editor deltaDecorations()
import * as monaco from "monaco-editor";
import { getLanguage } from "@/lib/execute/languages";
import { getUserColor, getUserInitials } from "@/lib/presence/colors";
import { getWsUrl } from "@/lib/yjs/ws-client";
import type { UserPresence } from "@/types/presence";

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
  onNameChange?: (name: string) => void;
  onCodeChange?: (code: string) => void;
  onPresenceChange?: (users: UserPresence[]) => void;
}

export interface CodeEditorHandle {
  /** Replace the entire editor content (syncs Yjs + notifies parent). */
  setCode: (code: string) => void;
  getCode: () => string;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      language,
      theme = "vs-dark",
      isReadOnly = false,
      userName = "",
      userColor = "",
      onNameChange,
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
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);

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
        const yText = doc.getText("monaco");
        const awareness = provider.awareness;
        awarenessRef.current = awareness;

        // Local user profile (for presence display)
        awareness.setLocalState({
          user: {
            id: `user-${Date.now()}`,
            name: userName || "Anonymous",
            color: localStorage.getItem("editor-user-color") || getUserColor(Math.floor(Math.random() * 12)),
          },
        });

        const monacoModel = editor.getModel();
        const initialCode = yText.toString();

        /** Convert a Monaco position to a Yjs relative position. */
        const posToRelative = (pos: monaco.IPosition): Y.RelativePosition | null => {
          if (!pos || !monacoModel) return null;
          const index = monacoModel.getOffsetAt(pos);
          return Y.createRelativePositionFromTypeIndex(yText, index, 0);
        };

        /** Convert a Yjs absolute position to a Monaco position. */
        const absToMonaco = (abs: Y.AbsolutePosition | null): monaco.IPosition | null => {
          if (!abs || !monacoModel) return null;
          const offset = Math.min(abs.index, monacoModel.getValueLength());
          return monacoModel.getPositionAt(offset);
        };

        // Awareness change handler — updates user list and renders remote cursors
        const handleAwarenessChange = () => {
          if (!awarenessRef.current || !monacoModel) return;

          const states = awarenessRef.current.getStates() as Map<
            number,
            {
              user: { id: string; name: string; color: string };
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
            if (state.selection?.anchor && state.selection?.head) {
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
              state.selection?.head
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

          // Apply remote cursor decorations to the Monaco editor
          if (decorations.length > 0) {
            const ids = monacoModel.deltaDecorations(
              decorationIdsRef.current || [],
              decorations
            );
            decorationIdsRef.current = ids;
          } else if (decorationIdsRef.current && decorationIdsRef.current.length > 0) {
            // All remote users disconnected — clear decorations
            monacoModel.deltaDecorations(decorationIdsRef.current, []);
            decorationIdsRef.current = null;
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
          monacoInstance.editor.setModelLanguage(monacoModel, language || "javascript");

          // Initial code: from the shared Yjs doc (other users typed) or default
          if (initialCode) {
            isRemoteChangeRef.current = true;
            editor.setValue(initialCode);
            isRemoteChangeRef.current = false;
          } else {
            const langMeta = getLanguage(language);
            if (langMeta) {
              yText.insert(0, langMeta.defaultCode);
            }
          }

          onCodeChange?.(editor.getValue());

          // Bidirectional text sync: Yjs → Monaco
          doc.on("update", (_update: Uint8Array, origin: unknown) => {
            if (origin === "monaco" || isRemoteChangeRef.current) return;

            isRemoteChangeRef.current = true;
            const newCode = yText.toString();
            if (newCode !== editor.getValue()) {
              editor.setValue(newCode);
              onCodeChange?.(newCode);
            }
            isRemoteChangeRef.current = false;
          });

          // Monaco → Yjs
          monacoModel.onDidChangeContent(() => {
            if (isRemoteChangeRef.current) return;
            const newCode = editor.getValue();
            if (newCode !== yText.toString()) {
              doc.transact(() => {
                yText.delete(0, yText.length);
                yText.insert(0, newCode);
              }, "monaco");
              onCodeChange?.(newCode);
            }
          });

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

        // Listen for awareness changes (other users join/leave/update)
        awareness.on("change", handleAwarenessChange);
        handleAwarenessChange();

        docRef.current = doc;

        return () => {
          if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
          awareness.off("change", handleAwarenessChange);
          awareness.destroy();
          provider.destroy();
          doc.destroy();
        };
      },
      [language, userName, onCodeChange, onPresenceChange]
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

    // Handle language change — update syntax highlighting AND reset code
    // to the new language's default. Since language is a room-level setting,
    // switching languages always replaces the shared document content so all
    // collaborators see the new starter code (matching the original key-change
    // remount behavior).
    useEffect(() => {
      if (!editorRef.current || !monacoRef.current) return;

      const model = editorRef.current.getModel();
      if (!model) return;

      // Always update the syntax highlighting language
      const monacoLang = getLanguage(language)?.monacoLanguage || "javascript";
      monacoRef.current.editor.setModelLanguage(model, monacoLang);

      // Reset code to the new language's default on language switch
      const prevLang = prevLangRef.current;
      if (prevLang !== language) {
        const nextDefault = getLanguage(language)?.defaultCode ?? "";
        isRemoteChangeRef.current = true;
        editorRef.current.setValue(nextDefault);
        isRemoteChangeRef.current = false;

        const doc = docRef.current;
        if (doc) {
          const yText = doc.getText("monaco");
          doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, nextDefault);
          }, "language-switch");
        }

        onCodeChange?.(nextDefault);
        prevLangRef.current = language;
      }
    }, [language, onCodeChange]);

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

    // Expose imperative helpers (e.g. applying formatted code from the toolbar)
    useImperativeHandle(
      ref,
      () => ({
        setCode: (newCode: string) => {
          const editor = editorRef.current;
          if (!editor) return;
          isRemoteChangeRef.current = true;
          editor.setValue(newCode);
          isRemoteChangeRef.current = false;
          const doc = docRef.current;
          if (doc) {
            const yText = doc.getText("monaco");
            doc.transact(() => {
              yText.delete(0, yText.length);
              yText.insert(0, newCode);
            }, "external");
          }
          onCodeChange?.(newCode);
        },
        getCode: () => editorRef.current?.getValue() ?? "",
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

    // Handle user name save
    const handleSetName = () => {
      const input = prompt("Enter your name:", userName || "");
      if (input) {
        const name = input.trim().slice(0, 20);
        onNameChange?.(name);
      }
      setShowUserMenu(false);
    };

    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Fallback for non-secure contexts: prompt with the URL selected
        window.prompt("Copy room link:", window.location.href);
      }
      setShowUserMenu(false);
    };

    // Get user color for current user badge (prop keeps SSR/first render identical)
    const badgeColor = userColor || "#22C55E";

    return (
      <div className="relative h-full w-full">
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
            <span className="w-2 h-2 bg-accent rounded-full" />
            <span className="text-muted-foreground">99.9% Uptime</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 bg-muted hover:bg-muted/80 rounded-md px-3 py-1.5 transition-all text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground"
                style={{ backgroundColor: userColor }}
              >
                {getUserInitials(userName || "")}
              </div>
              <span className="hidden sm:inline">{userName || "You"}</span>
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-48 bg-card rounded-md shadow-lg border border-border z-30">
                  <button
                    onClick={handleSetName}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>Change Name</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>Copy Room Link</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

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

        <Editor
          height="100%"
          defaultLanguage={getLanguage(language)?.monacoLanguage || "javascript"}
          defaultValue={
            getLanguage(language)?.defaultCode ||
            "// Start coding here..."
          }
          theme={getMonacoTheme(theme)}
          onMount={handleEditorMount}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          }
          onChange={(value) => {
            onCodeChange?.(value || "");
          }}
        />
      </div>
    );
  }
);
