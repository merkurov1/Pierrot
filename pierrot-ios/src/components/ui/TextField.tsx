import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { fonts, radius, spacing, ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

type Props = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, containerStyle, style, ...props }: Props) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.textSecondary}
        keyboardAppearance="dark"
        style={[styles.input, props.multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.lineStrong,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundElevated,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  });
};
