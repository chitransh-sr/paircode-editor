'use client';

import { useState, useEffect } from "react";
import { Terminal, Send, Trash2, Info } from "lucide-react";
import type { ExecutionResult } from "@/types/execution";

interface ConsolePanelProps {
  result: ExecutionResult | null;
  onStdinSubmit?: (input: string) => void;
  waitingForInput?: boolean;
  onClear?: () => void;
}

export function ConsolePanel({ result, onStdinSubmit, waitingForInput, onClear }: ConsolePanelProps) {
  const [input, setInput] = useState("");
  const [cleared, setCleared] = useState(false);

  // When result changes, reset cleared state
  useEffect(() => {
    setCleared(false);
  }, [result]);

  const handleClear = () => {
    setCleared(true);
    onClear?.();
  };

  useEffect(() => {
    // Focus input when waiting for stdin
  }, [waitingForInput]);

  const handleStdinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && onStdinSubmit) {
      onStdinSubmit(input);
      setInput("");
    }
  };

  const getOutputContent = () => {
    if (!result) {
      return "Console output will appear here...\n";
    }

    if ("success" in result && !result.success) {
      return `Error: ${result.error}\n`;
    }

    if ("stdout" in result) {
      if (cleared) {
        return "";
      }
      let content = "";
      if (result.stdout) content += result.stdout;
      if (result.stderr) content += `\n${result.stderr}`;
      if (result.exit_code === 0) {
        content += "\n\nProcess completed successfully";
      } else {
        content += `\n\nProcess exited with code ${result.exit_code}`;
      }
      if (result.execution_time) {
        content += ` (${result.execution_time.toFixed(3)}s)`;
      }
      return content;
    }

    return "";
  };

  return (
    <div className="bg-card border-t border-border h-48 flex flex-col">
      {/* Console header */}
      <div className="flex items-center justify-between bg-muted px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Console</span>
          {result && "execution_time" in result && result.execution_time > 0 && (
            <span className="text-xs text-muted-foreground">
              {result.execution_time.toFixed(3)}s
            </span>
          )}
        </div>
        <button
          onClick={handleClear}
          className="p-1 hover:bg-muted/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Console output */}
      <div
        className="flex-1 overflow-y-auto font-mono text-sm p-3 text-foreground/80"
        style={{
          backgroundColor: "var(--color-background)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, 'Fira Code', monospace)",
        }}
      >
        <pre className="whitespace-pre-wrap break-all">{getOutputContent()}</pre>
      </div>

      {/* STDIN input when waiting */}
      {waitingForInput && (
        <div className="border-t border-border px-3 py-2 bg-background">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Info className="w-3 h-3" />
            <span>Waiting for input...</span>
          </div>
          <form onSubmit={handleStdinSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input..."
              className="flex-1 bg-background border border-border rounded px-2 py-1 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleStdinSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              className="px-3 py-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Send className="w-3 h-3" />
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
