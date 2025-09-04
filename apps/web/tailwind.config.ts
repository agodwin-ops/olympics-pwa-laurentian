import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'oswald': ['Oswald', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      colors: {
        // 1992 Olympics Theme Colors
        olympic: {
          blue: '#0081c8',
          yellow: '#fcb131',
          black: '#000000',
          green: '#00a651',
          red: '#ee334e',
        },
        canada: {
          red: '#ff0000',
          white: '#ffffff',
        },
        winter: {
          ice: '#e6f3ff',
          snow: '#fafafa',
          frost: '#87ceeb',
          alpine: '#2e7d32',
          mountain: '#546e7a',
        },
        medal: {
          gold: '#ffd700',
          silver: '#c0c0c0',
          bronze: '#cd7f32',
        },
        // Legacy Bolt colors (keeping for compatibility)
        brand: {
          50: '#f2f7ff', 100: '#e6efff', 200: '#cce0ff', 300: '#99c2ff', 400: '#66a3ff', 500: '#3385ff', 600: '#1a73e8', 700: '#1557b0', 800: '#0f3b78', 900: '#0a2550',
        },
      },
      backgroundImage: {
        'winter-gradient': 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 50%, #e8f5e8 100%)',
        'olympic-border': 'linear-gradient(90deg, #0081c8, #fcb131, #000000, #00a651, #ee334e)',
        'medal-gold': 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        'medal-silver': 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)',
        'medal-bronze': 'linear-gradient(135deg, #cd7f32 0%, #d4945a 100%)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
