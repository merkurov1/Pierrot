import { Platform } from 'react-native';

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  surface: string;
  surfaceRaised: string;
  surfaceActive: string;
  line: string;
  lineStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textFaint: string;
  inverseText: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSurface: string;
  success: string;
  userBubble: string;
  userBubbleText: string;
  overlay: string;
};

/**
 * Light is the default. The palette is intentionally warm and paper-like,
 * matching the website rather than a generic white dashboard.
 */
export const themes: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: '#FAF8F5',
    backgroundElevated: '#F4F0EA',
    surface: '#FFFFFF',
    surfaceRaised: '#F7F3ED',
    surfaceActive: '#EDE7DE',
    line: '#E4DED5',
    lineStrong: '#CFC6B9',
    text: '#211F1F',
    textSecondary: '#625D58',
    textMuted: '#827B74',
    textFaint: '#A29B94',
    inverseText: '#FAF8F5',
    accent: '#990F3D',
    accentSoft: '#F2E4E9',
    danger: '#8A1235',
    dangerSurface: '#F8EAF0',
    success: '#4F6B4A',
    userBubble: '#211F1F',
    userBubbleText: '#FAF8F5',
    overlay: 'rgba(33, 31, 31, 0.35)',
  },
  dark: {
    background: '#080808',
    backgroundElevated: '#0E0E10',
    surface: '#121214',
    surfaceRaised: '#18181B',
    surfaceActive: '#222226',
    line: '#242427',
    lineStrong: '#35353A',
    text: '#F3F1EC',
    textSecondary: '#A5A29C',
    textMuted: '#74716C',
    textFaint: '#4A4844',
    inverseText: '#080808',
    accent: '#D8A7B8',
    accentSoft: '#2A171E',
    danger: '#C99A9A',
    dangerSurface: '#1A1112',
    success: '#9BAE93',
    userBubble: '#F3F1EC',
    userBubbleText: '#080808',
    overlay: 'rgba(0, 0, 0, 0.55)',
  },
};

/** Transitional alias for files not yet migrated to useTheme. */
export const palette = themes.dark;

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
  tablet: 820,
  wide: 1180,
  chat: 720,
  content: 760,
  brain: 820,
  sidebar: 292,
  tabBarHeight: 54,
} as const;

export function typography(colors: ThemeColors) {
  return {
    display: {
      fontFamily: fonts.serif,
      fontSize: 42,
      lineHeight: 48,
      letterSpacing: -0.8,
      color: colors.text,
    },
    title: {
      fontFamily: fonts.serif,
      fontSize: 30,
      lineHeight: 36,
      letterSpacing: -0.4,
      color: colors.text,
    },
    heading: {
      fontFamily: fonts.serif,
      fontSize: 22,
      lineHeight: 29,
      letterSpacing: -0.2,
      color: colors.text,
    },
    body: {
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    },
    bodySmall: {
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    label: {
      fontFamily: fonts.mono,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 1.6,
      textTransform: 'uppercase' as const,
      color: colors.textMuted,
    },
    meta: {
      fontFamily: fonts.mono,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0.2,
      color: colors.textMuted,
    },
  } as const;
}

/** Transitional static type tokens; migrated surfaces use typography(colors). */
export const type = typography(themes.dark);
