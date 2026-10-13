'use client';

import { X } from "lucide-react";
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
  onLanguageChange: (lang: string) => void;
  onThemeChange: (theme: string) => void;
  onReadOnlyChange: (readOnly: boolean) => void;
}

export function SettingsDrawer({
  open,
  onClose,
  language,
  theme,
  isReadOnly,
  onLanguageChange,
  onThemeChange,
  onReadOnlyChange,
}: SettingsDrawerProps) {
  const { theme: appTheme } = useTheme();

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-80 bg-card border-l border-border z-50",
          "transform transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Room Settings</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted/80 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              title="Close settings"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Language</label>
            <LanguageSelect
              value={language}
              onChange={onLanguageChange}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Editor Theme</label>
            <ThemeToggle
              theme={theme}
              onChange={onThemeChange}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center justify-between">
              <span>UI Theme (Day/Night)</span>
              <ModeToggle />
            </label>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {appTheme === 'dark' ? 'Night' : 'Day'} mode
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isReadOnly}
                onChange={(e) => onReadOnlyChange(e.target.checked)}
                className="w-4 h-4 rounded bg-background text-accent focus:ring-accent border-border"
              />
              <span className="text-sm text-foreground">Read-only mode (candidates can view only)</span>
            </label>
          </div>

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-foreground mb-2">Keyboard Shortcuts</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Ctrl/Cmd + S - Save snapshot</div>
              <div>Ctrl/Cmd + / - Toggle comment</div>
              <div>Ctrl/Cmd + Space - Autocomplete</div>
              <div>F11 - Fullscreen editor</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
