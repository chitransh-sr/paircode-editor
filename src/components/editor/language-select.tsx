'use client';

import { useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
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
        aria-expanded={open}
        aria-label="Select language"
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 bg-foreground/[0.04] border border-foreground/10 hover:border-foreground/25 transition-colors text-xs font-mono text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="hidden sm:inline">{selectedLang.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-56 bg-popover border border-border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-[4px] z-20 max-h-80 overflow-y-auto p-1">
            {LANGUAGES.filter((lang) => !lang.hidden).map((lang) => (
              <button
                key={lang.id}
                onClick={() => {
                  onChange(lang.name);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.06]",
                  value === lang.name ? "text-accent" : "text-foreground"
                )}
              >
                <span className="font-mono text-[13px]">{lang.label}</span>
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
