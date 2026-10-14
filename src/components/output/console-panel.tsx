'use client';

import { useState, useEffect } from "react";
import { Terminal, Send, Trash2, Info } from "lucide-react";
import type { ExecutionResult } from "@/types/execution";
import { cn } from "@/lib/utils/cn";

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

  const exitCode =
    result && "exit_code" in result && typeof result.exit_code === "number"
      ? result.exit_code
      : null;
  const failed = !!result && "success" in result && !result.success;

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
    <div className="bg-card border-t border-border h-48 flex flex-col shrink-0">
      {/* Console header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
            <Terminal className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">Console</span>
          {result && "execution_time" in result && result.execution_time > 0 && (
            <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5 shrink-0">
              {result.execution_time.toFixed(3)}s
            </span>
          )}
          {exitCode !== null && (
            <span
              className={cn(
                "text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0 border",
                exitCode === 0
                  ? "text-accent bg-accent/10 border-accent/20"
                  : "text-destructive bg-destructive/10 border-destructive/20"
              )}
            >
              Exit {exitCode}
            </span>
          )}
          {failed && (
            <span className="text-[11px] font-medium rounded-full px-2 py-0.5 shrink-0 border text-destructive bg-destructive/10 border-destructive/20">
              Error
            </span>
          )}
        </div>
        <button
          onClick={handleClear}
          className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Clear console"
          aria-label="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
        </button>
      </div>

      {/* Console output */}
      <div
        className="flex-1 overflow-y-auto text-[13px] leading-relaxed p-3 text-foreground/80"
        style={{
          backgroundColor: "var(--color-background)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, 'Fira Code', monospace)",
        }}
      >
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center">
            <Terminal className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">Run your code to see output here</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-all">{getOutputContent()}</pre>
        )}
      </div>

      {/* STDIN input when waiting */}
      {waitingForInput && (
        <div className="border-t border-border px-3 py-2 bg-background shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Info className="w-3 h-3" />
            <span>Waiting for input...</span>
          </div>
          <form onSubmit={handleStdinSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input..."
              className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent transition"
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
              className="px-3 py-1.5 bg-accent hover:bg-accent/90 text-accent-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
