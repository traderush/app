export const TRADING_COLORS = {
  positive: 'var(--color-trading-positive)',
  negative: 'var(--color-trading-negative)',
} as const;

export const COLORS = {
  background: {
    primary: 'var(--color-background)',
    secondary: 'var(--color-surface-900)',
  },
  trading: TRADING_COLORS,
} as const;
