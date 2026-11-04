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
        dark: {
          bg: '#000000',        // Pure Pitch Black (OLED)
          surface: '#0d0d0e',   // Deep subtle layer
          card: '#151518',      // Clean modern card
          border: '#222226',    // Subtle minimal border
          hover: '#1c1c20',
          text: '#ffffff',
          muted: '#8e8e93',     // Apple style secondary
          bubbleSent: '#1e3a2b', // Subtle muted forest/emerald (Signal/Telegram style)
          bubbleReceived: '#1c1c1e', // Apple dark bubble
        }
      },
    },
  },
  plugins: [],
}
