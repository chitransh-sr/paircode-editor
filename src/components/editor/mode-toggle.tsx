'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils/cn';

export function ModeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    // Render a placeholder to avoid hydration mismatch
    return (
      <button
        className="p-1.5 rounded-[4px] bg-accent text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Toggle light/dark mode"
        aria-label="Toggle light/dark mode"
      >
        <Sun className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "p-1.5 rounded-[4px] transition-all duration-200 border",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        theme === 'dark'
          ? 'bg-accent text-accent-foreground border-accent font-semibold'
          : 'text-muted-foreground hover:text-foreground border-foreground/15 hover:bg-foreground/[0.06]'
      )}
      title="Toggle light/dark mode"
      aria-label="Toggle light/dark mode"
      aria-pressed={theme === 'dark'}
    >
      {theme === 'dark' ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}
    </button>
  );
}
