const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      colors: {
        // Palette basée sur primary #E34F62 et secondary #FB7A6B
        brand: {
          25: '#fef5f6',
          50: '#fdeced',
          100: '#fbd9dc',
          200: '#f7b5bb',
          300: '#f28a94',
          400: '#FB7A6B',
          500: '#ef5d6e',
          600: '#E34F62',
          700: '#c73d4f',
          800: '#a53343',
          900: '#892f3c',
          950: '#4a171f',
        },
        // TailAdmin gray
        body: {
          DEFAULT: '#64748b',
          dark: '#475569',
        },
      },
      boxShadow: {
        default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
        card: '0px 1px 3px rgba(0, 0, 0, 0.08)',
        'panel-left': '-4px 0 24px -4px rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        350: '350ms',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-primeui')],
};
