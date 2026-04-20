'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/components/ThemeProvider';

/** This route is designed for dark UI; always use dark theme while it is active. */
const MARKET_ANALYSIS_PREFIX = '/market-analysis';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const settingsApi = useSettings();

  return (
    <SettingsContext.Provider value={settingsApi}>
      <ThemeSyncFromSettings />
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Keeps the live <html> theme in sync with route overrides and the user's
 * saved preference — WITHOUT stomping on the SSR-resolved initial theme
 * during the first render (the root cause of the split-theme flash).
 *
 * Rules:
 *   - If still loading settings → do nothing. The server has already applied
 *     the correct class to <html>; we must not touch it until we have real
 *     data, otherwise we would race the SSR value and flicker.
 *   - On `/market-analysis` → force dark, non-persistent (visual only).
 *   - Otherwise → apply the user's saved `settings.theme`, but only if it
 *     actually differs from the current live theme. Non-persistent: we're
 *     reflecting the stored value, not re-writing it.
 */
function ThemeSyncFromSettings() {
  const pathname = usePathname();
  const { settings, loading } = useUserSettings();
  const { theme, setTheme } = useTheme();
  const wasMarketAnalysis = useRef(false);

  useEffect(() => {
    if (loading) return;

    const onMarketAnalysis = !!pathname?.startsWith(MARKET_ANALYSIS_PREFIX);

    if (onMarketAnalysis) {
      if (theme !== 'dark') setTheme('dark', { persist: false });
      wasMarketAnalysis.current = true;
      return;
    }

    const saved = settings?.theme;
    const desired = saved === 'dark' || saved === 'light' ? saved : 'light';

    if (wasMarketAnalysis.current) {
      // Restoring after leaving /market-analysis.
      wasMarketAnalysis.current = false;
      if (theme !== desired) setTheme(desired, { persist: false });
      return;
    }

    // Normal case: only correct if the runtime theme has drifted from the
    // saved preference. Skips gracefully when they already match (which is
    // the expected case on first load because the server baked the right
    // value into initialTheme).
    if (theme !== desired) {
      setTheme(desired, { persist: false });
    }
  }, [loading, settings?.theme, pathname, theme, setTheme]);

  return null;
}

export function useUserSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within SettingsProvider');
  }
  return ctx;
}
