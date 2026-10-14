'use client';

import { useState } from "react";
import { Globe, Check } from "lucide-react";
import { LANGUAGES, getLanguage } from "@/lib/execute/languages";
import { cn } from "@/lib/utils/cn";

interface LanguageSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLang = getLanguage(value) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-muted/30 hover:bg-muted/50 rounded-md transition-all text-sm text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="hidden sm:inline">{selectedLang.label}</span>
        <span className="text-muted-foreground">▼</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
            {LANGUAGES.filter((lang) => !lang.hidden).map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  onChange(lang.name);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors text-foreground",
                  value === lang.name && "bg-accent/20"
                )}
              >
                <span>{lang.label}</span>
                {value === lang.name && (
                  <Check className="w-4 h-4 text-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
