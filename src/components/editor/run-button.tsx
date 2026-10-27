'use client';

import { Loader2, Play } from "lucide-react";
import type { ExecutionResult } from "@/types/execution";
import { cn } from "@/lib/utils/cn";

interface RunButtonProps {
  code: string;
  isExecuting: boolean;
  result: ExecutionResult | null;
  onExecute: () => Promise<void>;
  disabled?: boolean;
}

export function RunButton({ code, isExecuting, result, onExecute, disabled }: RunButtonProps) {
  const handleClick = () => {
    if (!code || isExecuting) return;
    onExecute();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isExecuting || !code}
        className={cn(
          "px-3 py-1.5 rounded-[4px] font-semibold text-sm transition-all active:scale-[0.96]",
          "flex items-center gap-2",
          disabled || isExecuting || !code
            ? "opacity-50 cursor-not-allowed bg-foreground/[0.06] border border-foreground/10 text-muted-foreground"
            : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_0_20px_-6px_rgba(34,197,94,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Running...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            <span className="hidden sm:inline">Run</span>
          </>
        )}
      </button>

      {result && <ExecutionResultBadge result={result} />}
    </div>
  );
}

function ExecutionResultBadge({ result }: { result: ExecutionResult }) {
  if (!result.success) {
    return (
      <span className="text-[11px] font-mono text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded-[4px]">
        Error
      </span>
    );
  }
  if (result.exit_code === 0) {
    return (
      <span className="text-[11px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-[4px]">
        Exit 0
      </span>
    );
  }
  if (result.exit_code) {
    return (
      <span className="text-[11px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-[4px]">
        Exit {result.exit_code}
      </span>
    );
  }
  return null;
}
