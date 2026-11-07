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
        },
        portal: {
          bg: '#05070D',
          panel: '#0B0F1A',
          bullish: '#00E676',
          bearish: '#FF3D57',
          gold: '#F5C242',
          cyan: '#22D3EE'
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
