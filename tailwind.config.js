/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d0d1a',
          secondary: '#141428',
          card: '#181830',
          hover: '#1e1e3a',
          border: '#2a2a4e',
        },
        brand: {
          DEFAULT: '#a78bfa',
          dim: '#7c3aed',
          glow: 'rgba(167,139,250,0.15)',
          pink: '#f472b6',
          mint: '#34d399',
        },
        success: '#4ade80',
        warn: '#fbbf24',
        danger: '#f87171',
        info: '#60a5fa',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      boxShadow: {
        'glow-v': '0 0 24px rgba(167,139,250,0.18)',
        'glow-p': '0 0 20px rgba(244,114,182,0.15)',
      },
    },
  },
  plugins: [],
}
