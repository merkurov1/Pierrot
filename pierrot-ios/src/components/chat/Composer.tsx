import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PIERROT_MAX_MESSAGE_LENGTH } from '@/api/pierrot';
import { fonts, palette, radius, spacing } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  sending?: boolean;
};

export function Composer({ value, onChangeText, onSend, disabled, sending }: Props) {
  const canSend = value.trim().length > 0 && !disabled && !sending;
  const showCounter = value.length > PIERROT_MAX_MESSAGE_LENGTH - 400;

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Message Pierrot"
          placeholderTextColor={palette.textFaint}
          selectionColor={palette.textSecondary}
          keyboardAppearance="dark"
          multiline
          maxLength={PIERROT_MAX_MESSAGE_LENGTH}
          style={styles.input}
          textAlignVertical="center"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={onSend}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.send,
            !canSend && styles.sendDisabled,
            pressed && canSend && styles.sendPressed,
          ]}>
          {sending ? (
            <ActivityIndicator size="small" color={palette.inverseText} />
          ) : (
            <Text style={styles.sendGlyph}>↑</Text>
          )}
        </Pressable>
      </View>

      {showCounter ? (
        <Text style={styles.counter}>
          {value.length} / {PIERROT_MAX_MESSAGE_LENGTH}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    backgroundColor: palette.background,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 132,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    color: palette.text,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
  },
  send: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: palette.surfaceActive,
  },
  sendPressed: {
    opacity: 0.75,
  },
  sendGlyph: {
    color: palette.inverseText,
    fontSize: 19,
    lineHeight: 22,
    marginTop: -1,
  },
  counter: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    marginTop: spacing.xxs,
    textAlign: 'right',
    fontFamily: fonts.mono,
    fontSize: 9,
    color: palette.textFaint,
  },
});
