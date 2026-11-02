import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { Markdown } from '@/components/chat/Markdown';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { ChatMessage } from '@/chat/types';
import { fonts, palette, radius, spacing, type } from '@/constants/theme';

type Props = {
  message: ChatMessage;
  onRetry?: (text: string) => void;
};

function providerLabel(message: ChatMessage): string | null {
  if (!message.provider) return null;

  const provider = message.provider === 'openrouter' ? 'DEEPSEEK · OPENROUTER' : message.provider;

  return provider.toUpperCase();
}

export function MessageBubble({ message, onRetry }: Props) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text selectable style={styles.userText}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  if (message.status === 'error') {
    return (
      <View style={styles.assistant}>
        <Text style={styles.errorLabel}>No answer</Text>
        <Text selectable style={styles.errorText}>
          {message.content || 'The connection was interrupted.'}
        </Text>
        {message.retryText && onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onRetry(message.retryText ?? '')}
            hitSlop={8}
            style={styles.retry}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  const copy = async () => {
    await Clipboard.setStringAsync(message.content);
    setCopied(true);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View style={styles.assistant}>
      <View style={styles.metaRow}>
        <Text style={styles.author}>Pierrot</Text>
        {providerLabel(message) ? (
          <Text style={styles.provider}>{providerLabel(message)}</Text>
        ) : null}
      </View>

      {message.status === 'pending' && !message.content ? (
        <TypingIndicator />
      ) : (
        <Markdown content={message.content} />
      )}

      {message.status === 'complete' && message.content ? (
        <Pressable accessibilityRole="button" onPress={() => void copy()} hitSlop={8}>
          <Text style={styles.copy}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
  },
  userBubble: {
    maxWidth: '84%',
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    backgroundColor: palette.surfaceActive,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: {
    ...type.body,
    color: palette.text,
  },
  assistant: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  author: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: palette.textSecondary,
  },
  provider: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    color: palette.textFaint,
  },
  copy: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: palette.textFaint,
  },
  errorLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: palette.danger,
  },
  errorText: {
    ...type.bodySmall,
    color: palette.danger,
  },
  retry: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: palette.textSecondary,
    textDecorationLine: 'underline',
  },
});
