import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

import { spacing, typography, ThemeColors } from '@/constants/theme';

export function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <ActivityIndicator size="small" color={colors.textMuted} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...type.meta,
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  });
};
