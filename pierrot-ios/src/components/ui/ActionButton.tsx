import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fonts, palette, radius, spacing } from '@/constants/theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'solid' | 'outline' | 'quiet';
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'solid',
  style,
}: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'quiet' && styles.quiet,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'solid' ? palette.inverseText : palette.textSecondary}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'solid' ? styles.labelSolid : styles.labelQuiet,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: palette.text,
  },
  outline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.lineStrong,
  },
  quiet: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  labelSolid: {
    color: palette.inverseText,
  },
  labelQuiet: {
    color: palette.textSecondary,
  },
});
