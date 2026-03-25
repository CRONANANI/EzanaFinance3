'use client';

import { useTheme } from '@/components/ThemeProvider';

/**
 * ThemeToggle — sun/moon control (used in Settings → Appearance).
 *
 * - Dark mode (default): shows sun icon (click to go light)
 * - Light mode: shows moon icon (click to go dark)
 */
export function ThemeToggle({ onThemeChange }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleClick = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    toggleTheme();
    onThemeChange?.(next);
  };

  return (
    <button
      className="theme-toggle-btn"
      onClick={handleClick}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      type="button"
    >
      <div className={`theme-toggle-icon-wrap ${isDark ? 'dark' : 'light'}`}>
        {/* Sun icon (visible in dark mode — "click me for light") */}
        <i className="bi bi-sun-fill theme-toggle-sun" />
        {/* Moon icon (visible in light mode — "click me for dark") */}
        <i className="bi bi-moon-fill theme-toggle-moon" />
      </div>
    </button>
  );
}

export default ThemeToggle;
