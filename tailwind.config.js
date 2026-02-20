/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./construction.html",
    "./energy.html",
    "./it-services.html",
    "./supply.html",
    "./consultancy.html",
    "./suggestions.html",
    "./admin/**/*.html",
    "./client/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tde: {
          primary: '#4c1d95', // Violet 900 (Deep Purple)
          secondary: '#5b21b6', // Violet 800
          accent: '#a78bfa', // Violet 400 (Light Purple accent)
          light: '#f5f3ff', // Violet 50 (Very light background)
          dark: '#2e1065', // Violet 950 (Darkest)
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      },
      backgroundImage: {
        'premium-gradient': 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
        'glass': 'rgba(255, 255, 255, 0.7)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
