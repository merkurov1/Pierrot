import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fonts, radius, spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

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
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
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
          color={variant === 'solid' ? colors.inverseText : colors.textSecondary}
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

const makeStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
  base: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solid: {
    backgroundColor: colors.text,
  },
  outline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
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
    color: colors.inverseText,
  },
  labelQuiet: {
    color: colors.textSecondary,
  },
  });
};
