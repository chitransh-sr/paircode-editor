'use client';

import { useState, useEffect, useRef } from "react";
import { Terminal, Send, Trash2, Info, ChevronDown, ChevronUp } from "lucide-react";
import type { ExecutionResult } from "@/types/execution";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils/cn";
import SpecularCta from "@/components/specular-button/SpecularCta";

interface ConsolePanelProps {
  result: ExecutionResult | null;
  onStdinSubmit?: (input: string) => void;
  waitingForInput?: boolean;
  onClear?: () => void;
}

export function ConsolePanel({ result, onStdinSubmit, waitingForInput, onClear }: ConsolePanelProps) {
  const [input, setInput] = useState("");
  const [cleared, setCleared] = useState(false);

  // Accordion: collapsed by default on mobile (saves screen space),
  // open on desktop. The user's explicit choice sticks across resizes.
  const isMobile = useMobile();
  const [collapsed, setCollapsed] = useState(false);
  const touchedRef = useRef(false);
  useEffect(() => {
    if (!touchedRef.current) setCollapsed(isMobile);
  }, [isMobile]);
  const toggleCollapsed = () => {
    touchedRef.current = true;
    setCollapsed((c) => !c);
  };

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
    <div className={cn("bg-card border-t border-border flex flex-col shrink-0", collapsed ? "h-auto" : "h-48")}>
      {/* Console header (accordion toggle — whole row is tappable).
          Landing ShotFrame chrome: window dots + mono label. */}
      <div
        onClick={toggleCollapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand console" : "Collapse console"}
        className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0 cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15 shrink-0" />
          <span className="w-2.5 h-2.5 rounded-full bg-foreground/15 shrink-0" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-accent/60 shrink-0">
            <span aria-hidden className="absolute inset-0 rounded-full bg-accent/60 ping-ring opacity-70" />
          </span>
          <span className="ml-2 font-mono text-xs text-muted-foreground truncate">console</span>
          {result && "execution_time" in result && result.execution_time > 0 && (
            <span className="font-mono text-[11px] text-muted-foreground bg-foreground/[0.04] border border-foreground/10 px-2 py-0.5 shrink-0">
              {result.execution_time.toFixed(3)}s
            </span>
          )}
          {exitCode !== null && (
            <span
              className={cn(
                "font-mono text-[11px] font-medium px-2 py-0.5 shrink-0 border",
                exitCode === 0
                  ? "text-accent bg-accent/10 border-accent/20"
                  : "text-destructive bg-destructive/10 border-destructive/20"
              )}
            >
              Exit {exitCode}
            </span>
          )}
          {failed && (
            <span className="font-mono text-[11px] font-medium px-2 py-0.5 shrink-0 border text-destructive bg-destructive/10 border-destructive/20">
              Error
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="p-2 hover:bg-foreground/[0.06] hover:text-foreground rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Clear console"
            aria-label="Clear console"
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
          </button>
          {collapsed ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* Console output */}
      <div
        className={cn("flex-1 overflow-y-auto text-[13px] leading-relaxed p-3 text-foreground/80 font-mono", collapsed && "hidden")}
        style={{
          backgroundColor: "var(--color-background)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, 'Fira Code', monospace)",
        }}
      >
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center">
            <Terminal className="w-5 h-5 text-muted-foreground/50" />
            <p className="text-xs font-mono text-muted-foreground/70">Run your code to see output here</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-all">{getOutputContent()}</pre>
        )}
      </div>

      {/* STDIN input when waiting. overflow-clip: the Send specular's 24px
          glow bleed would add a phantom ~16px scroll range to the room's
          overflow-y-auto split container on mobile. */}
      {waitingForInput && !collapsed && (
        <div className="border-t border-border px-3 py-2 bg-background shrink-0 overflow-clip">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1.5">
            <Info className="w-3 h-3" />
            <span>Waiting for input...</span>
          </div>
          <form onSubmit={handleStdinSubmit} className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input..."
              className="flex-1 bg-foreground/[0.04] border border-foreground/10 rounded-[4px] px-2.5 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-accent/60 transition-colors"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleStdinSubmit(e);
                }
              }}
            />
            {/* Submit CTA in the accent specular language (primary action),
                form type=submit preserved; same h-8 scale as Run. */}
            <SpecularCta
              type="submit"
              variant="accent"
              size="sm"
              className="h-8 shrink-0"
              style={{ padding: "0 12px" }}
            >
              <Send className="w-3 h-3" />
              Send
            </SpecularCta>
          </form>
        </div>
      )}
    </div>
  );
}
