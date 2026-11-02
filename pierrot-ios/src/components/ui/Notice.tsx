import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, palette, radius, spacing, type } from '@/constants/theme';

type Props = {
  title?: string;
  message: string;
  tone?: 'neutral' | 'error' | 'success';
  children?: React.ReactNode;
};

export function Notice({ title, message, tone = 'neutral', children }: Props) {
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
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Rule() {
  return <View style={styles.rule} />;
}

const styles = StyleSheet.create({
  root: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.lineStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: palette.backgroundElevated,
  },
  error: {
    borderColor: '#3A2426',
    backgroundColor: palette.dangerSurface,
  },
  success: {
    borderColor: '#243026',
  },
  title: {
    ...type.label,
    color: palette.textSecondary,
    marginBottom: spacing.xs,
  },
  message: {
    ...type.bodySmall,
    color: palette.textSecondary,
  },
  errorText: {
    color: palette.danger,
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
    color: palette.textMuted,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.line,
    width: '100%',
  },
});
