/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05070d',
          surface: '#0d111a',
          card: '#131824',
          border: '#1f293d',
          accent: '#00ffaa',
          neon: '#00f0ff',
          pink: '#ff007f',
          flame: '#ff4d00',
          text: '#f1f5f9',
          muted: '#8b9bb4'
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'burn-fade': 'burnFade 1s forwards ease-out',
        'ripple': 'ripple 2s infinite ease-out',
      },
      keyframes: {
        burnFade: {
          '0%': { opacity: '1', transform: 'scale(1)', filter: 'brightness(1) blur(0px)' },
          '50%': { opacity: '0.8', transform: 'scale(1.03)', filter: 'brightness(2) blur(1px) hue-rotate(30deg)' },
          '100%': { opacity: '0', transform: 'scale(0.8) translateY(-10px)', filter: 'brightness(0) blur(6px)' }
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.4)', opacity: '0' }
        }
      }
    },
  },
  plugins: [],
}
