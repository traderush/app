import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: {
          800: 'var(--color-surface-800)',
          850: 'var(--color-surface-850)',
          900: 'var(--color-surface-900)',
          950: 'var(--color-surface-950)',
        },
        overlay: {
          900: 'var(--color-overlay-900)',
        },
        neutral: {
          900: 'var(--color-neutral-900)',
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          foreground: 'var(--color-brand-foreground)',
        },
        trading: {
          positive: 'var(--color-trading-positive)',
          negative: 'var(--color-trading-negative)',
        },
        danger: 'var(--color-danger)',
        live: {
          DEFAULT: 'var(--color-live)',
          border: 'var(--color-live-border)',
        },
        muted: {
          icon: 'var(--color-muted-icon)',
        },
        control: {
          track: 'var(--color-control-track)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
        },
        warning: '#facc15',
        status: {
          liveBg: '#0e2923',
          downBg: '#2a1a0e',
          downBorder: '#4a2f1a',
          glass: 'rgba(14,14,14,0.7)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
