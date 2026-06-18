/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          orange: '#FF6B2C',
          purple: '#9B30FF',
        },
        brand: {
          primary: '#9B30FF',
          'primary-dark': '#8a1ef0',
          'primary-darker': '#7f14e6',
          'primary-darkest': '#6810bd',
          'primary-light': '#a94aff',
          'primary-lighter': '#b35fff',
          'primary-lightest': '#c685ff',
        },
        surface: {
          bg: '#111118',
          card: '#1a1a24',
          hover: '#22222e',
          border: '#2a2a3a',
        },
        text: {
          emphasis: '#f0f0f5',
          muted: '#8888a0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"'],
      },
    },
  },
  plugins: [],
};
