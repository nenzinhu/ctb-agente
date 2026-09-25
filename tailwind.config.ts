import type { Config } from 'tailwindcss';

// Every color is a design token from app/globals.css (--ds-*), so light, dark
// and "modo sol" switch without dark: variants in the components. color-mix()
// keeps Tailwind's opacity modifiers (bg-ds-primary/10) working on hex tokens.
const ds = (nome: string) => `color-mix(in srgb, var(--ds-${nome}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  // `.dark` on <html>, set before the first paint by app/layout.tsx
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        ds: {
          bg: ds('bg'),
          surface: ds('surface'),
          text: ds('text'),
          subtle: ds('subtle'),
          border: ds('border'),
          'border-input': ds('border-input'),
          line: ds('line'),
          primary: {
            DEFAULT: ds('primary'),
            strong: ds('primary-strong'),
            soft: ds('primary-soft'),
          },
          gold: {
            DEFAULT: ds('gold'),
            strong: ds('gold-strong'),
          },
          accent: ds('accent'),
          'on-accent': ds('on-accent'),
          ink: ds('ink'),
          muted: ds('muted'),
          danger: ds('danger'),
          warn: ds('warn'),
          success: ds('success'),
          'on-solid': ds('on-solid'),
          sev: {
            leve: ds('sev-leve'),
            media: ds('sev-media'),
            grave: ds('sev-grave'),
            gravissima: ds('sev-gravissima'),
          },
        },
      },
      borderRadius: {
        control: 'var(--ds-radius-control)',
        card: 'var(--ds-radius-card)',
      },
      boxShadow: {
        solid: 'var(--ds-shadow-solid)',
        pressed: 'var(--ds-shadow-pressed)',
        overlay: 'var(--ds-shadow-overlay)',
      },
    },
  },
  plugins: [],
};

export default config;
