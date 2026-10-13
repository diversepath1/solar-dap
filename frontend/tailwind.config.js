/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#080C14',
        surface: {
          DEFAULT: '#0F1626',
          card: '#131C31',
          hover: '#1B2642',
          border: '#233252',
          subtle: '#192238'
        },
        solar: {
          yellow: '#FACC15',
          amber: '#F59E0B',
          gold: '#EAB308',
          orange: '#FB923C',
          lime: '#84CC16',
          glow: 'rgba(245, 158, 11, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
