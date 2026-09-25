import type { Config } from 'tailwindcss';

// Semantic colors come from the CSS tokens in app/globals.css (light, dark
// and "modo sol"), so components don't repeat dark: variants for them.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        'surface-2': token('surface-2'),
        line: token('line'),
        ink: token('ink'),
        muted: token('muted'),
        brand: {
          DEFAULT: token('brand'),
          strong: token('brand-strong'),
          soft: token('brand-soft'),
          ink: token('brand-ink'),
        },
        accent: token('accent'),
        danger: token('danger'),
        warn: token('warn'),
        info: token('info'),
        success: token('success'),
      },
    },
  },
  plugins: [],
};

export default config;
