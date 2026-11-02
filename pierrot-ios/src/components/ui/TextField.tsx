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

import { fonts, palette, radius, spacing } from '@/constants/theme';

type Props = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function TextField({ label, containerStyle, style, ...props }: Props) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.textFaint}
        selectionColor={palette.textSecondary}
        keyboardAppearance="dark"
        style={[styles.input, props.multiline && styles.multiline, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: palette.textMuted,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 46,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.lineStrong,
    borderRadius: radius.sm,
    backgroundColor: palette.backgroundElevated,
    color: palette.text,
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
