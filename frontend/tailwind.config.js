/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Adult Mode (Command Center)
        adult: {
          primary: '#1E3A5F',
          secondary: '#0D9488',
          surface: '#F1F5F9',
          dark: '#0F172A',
        },
        // Kid Mode (Playground)
        kid: {
          primary: '#F59E0B',
          secondary: '#10B981',
          accent: '#F472B6',
          surface: '#FEF3C7',
        },
        // Shared
        fam: {
          coin: '#FFD700',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        }
      },
      fontFamily: {
        assistant: ['Assistant', 'sans-serif'],
        varela: ['Varela Round', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'bounce-coin': 'bounce-coin 0.5s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.8)' },
        },
        'bounce-coin': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
