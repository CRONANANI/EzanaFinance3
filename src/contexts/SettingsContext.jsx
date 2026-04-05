'use client';

import { createContext, useContext, useEffect } from 'react';
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

function ThemeSyncFromSettings() {
  const pathname = usePathname();
  const { settings, loading } = useUserSettings();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (loading) return;
    if (pathname?.startsWith(MARKET_ANALYSIS_PREFIX)) {
      setTheme('dark');
      return;
    }
    const t = settings?.theme;
    if (t === 'light' || t === 'dark') {
      setTheme(t);
    } else {
      setTheme('light');
    }
  }, [loading, settings?.theme, pathname, setTheme]);

  return null;
}

export function useUserSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within SettingsProvider');
  }
  return ctx;
}
