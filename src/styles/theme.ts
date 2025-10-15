/**
 * Application Theme Configuration
 * Centralized color palette, spacing, and design tokens
 */

/** Color palette for the entire application */
export const COLORS = {
  // Background colors
  background: {
    primary: '#09090B',      // Main dark background
    secondary: '#0E0E0E',    // Secondary dark background
    card: '#171717',         // Card/modal background
    hover: '#1F2937',        // Hover state background
  },
  
  // Brand colors
  brand: {
    primary: '#FA5616',      // Primary orange
    primaryHover: '#E84D12', // Primary orange hover
    secondary: '#FF6B35',    // Secondary orange
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',      // Primary white text
    secondary: '#9CA3AF',    // Secondary gray text
    muted: '#6B7280',        // Muted gray text
    onPrimary: '#09090B',    // Text on primary brand color
  },
  
  // Border colors
  border: {
    default: '#374151',      // Default border
    light: '#4B5563',        // Light border
    dark: '#1F2937',         // Dark border
    focus: '#FA5616',        // Focus border (brand)
  },
  
  // Status colors
  status: {
    success: '#10B981',      // Success green
    warning: '#F59E0B',      // Warning yellow
    error: '#EF4444',        // Error red
    info: '#3B82F6',         // Info blue
  },
  
  // Trading-specific colors (moved from trading.ts)
  trading: {
    positive: '#2fe3ac',     // Green for gains/up movements
    negative: '#ec397a',     // Red for losses/down movements
    neutral: '#9CA3AF',      // Gray for neutral
  },
  
  // Zinc palette (commonly used throughout)
  zinc: {
    50: '#FAFAFA',
    100: '#F4F4F5',
    200: '#E4E4E7',
    300: '#D4D4D8',
    400: '#A1A1AA',
    500: '#71717A',
    600: '#52525B',
    700: '#3F3F46',
    800: '#27272A',
    900: '#18181B',
    950: '#09090B',
  },
} as const;

/** Spacing scale */
export const SPACING = {
  xs: '0.25rem',    // 4px
  sm: '0.5rem',     // 8px
  md: '1rem',       // 16px
  lg: '1.5rem',     // 24px
  xl: '2rem',       // 32px
  '2xl': '3rem',    // 48px
  '3xl': '4rem',    // 64px
} as const;

/** Border radius scale */
export const RADIUS = {
  none: '0',
  sm: '0.125rem',   // 2px
  default: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  full: '9999px',   // Full circle
} as const;

/** Animation durations */
export const ANIMATION = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

/** Typography scale */
export const TYPOGRAPHY = {
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

/** Z-index scale */
export const Z_INDEX = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// Legacy exports for backward compatibility (will be deprecated)
/** @deprecated Use COLORS.background instead */
export const UI_COLORS = {
  primaryBackground: COLORS.background.primary,
  secondaryBackground: COLORS.background.secondary,
  cardBackground: COLORS.background.card,
  primary: COLORS.brand.primary,
  primaryTextOnPrimary: COLORS.text.onPrimary,
  primaryText: COLORS.text.primary,
  secondaryText: COLORS.text.secondary,
  mutedText: COLORS.text.muted,
  border: COLORS.border.default,
  borderLight: COLORS.border.light,
  borderDark: COLORS.border.dark,
  success: COLORS.status.success,
  warning: COLORS.status.warning,
  error: COLORS.status.error,
  info: COLORS.status.info,
} as const;

