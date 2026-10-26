'use client';

import { Presentation } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface WhiteboardToggleProps {
  /** Whether the whiteboard overlay is currently open. */
  open: boolean;
  onToggle: () => void;
}

/**
 * Header button that toggles the whiteboard on/off. Sits directly to the
 * right of the light/dark (day/night) mode toggle in the room header.
 */
export function WhiteboardToggle({ open, onToggle }: WhiteboardToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "p-1.5 rounded-md transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        open
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-foreground hover:bg-muted/80'
      )}
      title="Toggle whiteboard"
      aria-label="Toggle whiteboard"
      aria-pressed={open}
    >
      <Presentation className="w-4 h-4" />
    </button>
  );
}
