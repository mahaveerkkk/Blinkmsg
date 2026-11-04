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
        brand: {
          lime: '#D4FF00',
          emerald: '#00F5A0',
          cyan: '#00D4FF',
          dark: '#07080B',
        },
        dark: {
          bg: '#07080B',        // Deep Obsidian Space
          surface: '#0E1016',   // Rich Layered Surface
          card: '#141720',      // Elevated Card
          border: 'rgba(255, 255, 255, 0.08)',
          hover: '#1B1F2B',
          text: '#F3F4F6',
          muted: '#8E95A5',     // Modern Secondary Text
          bubbleSent: '#0E3A2A', // Signal/Telegram luxury emerald
          bubbleReceived: '#141720', // Apple dark bubble
        }
      },
    },
  },
  plugins: [],
}
