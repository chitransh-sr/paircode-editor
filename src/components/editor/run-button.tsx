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
          "px-3 py-1.5 rounded-md font-medium text-sm transition-all",
          "flex items-center gap-2",
          disabled || isExecuting || !code
            ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
            : "bg-accent hover:bg-accent/90 text-accent-foreground shadow-md hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        )}
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Running...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
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
      <span className="text-xs text-destructive-foreground bg-destructive/30 px-2 py-0.5 rounded">
        Error
      </span>
    );
  }
  if (result.exit_code === 0) {
    return (
      <span className="text-xs text-accent bg-accent/20 px-2 py-0.5 rounded">
        Exit 0
      </span>
    );
  }
  if (result.exit_code) {
    return (
      <span className="text-xs text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded">
        Exit {result.exit_code}
      </span>
    );
  }
  return null;
}
