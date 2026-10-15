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
        // Teal-tinted elevation — one depth cue; avoid stacking with heavy borders.
        card: '0 1px 2px rgb(4 47 46 / 0.04), 0 4px 14px -4px rgb(15 23 42 / 0.08)',
        'card-hover': '0 4px 18px -4px rgb(4 47 46 / 0.12), 0 2px 6px rgb(15 23 42 / 0.05)',
        elevated: '0 12px 28px -10px rgb(4 47 46 / 0.16), 0 4px 10px -4px rgb(15 23 42 / 0.06)',
        panel: '0 1px 2px rgb(4 47 46 / 0.04), 0 3px 10px -2px rgb(15 23 42 / 0.06)',
        modal: '0 24px 48px -16px rgb(4 47 46 / 0.28), 0 0 0 1px rgb(15 23 42 / 0.05)',
        glow: '0 0 0 1px rgb(13 148 136 / 0.18), 0 8px 18px -6px rgb(13 148 136 / 0.28)',
        sidebar: '4px 0 28px rgb(4 47 46 / 0.28)',
      },
    },
  },
  plugins: [],
}
