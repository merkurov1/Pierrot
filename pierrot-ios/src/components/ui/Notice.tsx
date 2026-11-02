import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeContext';

import { fonts, radius, spacing, typography, ThemeColors } from '@/constants/theme';

type Props = {
  title?: string;
  message: string;
  tone?: 'neutral' | 'error' | 'success';
  children?: React.ReactNode;
};

export function Notice({ title, message, tone = 'neutral', children }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={[
        styles.root,
        tone === 'error' && styles.error,
        tone === 'success' && styles.success,
      ]}>
      {title ? (
        <Text style={[styles.title, tone === 'error' && styles.errorText]}>{title}</Text>
      ) : null}
      <Text style={[styles.message, tone === 'error' && styles.errorText]}>{message}</Text>
      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

export function SectionLabel({ children }: React.PropsWithChildren) {
  const styles = useThemedStyles(makeStyles);
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Rule() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.rule} />;
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  root: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  error: {
    borderColor: '#3A2426',
    backgroundColor: colors.dangerSurface,
  },
  success: {
    borderColor: '#243026',
  },
  title: {
    ...type.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  message: {
    ...type.bodySmall,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
  },
  children: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    width: '100%',
  },
  });
};
