import React from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';

import { friendlyApiMessage, ApiError } from '@/api/client';
import { sendPierrot } from '@/api/pierrot';
import type { PierrotHistoryItem } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import type { ChatMessage } from '@/chat/types';
import { Composer } from '@/components/chat/Composer';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Screen } from '@/components/ui/Screen';
import { fonts, layout, palette, spacing, type } from '@/constants/theme';

const SUGGESTIONS = [
  'What is the Digital Temple?',
  'Tell me about the Journal.',
  'How do I work with you?',
];

function buildHistory(messages: ChatMessage[]): PierrotHistoryItem[] {
  return messages
    .filter(
      (message) =>
        message.status === 'complete' &&
        message.content.trim().length > 0 &&
        (message.role === 'user' || message.role === 'assistant')
    )
    .slice(-24)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function ChatHeader({ compact }: { compact: boolean }) {
  const { activeConversation, startNewConversation } = useChat();
  const { isAdmin, session } = useAuth();

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerEyebrow}>
          {isAdmin ? 'Owner brain' : session ? 'Signed in' : 'Pierrot'}
        </Text>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {activeConversation?.title ?? 'New conversation'}
        </Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable accessibilityRole="button" onPress={startNewConversation} hitSlop={8}>
          <Text style={styles.headerAction}>New</Text>
        </Pressable>
        {compact ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/history')}
            hitSlop={8}>
            <Text style={styles.headerAction}>History</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function EmptyConversation({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEyebrow}>Personal intelligence</Text>
      <Text style={styles.emptyTitle}>Pierrot</Text>
      <Text style={styles.emptyText}>
        Ask a question, think out loud, or send a link. The answer comes from the same
        Pierrot that lives on merkurov.love.
      </Text>

      <View style={styles.suggestions}>
        {SUGGESTIONS.map((suggestion) => (
          <Pressable
            key={suggestion}
            accessibilityRole="button"
            onPress={() => onPrompt(suggestion)}
            style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
            <Text style={styles.suggestionText}>{suggestion}</Text>
            <Text style={styles.suggestionArrow}>↗</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ChatPane({ compact }: { compact: boolean }) {
  const {
    activeConversation,
    createConversation,
    appendMessage,
    updateMessage,
    removeMessage,
  } = useChat();
  const { consent, getAccessToken } = useAuth();

  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<FlatList<ChatMessage>>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const sendingRef = React.useRef(false);

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const scrollToEnd = React.useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const send = React.useCallback(
    async (raw?: string) => {
      const text = (raw ?? draft).trim();

      if (!text || sendingRef.current) return;

      sendingRef.current = true;

      const conversation = activeConversation ?? createConversation(text);
      const history = buildHistory(conversation.messages);

      const userMessage: ChatMessage = {
        id: Crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        status: 'complete',
      };

      const assistantId = Crypto.randomUUID();

      appendMessage(conversation.id, userMessage);
      appendMessage(conversation.id, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryText: text,
      });

      setDraft('');
      setSending(true);
      scrollToEnd(false);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getAccessToken();

        const result = await sendPierrot({
          message: text,
          conversationId: conversation.id,
          sessionId: conversation.sessionId,
          userMessageId: userMessage.id,
          history,
          consent: { state: consent, version: null },
          token,
          signal: controller.signal,
        });

        if (result.humanMode) {
          updateMessage(conversation.id, assistantId, {
            status: 'error',
            content: result.error || 'Anton is currently handling this conversation.',
            errorCode: 'HUMAN_MODE',
          });
          return;
        }

        if (!result.reply || !result.reply.trim()) {
          throw new ApiError('Pierrot returned no readable answer.', {
            code: 'INVALID_RESPONSE',
          });
        }

        updateMessage(conversation.id, assistantId, {
          status: 'complete',
          content: result.reply,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
        });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'ABORTED') {
          updateMessage(conversation.id, assistantId, {
            status: 'error',
            content: 'Response interrupted.',
            errorCode: 'ABORTED',
          });
        } else {
          updateMessage(conversation.id, assistantId, {
            status: 'error',
            content: friendlyApiMessage(error),
            errorCode: error instanceof ApiError ? error.code : 'UNKNOWN',
          });
        }
      } finally {
        sendingRef.current = false;
        setSending(false);
        abortRef.current = null;
        scrollToEnd();
      }
    },
    [
      activeConversation,
      appendMessage,
      consent,
      createConversation,
      draft,
      getAccessToken,
      scrollToEnd,
      updateMessage,
    ]
  );

  const messages = activeConversation?.messages ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.pane}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ChatHeader compact={compact} />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(message) => message.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            onRetry={(text) => {
              if (activeConversation) {
                removeMessage(activeConversation.id, item.id);
              }
              void send(text);
            }}
          />
        )}
        ListEmptyComponent={<EmptyConversation onPrompt={(text) => void send(text)} />}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && styles.listContentEmpty,
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (messages.length > 0) scrollToEnd(false);
        }}
      />

      <Composer
        value={draft}
        onChangeText={setDraft}
        onSend={() => void send()}
        sending={sending}
      />
    </KeyboardAvoidingView>
  );
}

export default function ChatScreen() {
  const { width } = useWindowDimensions();
  const tablet = width >= layout.tablet;

  return (
    <Screen>
      <View style={styles.row}>
        {tablet ? <ConversationSidebar /> : null}
        <ChatPane compact={!tablet} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  pane: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  headerText: {
    flex: 1,
  },
  headerEyebrow: {
    ...type.label,
    fontSize: 9,
    marginBottom: 3,
  },
  headerTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: palette.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerAction: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textSecondary,
  },
  listContent: {
    width: '100%',
    maxWidth: layout.chat,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: spacing.xl,
    maxWidth: 560,
  },
  emptyEyebrow: {
    ...type.label,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...type.display,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...type.bodySmall,
    color: palette.textSecondary,
    maxWidth: 460,
  },
  suggestions: {
    marginTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 23,
    color: palette.textSecondary,
  },
  suggestionArrow: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: palette.textFaint,
  },
  pressed: {
    opacity: 0.65,
  },
});
