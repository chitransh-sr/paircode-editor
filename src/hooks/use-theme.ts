'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'theme';
const FALLBACK: Theme = 'dark';

/**
 * Theme store — a module-level singleton shared by every useTheme() caller.
 * The hook used to keep per-consumer state, so each component held its own
 * copy that only ever synced on mount: clicking <ModeToggle/> updated the
 * `.dark` class but left other consumers (e.g. the <SpecularCta/> palettes)
 * on a stale theme. All reads/writes now go through one store.
 */

let snapshot: Theme | undefined;
const listeners = new Set<() => void>();

function computeTheme(): Theme {
  if (typeof window === 'undefined') return FALLBACK;
  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return stored || (prefersDark ? 'dark' : 'light');
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// getSnapshot: lazily resolves once, then serves the cached store value.
function getTheme(): Theme {
  if (snapshot === undefined) snapshot = computeTheme();
  return snapshot;
}

// Server snapshot must match the previous hook's initial state ('dark')
// so SSR output and the hydration pass are unchanged.
function getServerTheme(): Theme {
  return FALLBACK;
}

function applyTheme(next: Theme) {
  snapshot = next;
  document.documentElement.classList.toggle('dark', next === 'dark');
  localStorage.setItem(THEME_KEY, next);
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  // Start from the server snapshot ('dark') so the first client render
  // matches SSR HTML; the real preference re-syncs right after hydration.
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);

  // Kept from the original hook: callers render placeholders until mount
  // to avoid hydration mismatches for preference-driven UI.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Also from the original hook: layout hardcodes `dark` on <html> so SSR
  // output is dark; light users get the class corrected here on mount
  // (idempotent — every consumer resolves the same store value).
  useEffect(() => {
    document.documentElement.classList.toggle('dark', getTheme() === 'dark');
  }, []);

  const toggleTheme = useCallback(() => {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }, []);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
  }, []);

  return { theme, toggleTheme, setTheme, mounted };
}
