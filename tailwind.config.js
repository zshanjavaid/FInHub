/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#0d9488',
          600: '#0f766e',
          700: '#115e59',
          800: '#134e4a',
          900: '#042f2e',
        },
        surface: {
          DEFAULT: '#e8eef3',
          card: '#ffffff',
          elevated: '#ffffff',
          muted: '#dce4ec',
        },
      },
      boxShadow: {
        'card': '0 1px 1px rgb(15 23 42 / 0.03), 0 2px 8px rgb(15 23 42 / 0.04), 0 0 0 1px rgb(15 23 42 / 0.02)',
        'card-hover': '0 4px 20px rgb(15 23 42 / 0.08), 0 1px 3px rgb(15 23 42 / 0.04)',
        'elevated': '0 12px 32px -8px rgb(15 23 42 / 0.18), 0 4px 12px -4px rgb(15 23 42 / 0.08), 0 0 0 1px rgb(15 23 42 / 0.04)',
        'panel': '0 1px 1px rgb(15 23 42 / 0.03), 0 2px 8px rgb(15 23 42 / 0.04)',
        'modal': '0 28px 56px -16px rgb(15 23 42 / 0.32), 0 0 0 1px rgb(15 23 42 / 0.06)',
        'glow': '0 0 0 1px rgb(13 148 136 / 0.2), 0 8px 20px -6px rgb(13 148 136 / 0.35)',
        'sidebar': '4px 0 24px rgb(4 47 46 / 0.25)',
      },
    },
  },
  plugins: [],
}
