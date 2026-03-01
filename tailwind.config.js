/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{html,js}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
          hover: '#34d399',
        },
        background: '#0f1419',
        foreground: '#ffffff',
        card: 'rgba(26, 35, 50, 0.6)',
        muted: 'rgba(17, 24, 39, 0.4)',
        'muted-foreground': '#6b7280',
        border: 'rgba(16, 185, 129, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    },
  },
  plugins: [],
};
