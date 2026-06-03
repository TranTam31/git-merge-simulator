/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // VSCode dark theme
        editor: {
          bg: '#1e1e1e',
          surface: '#252526',
          border: '#3e3e42',
          hover: '#2a2d2e',
          line: '#2d2d30',
        },
        conflict: {
          currentBg: '#1c4a1c',
          currentBorder: '#2ea043',
          currentText: '#4ade80',
          currentHeader: '#163b16',
          incomingBg: '#1a3a5c',
          incomingBorder: '#3b82f6',
          incomingText: '#60a5fa',
          incomingHeader: '#112847',
          markerText: '#6b7280',
        },
        merged: {
          bg: '#1e2a1e',
        },
        btn: {
          current: '#1c4a1c',
          incoming: '#1a3a5c',
          both: '#3b2a4a',
          compare: '#2a2a2a',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-down': 'slideDown 0.25s ease-out',
        'resolve': 'resolveAnim 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, maxHeight: '0' }, to: { opacity: 1, maxHeight: '1000px' } },
        resolveAnim: { from: { opacity: 1, backgroundColor: '#2ea04330' }, to: { opacity: 1, backgroundColor: 'transparent' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
      },
    },
  },
  plugins: [],
}
