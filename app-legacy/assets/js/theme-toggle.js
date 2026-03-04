/**
 * Theme Toggle - Light/Dark mode switching
 */
class ThemeToggle {
  constructor() {
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
    document.body.classList.toggle('light-mode', theme === 'light');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.themeToggle = new ThemeToggle();
});
