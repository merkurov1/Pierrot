import { Platform } from 'react-native';

/**
 * Pierrot visual language.
 *
 * One dark surface, warm white type, restrained grey hierarchy. No gradients,
 * no cards competing for attention, no decorative accent colour.
 */
export const palette = {
  background: '#050505',
  backgroundElevated: '#0A0A0B',
  surface: '#101011',
  surfaceRaised: '#161618',
  surfaceActive: '#1C1C1F',
  line: '#1B1B1E',
  lineStrong: '#2A2A2E',
  text: '#F3F1EC',
  textSecondary: '#A5A29C',
  textMuted: '#74716C',
  textFaint: '#4A4844',
  inverseText: '#080808',
  danger: '#C99A9A',
  dangerSurface: '#1A1112',
  success: '#9BAE93',
} as const;

export const fonts = {
  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    web: 'Georgia, "Times New Roman", serif',
    default: 'serif',
  }),
  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    default: 'sans-serif',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    default: 'monospace',
  }),
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 72,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
} as const;

export const layout = {
  /** Measures in points. Tablet layouts start at this width. */
  tablet: 820,
  chat: 720,
  content: 760,
  brain: 820,
  sidebar: 292,
  tabBarHeight: 54,
} as const;

export const type = {
  display: {
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
    color: palette.text,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
    color: palette.text,
  },
  heading: {
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 29,
    letterSpacing: -0.2,
    color: palette.text,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    color: palette.text,
  },
  bodySmall: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSecondary,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
    color: palette.textMuted,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: palette.textMuted,
  },
} as const;
