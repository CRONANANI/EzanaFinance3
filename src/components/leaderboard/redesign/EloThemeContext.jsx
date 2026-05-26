'use client';

import { createContext, useContext, useMemo } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { getEloTheme } from './elo-design-tokens';

const EloThemeContext = createContext(null);

export function EloThemeProvider({ children, isDark: isDarkProp }) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === 'dark';

  const value = useMemo(() => getEloTheme(isDark), [isDark]);

  return <EloThemeContext.Provider value={value}>{children}</EloThemeContext.Provider>;
}

export function useEloTheme() {
  const ctx = useContext(EloThemeContext);
  if (!ctx) {
    return getEloTheme(false);
  }
  return ctx;
}
