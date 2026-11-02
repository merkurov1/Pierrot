import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { palette, spacing, type } from '@/constants/theme';

export function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="small" color={palette.textMuted} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...type.meta,
    color: palette.textMuted,
    letterSpacing: 0.6,
  },
});
