/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0f0f0f',
          secondary: '#1a1a1a',
          card: '#222222',
          hover: '#2a2a2a',
          border: '#333333',
        },
        brand: {
          DEFAULT: '#f97316',
          dim: '#c2541a',
          glow: 'rgba(249,115,22,0.15)',
        },
        success: '#22c55e',
        warn: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
