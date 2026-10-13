'use client';

import { Palette } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  theme: string;
  onChange: (theme: string) => void;
  themes?: { value: string; label: string }[];
}

const THEMES = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "light", label: "Light" },
  { value: "hc-black", label: "High Contrast" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "one-dark", label: "One Dark" },
];

export function ThemeToggle({ theme, onChange, themes = THEMES }: ThemeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-1">
      <Palette className="w-4 h-4 text-muted-foreground ml-1" />
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            theme === t.value
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
          )}
          title={t.label}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
