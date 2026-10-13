'use client';

import { MonitorPlay, RefreshCw, X } from "lucide-react";

interface PreviewPanelProps {
  html: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export function PreviewPanel({ html, onRefresh, onClose }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      {/* Preview header */}
      <div className="flex items-center justify-between bg-muted px-3 py-1.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <MonitorPlay className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">Preview</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            className="p-1 hover:bg-muted/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Refresh preview"
            aria-label="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted/80 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Close preview"
            aria-label="Close preview"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <iframe
        key={html ?? "empty"}
        title="Live preview"
        sandbox="allow-scripts"
        srcDoc={html ?? ""}
        className="flex-1 w-full min-h-0 border-0 bg-white"
      />
    </div>
  );
}
