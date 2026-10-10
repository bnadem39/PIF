/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        market: {
          dark: '#0B0F19',
          card: '#111827',
          panel: '#1E293B',
          border: '#334155',
          up: '#10B981',
          down: '#EF4444',
          accent: '#38BDF8',
          textMuted: '#94A3B8',
          textBright: '#F8FAFC'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
