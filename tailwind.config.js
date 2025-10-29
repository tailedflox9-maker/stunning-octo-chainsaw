/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Aptos-Mono', 'Inter', 'sans-serif'],
        mono: ['Aptos-Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'), // Add this plugin
    require('@tailwindcss/typography'),
  ],
};
