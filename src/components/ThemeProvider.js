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
  const body = document.body;
  root.style.colorScheme = 'light';
  if (theme === 'light') {
    root.classList.add('light-mode');
    body.classList.add('light-mode');
    root.classList.remove('dark');
    root.style.backgroundColor = '';
    body.style.backgroundColor = '';
  } else {
    root.classList.remove('light-mode');
    body.classList.remove('light-mode');
    root.classList.add('dark');
    root.style.backgroundColor = '#0a0e13';
    body.style.backgroundColor = '#0a0e13';
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
