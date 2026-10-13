'use client';

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import * as monaco from "monaco-editor";
import { getLanguage } from "@/lib/execute/languages";
import { getUserColor, getUserInitials } from "@/lib/presence/colors";
import type { UserPresence } from "@/types/presence";

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
  const awarenessRef = useRef<Awareness | null>(null);
  const isRemoteChangeRef = useRef(false);
  const cursorDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);

  // Yjs manual binding to Monaco
  const setupYjsBinding = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco, doc: Y.Doc) => {
      const yText = doc.getText("monaco");
      const awareness = new Awareness(doc);
      awarenessRef.current = awareness;

      // Set up local awareness state
      awareness.setLocalState({
        user: {
          id: `user-${Date.now()}`,
          name: userName || "Anonymous",
          color: localStorage.getItem("editor-user-color") || getUserColor(Math.floor(Math.random() * 12)),
        },
      });

      // Initial sync: apply Yjs content to Monaco
      const initialCode = yText.toString();
      const monacoModel = editor.getModel();

      // Awareness change handler (declared outside the if block for proper cleanup)
      const handleAwarenessChange = () => {
        if (!awarenessRef.current) return;

        const states = awarenessRef.current.getStates() as Map<
          number,
          {
            user: { id: string; name: string; color: string };
            cursor?: { line: number; ch: number };
            selection?: { anchor: { line: number; ch: number }; head: { line: number; ch: number } };
          }
        >;

        const users: UserPresence[] = [];
        states.forEach((state, clientId) => {
          if (clientId === awarenessRef.current?.clientID || !state?.user) return;

          const user: UserPresence = {
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            cursor: state.cursor ? { line: state.cursor.line, ch: state.cursor.ch } : undefined,
            selection: state.selection
              ? {
                  anchor: { line: state.selection.anchor.line, ch: state.selection.anchor.ch },
                  head: { line: state.selection.head.line, ch: state.selection.head.ch },
                }
              : undefined,
            lastActive: new Date().toISOString(),
          };
          users.push(user);
        });

        setActiveUsers(users);
        onPresenceChange?.(users);
      };

      if (monacoModel) {
        // Set language
        monacoInstance.editor.setModelLanguage(monacoModel, language || "javascript");

        // Apply initial code if exists
        if (initialCode) {
          isRemoteChangeRef.current = true;
          editor.setValue(initialCode);
          isRemoteChangeRef.current = false;
        } else {
          // Set default code
          const langMeta = getLanguage(language);
          if (langMeta) {
            const defaultCode = langMeta.defaultCode;
            yText.insert(0, defaultCode);
          }
        }

        // Report the actual editor content so Run works without typing first
        onCodeChange?.(editor.getValue());

        // Listen to Yjs changes and apply to Monaco
        doc.on("update", (_update: Uint8Array, origin: unknown) => {
          if (origin === "monaco" || isRemoteChangeRef.current) return;

          isRemoteChangeRef.current = true;
          const newCode = yText.toString();
          const currentValue = editor.getValue();
          if (newCode !== currentValue) {
            editor.setValue(newCode);
            onCodeChange?.(newCode);
          }
          isRemoteChangeRef.current = false;
        });

        // Listen to Monaco changes and apply to Yjs
        monacoModel.onDidChangeContent(() => {
          if (isRemoteChangeRef.current) return;

          const newCode = editor.getValue();
          const yTextContent = yText.toString();

          if (newCode !== yTextContent) {
            // Apply diff to Yjs document
            doc.transact(() => {
              yText.delete(0, yText.length);
              yText.insert(0, newCode);
            }, "monaco");

            onCodeChange?.(newCode);
          }
        });
      }

      // Set up cursor tracking
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
          awarenessRef.current.setLocalStateField("selection", {
            anchor: { line: selection.startLineNumber, ch: selection.startColumn },
            head: { line: selection.endLineNumber, ch: selection.endColumn },
          });
        }
      });

      // Listen for awareness changes (other users)
      awareness.on("change", handleAwarenessChange);
      handleAwarenessChange();

      docRef.current = doc;

      return () => {
        if (cursorDebounceRef.current) clearTimeout(cursorDebounceRef.current);
        awareness.off("change", handleAwarenessChange);
        awareness.destroy();
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

      // Create Yjs document
      const doc = new Y.Doc();

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

      const cleanup = setupYjsBinding(editor, monacoInstance, doc);

      return cleanup;
    },
    [isReadOnly, setupYjsBinding]
  );

  // Handle language change
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        const monacoLang = getLanguage(language)?.monacoLanguage || "javascript";
        monacoRef.current.editor.setModelLanguage(model, monacoLang);
      }
    }
  }, [language]);

  // Apply read-only toggles live (settings drawer can change this anytime)
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: isReadOnly });
  }, [isReadOnly]);

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
      light: "light",
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
