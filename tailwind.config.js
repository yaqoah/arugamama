/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#FFFFFF',
          100: '#FBF9F5',
          200: '#F4F4F5',
          300: '#E4E4E7',
          400: '#D4D4D8',
        },
        ink: {
          DEFAULT: '#0D1117',
          600: '#18181B',
          500: '#27272A',
          400: '#52525B',
          300: '#71717A',
          200: '#A1A1AA',
          100: '#D4D4D8',
        },
        sunset: {
          DEFAULT: '#6D2A8D',
          600: '#4D1B64',
          400: '#8A38B3',
          200: '#F3E8F8',
        },
        cream: {
          DEFAULT: '#FFFFFF',
          400: '#F4F4F5',
          200: '#FBF9F5',
        },
        emeraldRisk: {
          DEFAULT: '#A853D4',
          600: '#8A38B3',
          400: '#C084DC',
          200: '#F3E8F8',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        manga: '4px 4px 0px #0D1117',
        mangaSm: '3px 3px 0px #0D1117',
        mangaLg: '6px 6px 0px #0D1117',
        mangaXl: '8px 8px 0px #0D1117',
        mangaInset: 'inset 2px 2px 0px #0D1117',
      },
      borderRadius: {
        none: '0',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatDust: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)', opacity: '0.35' },
          '50%': { transform: 'translate(20px,-30px) scale(1.4)', opacity: '0.6' },
        },
        glow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        floatDust: 'floatDust 12s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
