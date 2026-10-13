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
        className="p-1.5 bg-accent rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        title="Toggle light/dark mode"
        aria-label="Toggle light/dark mode"
      >
        <Sun className="w-4 h-4 text-accent-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "p-1.5 rounded-md transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        theme === 'dark'
          ? 'bg-accent text-accent-foreground'
          : 'bg-muted text-foreground hover:bg-muted/80'
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
