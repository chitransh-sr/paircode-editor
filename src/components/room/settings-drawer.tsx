'use client';

import { X, Globe, Palette, Moon, Lock, Keyboard, SlidersHorizontal } from "lucide-react";
import { LanguageSelect } from "@/components/editor/language-select";
import { ThemeToggle } from "@/components/editor/theme-toggle";
import { ModeToggle } from "@/components/editor/mode-toggle";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils/cn";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  language: string;
  theme: string;
  isReadOnly: boolean;
  /** Whether this browser owns the room. Candidates get a locked view. */
  canManage?: boolean;
  onLanguageChange: (lang: string) => void;
  onThemeChange: (theme: string) => void;
  onReadOnlyChange: (readOnly: boolean) => void;
}

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["Ctrl/Cmd", "S"], action: "Save snapshot" },
  { keys: ["Ctrl/Cmd", "/"], action: "Toggle comment" },
  { keys: ["Ctrl/Cmd", "Space"], action: "Autocomplete" },
  { keys: ["F11"], action: "Fullscreen editor" },
];

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

export function SettingsDrawer({
  open,
  onClose,
  language,
  theme,
  isReadOnly,
  canManage = false,
  onLanguageChange,
  onThemeChange,
  onReadOnlyChange,
}: SettingsDrawerProps) {
  const { theme: appTheme } = useTheme();
  // Candidates may switch language/theme unless the room is read-only
  // (view-only); the read-only flag itself stays owner-only.
  const locked = isReadOnly && !canManage;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-80 sm:w-[360px] bg-card border-l border-border z-50 shadow-2xl",
          "transform transition-transform duration-300 ease-in-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <SectionIcon>
              <SlidersHorizontal className="w-4 h-4 text-accent" />
            </SectionIcon>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground leading-tight">Room Settings</h2>
              <p className="text-xs text-muted-foreground">Customize this interview room</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted/80 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Close settings"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {locked && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Read-only mode is on — only the interviewer can change settings.
              </p>
            </div>
          )}

          {/* Language */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <SectionIcon>
                <Globe className="w-4 h-4 text-accent" />
              </SectionIcon>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Language</p>
                <p className="text-xs text-muted-foreground">Shared by everyone in the room</p>
              </div>
            </div>
            <LanguageSelect
              value={language}
              onChange={onLanguageChange}
              disabled={locked}
            />
          </div>

          {/* Editor theme */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <SectionIcon>
                <Palette className="w-4 h-4 text-accent" />
              </SectionIcon>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Editor Theme</p>
                <p className="text-xs text-muted-foreground">Pick how code looks for everyone</p>
              </div>
            </div>
            <ThemeToggle
              theme={theme}
              onChange={onThemeChange}
              disabled={locked}
              layout="grid"
            />
          </div>

          {/* UI theme */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SectionIcon>
                  <Moon className="w-4 h-4 text-accent" />
                </SectionIcon>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Interface Theme</p>
                  <p className="text-xs text-muted-foreground">
                    Current: {appTheme === "dark" ? "Night" : "Day"} mode · this device only
                  </p>
                </div>
              </div>
              <ModeToggle />
            </div>
          </div>

          {/* Read-only */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SectionIcon>
                  <Lock className="w-4 h-4 text-accent" />
                </SectionIcon>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Read-only mode</p>
                  <p className="text-xs text-muted-foreground">Candidates can view but not edit</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isReadOnly}
                aria-label="Read-only mode"
                disabled={!canManage}
                onClick={() => onReadOnlyChange(!isReadOnly)}
                className={cn(
                  "relative w-11 h-6 rounded-full transition-colors shrink-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isReadOnly ? "bg-accent" : "bg-muted",
                  !canManage && "opacity-50 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    isReadOnly && "translate-x-5"
                  )}
                />
              </button>
            </div>
            {!canManage && (
              <p className="text-xs text-muted-foreground mt-2">
                Only the interviewer can change this setting.
              </p>
            )}
          </div>

          {/* Shortcuts */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <SectionIcon>
                <Keyboard className="w-4 h-4 text-accent" />
              </SectionIcon>
              <p className="text-sm font-medium text-foreground">Keyboard Shortcuts</p>
            </div>
            <div className="space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.action} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{s.action}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-1.5 py-0.5 rounded-md border border-border bg-background font-mono text-[11px] text-foreground"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
