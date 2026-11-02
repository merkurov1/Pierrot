import React from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';

import { Markdown } from '@/components/chat/Markdown';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import type { ChatMessage } from '@/chat/types';
import { fonts, radius, spacing, typography, ThemeColors } from '@/constants/theme';

type Props = {
  message: ChatMessage;
  onRetry?: (text: string) => void;
  onSendToDev?: () => void;
  onRemember?: () => void;
};

function providerLabel(message: ChatMessage): string | null {
  if (!message.provider) return null;

  const provider = message.provider === 'openrouter' ? 'DEEPSEEK · OPENROUTER' : message.provider;

  return provider.toUpperCase();
}

export function MessageBubble({ message, onRetry, onSendToDev, onRemember }: Props) {
  const styles = useThemedStyles(makeStyles);
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

  const share = async () => {
    await Share.share({ message: message.content });
  };

  const openSource = (url: string | null) => {
    if (url) void WebBrowser.openBrowserAsync(url);
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

      {message.sources && message.sources.length > 0 ? (
        <View style={styles.sources}>
          <Text style={styles.sourcesLabel}>Sources</Text>
          {message.sources.slice(0, 5).map((source, index) => (
            <Pressable
              key={`${source.documentTitle}-${index}`}
              accessibilityRole="link"
              onPress={() => openSource(source.canonicalUrl)}
              disabled={!source.canonicalUrl}
              style={styles.sourceRow}>
              <Text numberOfLines={2} style={styles.sourceTitle}>
                {source.documentTitle}
              </Text>
              {source.heading && source.heading !== source.documentTitle ? (
                <Text numberOfLines={1} style={styles.sourceHeading}>
                  {source.heading}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {message.status === 'complete' && message.content ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => void copy()} hitSlop={8}>
            <Text style={styles.copy}>{copied ? 'Copied' : 'Copy'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void share()} hitSlop={8}>
            <Text style={styles.copy}>Share</Text>
          </Pressable>
          {onSendToDev ? (
            <Pressable accessibilityRole="button" onPress={onSendToDev} hitSlop={8}>
              <Text style={styles.copy}>Dev</Text>
            </Pressable>
          ) : null}
          {onRemember ? (
            <Pressable accessibilityRole="button" onPress={onRemember} hitSlop={8}>
              <Text style={styles.copy}>Remember</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
  },
  userBubble: {
    maxWidth: '84%',
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    backgroundColor: colors.surfaceActive,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userText: {
    ...type.body,
    color: colors.text,
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
    color: colors.textSecondary,
  },
  provider: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    color: colors.textFaint,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  sources: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    gap: 4,
  },
  sourcesLabel: {
    ...type.label,
    fontSize: 8,
    color: colors.textFaint,
  },
  sourceRow: {
    gap: 1,
  },
  sourceTitle: {
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },
  sourceHeading: {
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 14,
    color: colors.textFaint,
  },
  errorLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.danger,
  },
  errorText: {
    ...type.bodySmall,
    color: colors.danger,
  },
  retry: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  });
};
