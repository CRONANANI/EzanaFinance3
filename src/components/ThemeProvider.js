'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

/** Read theme synchronously — safe in browser, falls back to 'light' in SSR */
function readStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem('ezana-theme') || 'light';
  } catch {
    return 'light';
  }
}

/** Apply theme classes to <html> and <body> immediately */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light-mode');
    document.body.classList.add('light-mode');
    root.classList.remove('dark');
    root.style.backgroundColor = '#f8f9fb';
    root.style.colorScheme = 'light';
  } else {
    root.classList.remove('light-mode');
    document.body.classList.remove('light-mode');
    root.classList.add('dark');
    root.style.backgroundColor = '#0f1419';
    root.style.colorScheme = 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme());

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('ezana-theme', theme);
    } catch {
      // ignore quota/private-mode errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
