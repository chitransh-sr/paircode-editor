'use client';

import { Loader2, Play } from "lucide-react";
import type { ExecutionResult } from "@/types/execution";
import SpecularCta from "@/components/specular-button/SpecularCta";

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
      {/* Toolbar-scale SpecularButton CTA: same fixed height as the neighboring
          controls (h-8) with inline padding so it slots into the toolbar row. */}
      <SpecularCta
        size="sm"
        className="h-8"
        style={{ padding: "0 12px" }}
        disabled={disabled || isExecuting || !code}
        onClick={handleClick}
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
      </SpecularCta>

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
