'use client';

import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ThemeToggleProps {
  theme: string;
  onChange: (theme: string) => void;
  themes?: { value: string; label: string }[];
  disabled?: boolean;
  /** "strip" (compact header pill row) or "grid" (premium tiles for the settings drawer). */
  layout?: "strip" | "grid";
}

const THEMES = [
  { value: "vs-dark", label: "VS Dark" },
  { value: "light", label: "Light" },
  { value: "hc-black", label: "High Contrast" },
  { value: "github-dark", label: "GitHub Dark" },
  { value: "one-dark", label: "One Dark" },
];

/** Mini editor-preview background per theme value. */
const THEME_SWATCH: Record<string, string> = {
  "vs-dark": "#1e1e1e",
  light: "#ffffff",
  "hc-black": "#000000",
  "github-dark": "#0d1117",
  "one-dark": "#282c34",
};

export function ThemeToggle({ theme, onChange, themes = THEMES, disabled, layout = "strip" }: ThemeToggleProps) {
  if (layout === "grid") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {themes.map((t) => {
          const active = theme === t.value;
          return (
            <button
              key={t.value}
              onClick={() => !disabled && onChange(t.value)}
              disabled={disabled}
              className={cn(
                "rounded-xl border p-2 text-left transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                active
                  ? "border-accent bg-accent/10 ring-1 ring-accent"
                  : "border-border hover:border-accent/50 hover:bg-muted/30",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              title={t.label}
            >
              <div
                className="h-11 rounded-lg mb-2 flex flex-col justify-center gap-1 px-2.5 border border-black/20"
                style={{ backgroundColor: THEME_SWATCH[t.value] ?? "#1e1e1e" }}
              >
                <div className="h-1 w-3/4 rounded-full bg-[#22c55e]/80" />
                <div className="h-1 w-1/2 rounded-full bg-[#60a5fa]/80" />
                <div className="h-1 w-2/3 rounded-full bg-[#f59e0b]/80" />
              </div>
              <div className="flex items-center justify-between px-0.5">
                <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {t.label}
                </span>
                {active && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-md p-1">
      <Palette className="w-4 h-4 text-muted-foreground ml-1" />
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => !disabled && onChange(t.value)}
          disabled={disabled}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            disabled
              ? "cursor-not-allowed opacity-50"
              : theme === t.value
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
