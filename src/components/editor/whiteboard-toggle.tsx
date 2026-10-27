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
        "p-1.5 rounded-[4px] transition-all duration-200 border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        open
          ? 'bg-accent text-accent-foreground border-accent font-semibold'
          : 'text-muted-foreground hover:text-foreground border-foreground/15 hover:bg-foreground/[0.06]'
      )}
      title="Toggle whiteboard"
      aria-label="Toggle whiteboard"
      aria-pressed={open}
    >
      <Presentation className="w-4 h-4" />
    </button>
  );
}
