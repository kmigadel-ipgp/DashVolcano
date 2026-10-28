/** @type {import('tailwindcss').Config} */

// Theme tokens are CSS variables (see src/index.css) holding "r g b" channels,
// so existing utility classes (bg-white, text-gray-700, bg-blue-50…) follow the
// active theme without per-component `dark:` variants.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// Neutral and tint shades that switch with the theme. Mid shades (400-600 for
// backgrounds and borders) are left untouched: they carry legend swatches and
// other encodings that must look the same in both themes.
const tints = (family, shades) =>
  Object.fromEntries(shades.map((shade) => [shade, token(`${family}-${shade}`)]));

const TINT_FAMILIES = ['red', 'blue', 'green', 'yellow', 'emerald', 'indigo', 'teal', 'purple', 'volcano'];
const TEXT_FAMILIES = ['red', 'blue', 'green', 'yellow', 'emerald', 'indigo', 'amber', 'orange', 'volcano'];

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        volcano: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Semantic tokens for new and harmonised components
        canvas: token('canvas'),
        surface: token('surface'),
        'surface-sunken': token('surface-sunken'),
        line: token('line'),
        'line-strong': token('line-strong'),
        ink: token('ink'),
        'ink-muted': token('ink-muted'),
        accent: token('accent'),
        'accent-hover': token('accent-hover'),
        'accent-ink': token('accent-ink'),
        'accent-soft': token('accent-soft'),
        focus: token('focus'),
      },
      backgroundColor: {
        white: token('surface'),
        gray: tints('gray', [50, 100, 200, 300]),
        ...Object.fromEntries(TINT_FAMILIES.map((f) => [f, tints(f, [50, 100])])),
      },
      textColor: {
        gray: tints('gray-text', [500, 600, 700, 800, 900]),
        ...Object.fromEntries(TEXT_FAMILIES.map((f) => [f, tints(`${f}-text`, [600, 700, 800, 900])])),
      },
      borderColor: {
        gray: tints('gray', [100, 200, 300]),
        ...Object.fromEntries(TINT_FAMILIES.map((f) => [f, tints(f, [200, 300])])),
      },
      gradientColorStops: {
        ...Object.fromEntries(TINT_FAMILIES.map((f) => [f, tints(f, [50, 100])])),
      },
      divideColor: {
        gray: tints('gray', [100, 200, 300]),
      },
    },
  },
  plugins: [],
}
