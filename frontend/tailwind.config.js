/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          green: '#1B5E20',
          'green-dark': '#0D3018',
          'green-light': '#2E7D32',
          gold: '#FFB300',
          'gold-dark': '#F57F17',
          red: '#C62828',
        },
      },
    },
  },
  plugins: [],
}
