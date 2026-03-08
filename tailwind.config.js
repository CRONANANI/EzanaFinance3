/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app-legacy/**/*.{html,js,css}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      maxWidth: {
        container: "1280px",
      },
      animation: {
        marquee: "marquee var(--duration) linear infinite",
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      colors: {
        primary: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
          hover: '#34d399',
        },
        background: '#0f1419',
        foreground: '#ffffff',
        card: 'rgba(26, 35, 50, 0.6)',
        'card-foreground': '#ffffff',
        accent: 'rgba(16, 185, 129, 0.15)',
        'accent-foreground': '#10b981',
        destructive: '#ef4444',
        muted: 'rgba(17, 24, 39, 0.4)',
        'muted-foreground': '#6b7280',
        border: 'rgba(16, 185, 129, 0.1)',
        input: 'rgba(17, 24, 39, 0.6)',
        ring: '#10b981',
        popover: 'rgba(26, 35, 50, 0.98)',
        'popover-foreground': '#ffffff',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
