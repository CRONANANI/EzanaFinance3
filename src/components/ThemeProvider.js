'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const COOKIE_NAME = 'ezana.theme';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Apply theme classes/styles to <html> and <body> immediately. */
function applyTheme(theme) {
  const root = document.documentElement;
  const body = document.body;
  root.style.colorScheme = 'light';
  if (theme === 'light') {
    root.classList.add('light-mode');
    if (body) body.classList.add('light-mode');
    root.classList.remove('dark');
    root.style.backgroundColor = '';
    if (body) body.style.backgroundColor = '';
  } else {
    root.classList.remove('light-mode');
    if (body) body.classList.remove('light-mode');
    root.classList.add('dark');
    root.style.backgroundColor = '#0a0e13';
    if (body) body.style.backgroundColor = '#0a0e13';
  }
}

function writeThemeCookie(theme) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${secure}`;
}

function persistToServer(theme) {
  if (typeof fetch === 'undefined') return;
  // Fire-and-forget; non-fatal on failure (cookie already set).
  fetch('/api/user/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ theme }),
    keepalive: true,
  }).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ThemeProvider] persist failed:', err);
    }
  });
}

/**
 * ThemeProvider — single source of truth for the app theme.
 *
 * The initial value is resolved SERVER-SIDE by `getServerTheme()` (root layout)
 * and passed in here as `initialTheme`. That eliminates the "split theme" flash
 * where the nav renders dark while the content renders light on first paint.
 *
 * `setTheme(next, { persist })`:
 *   - persist: true  → writes the `ezana.theme` cookie + PATCHes the server so
 *                      the preference survives reloads, logouts, and logins
 *                      from other devices. Used by the Settings → Appearance
 *                      Save flow.
 *   - persist: false → visual-only. Used by temporary route overrides
 *                      (landing page forces light, market-analysis forces dark).
 *                      These must NOT overwrite the user's saved preference.
 */
export function ThemeProvider({ initialTheme = 'light', children }) {
  const safeInitial = initialTheme === 'dark' ? 'dark' : 'light';
  const [theme, setThemeState] = useState(safeInitial);

  // Keep <html>/<body> in sync whenever the theme changes at runtime.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next, options = {}) => {
    const normalized = next === 'dark' ? 'dark' : 'light';
    const { persist = false } = options;
    setThemeState(normalized);
    if (persist) {
      writeThemeCookie(normalized);
      persistToServer(normalized);
    }
  }, []);

  /* toggleTheme is user-initiated (the sun/moon button in Settings) so it
     persists by default. Other programmatic callers can opt out with
     setTheme(next, { persist: false }). */
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      writeThemeCookie(next);
      persistToServer(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Keep a forgiving return in case something renders outside the provider
    // (e.g., an error boundary). Matches the pre-existing API.
    return { theme: 'light', setTheme: () => {}, toggleTheme: () => {} };
  }
  return ctx;
}
