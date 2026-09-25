import type { Config } from 'tailwindcss';

// Semantic colors via RGB CSS tokens (globals.css), permitindo
// opacity no Tailwind (ex: bg-primary/10).
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'Roboto', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Core da paleta PMRV-SC
        primary: {
          DEFAULT: token('primary'),
          strong: token('primary-strong'),
          soft: token('primary-soft'),
          ink: token('primary-ink'),
        },
        'primary-accent': {
          DEFAULT: token('primary-accent'),
          strong: token('primary-accent-strong'),
          soft: token('primary-accent-soft'),
        },
        // Fundo da página (grid)
        'page-bg': token('page-bg'),
        // Surface
        surface: token('surface'),
        'surface-border': token('surface-border'),
        // Tipografia
        ink: token('ink'),
        'ink-strong': token('ink-strong'),
        muted: token('muted'),
        // Semantic (compatibilidade)
        danger: token('danger'),
        warning: token('warning'),
        info: token('info'),
        success: token('success'),
      },
      borderRadius: {
        // Valores customizados alinhados ao design system (12-16px)
        'lg': '0.75rem',    // ~12px
        'xl': '1rem',       // ~16px
        '2xl': '1.25rem',   // ~20px
      },
      boxShadow: {
        'card': '0 1px 3px rgba(15,98,63,0.06), 0 4px 12px -4px rgba(15,98,63,0.10)',
        'card-lg': '0 4px 16px -4px rgba(15,98,63,0.15), 0 8px 32px -8px rgba(15,98,63,0.12)',
        'btn-primary': '0 2px 8px -2px rgba(15,98,63,0.25)',
      },
      spacing: {
        // Espaçamentos customizados
        '6.5': '1.625rem',
      },
      transitionDuration: {
        'fast': '150ms',
      },
    },
  },
  plugins: [],
};

export default config;
