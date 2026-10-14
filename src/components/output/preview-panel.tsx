'use client';

import { MonitorPlay, RefreshCw, X, Eye } from "lucide-react";

interface PreviewPanelProps {
  html: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export function PreviewPanel({ html, onRefresh, onClose }: PreviewPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-card">
      {/* Preview header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center shrink-0">
            <MonitorPlay className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm font-medium text-foreground truncate">Preview</span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-full px-2 py-0.5 shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
            </span>
            Live
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Refresh preview"
            aria-label="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title="Close preview"
            aria-label="Close preview"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div className="flex-1 min-h-0 p-2">
        {html ? (
          <iframe
            key={html}
            title="Live preview"
            sandbox="allow-scripts"
            srcDoc={html}
            className="h-full w-full rounded-xl border border-border bg-white shadow-inner"
          />
        ) : (
          <div className="h-full w-full rounded-xl border border-dashed border-border flex flex-col items-center justify-center gap-2 text-center p-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground">Building preview…</p>
            <p className="text-xs text-muted-foreground">Your rendered output will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
