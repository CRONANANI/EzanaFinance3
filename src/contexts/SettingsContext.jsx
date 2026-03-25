'use client';

import { createContext, useContext, useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/components/ThemeProvider';

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
  const { settings, loading } = useUserSettings();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (loading) return;
    const t = settings?.theme;
    if (t === 'light' || t === 'dark') {
      setTheme(t);
    }
  }, [loading, settings?.theme, setTheme]);

  return null;
}

export function useUserSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useUserSettings must be used within SettingsProvider');
  }
  return ctx;
}
