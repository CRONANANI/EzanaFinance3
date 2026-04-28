'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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
 *                      (market-analysis forces dark). These must NOT overwrite
 *                      the user's saved preference.
 *
 * Marketing surfaces (`/`, `/pricing`, `/help-center`) are brand-locked dark at
 * the DOM level: we always apply the dark HTML/body treatment there while
 * leaving React `theme` state unchanged so dashboard pages still reflect the
 * user's preference after navigation. `/auth/*` is excluded so login/signup
 * keep the user's chosen theme.
 */
function isMarketingBrandLockedDarkPath(pathname) {
  if (!pathname) return false;
  if (pathname === '/') return true;
  if (pathname.startsWith('/pricing')) return true;
  if (pathname.startsWith('/help-center')) return true;
  return false;
}

export function ThemeProvider({ initialTheme = 'light', children }) {
  const pathname = usePathname();
  const safeInitial = initialTheme === 'dark' ? 'dark' : 'light';
  const [theme, setThemeState] = useState(safeInitial);

  // Keep <html>/<body> in sync whenever the theme or route changes.
  useEffect(() => {
    if (isMarketingBrandLockedDarkPath(pathname)) {
      applyTheme('dark');
      return;
    }
    applyTheme(theme);
  }, [theme, pathname]);

  /* Sync the ezana.theme cookie to the server-resolved theme on every
     hydration. This eliminates the "stale cookie" trap that caused the
     black-frame-around-light-content bug on fresh login:

     Before the fix, an anonymous visitor could leave a dark cookie
     behind, then sign in to an account that has theme=light in the DB.
     The server would correctly render light mode, but the blocking head
     script (on the next navigation or reload) would read the old dark
     cookie and strip `light-mode` off <html>/<body>, yielding a
     dark nav + dark body padding wrapping a light content area.

     Writing the cookie here after every mount guarantees the cookie
     always reflects the authoritative server value, so the blocking
     script can never disagree with the server again. Cheap (string
     write), idempotent, and crucially runs even on first-load hydration
     before the user ever touches the theme toggle. */
  useEffect(() => {
    writeThemeCookie(safeInitial);
    // Intentional: only on mount. Later toggles persist via setTheme/toggleTheme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
