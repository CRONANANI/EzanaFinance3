/**
 * Theme Toggle System
 */
class ThemeManager {
  constructor() {
    this.themeToggle = document.getElementById('themeToggle');
    this.currentTheme = localStorage.getItem('ezana-theme') || 'dark';
    this.init();
  }

  init() {
    this.applyTheme(this.currentTheme);
    document.addEventListener('click', (e) => {
      if (e.target.closest('#themeToggle')) this.toggleTheme();
    });
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.currentTheme);
    localStorage.setItem('ezana-theme', this.currentTheme);
  }

  applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
