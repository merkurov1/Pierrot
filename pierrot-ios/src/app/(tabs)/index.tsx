import React from 'react';
import {
  Alert,
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
import { useThemedStyles } from '@/theme/ThemeContext';
import * as Crypto from 'expo-crypto';

import { friendlyApiMessage, ApiError } from '@/api/client';
import { sendPierrot } from '@/api/pierrot';
import { createDecision } from '@/api/mobile';
import type { PierrotHistoryItem } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import type { ChatMessage } from '@/chat/types';
import { Composer } from '@/components/chat/Composer';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Avatar } from '@/components/ui/Avatar';
import { PIERROT_AVATAR_SRC } from '@/config/pierrot';
import { Screen } from '@/components/ui/Screen';
import { fonts, layout, spacing, typography, ThemeColors } from '@/constants/theme';

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
  const styles = useThemedStyles(makeStyles);
  const { activeConversation, startNewConversation } = useChat();
  const { isAdmin, session } = useAuth();

  return (
    <View style={styles.header}>
      <Avatar uri={PIERROT_AVATAR_SRC} name="Pierrot" size={28} />
      <View style={styles.headerText}>
        <Text style={styles.headerEyebrow}>
          {isAdmin ? 'Owner brain' : session ? 'Signed in' : 'Pierrot'}
        </Text>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {activeConversation?.title ?? 'New conversation'}
        </Text>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/search')}
          hitSlop={8}>
          <Text style={styles.headerAction}>Search</Text>
        </Pressable>
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
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.empty}>
      <Avatar uri={PIERROT_AVATAR_SRC} name="Pierrot" size={58} />
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
  const styles = useThemedStyles(makeStyles);
  const {
    activeConversation,
    createConversation,
    appendMessage,
    updateMessage,
    removeMessage,
  } = useChat();
  const { consent, getAccessToken, isAdmin } = useAuth();

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

  const performRequest = React.useCallback(
    async (input: {
      conversation: NonNullable<typeof activeConversation>;
      userMessageId: string;
      assistantId: string;
      text: string;
      history: PierrotHistoryItem[];
    }) => {
      setSending(true);
      sendingRef.current = true;
      scrollToEnd(false);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getAccessToken();

        const result = await sendPierrot({
          message: input.text,
          conversationId: input.conversation.id,
          sessionId: input.conversation.sessionId,
          userMessageId: input.userMessageId,
          history: input.history,
          consent: { state: consent, version: null },
          token,
          signal: controller.signal,
        });

        if (result.humanMode) {
          updateMessage(input.conversation.id, input.assistantId, {
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

        updateMessage(input.conversation.id, input.assistantId, {
          status: 'complete',
          content: result.reply,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          sources: result.rag?.sources?.map((source) => ({
            documentTitle: source.documentTitle,
            heading: source.heading,
            canonicalUrl: source.canonicalUrl,
            similarity: source.similarity,
            sourceType: source.sourceType,
          })),
        });
      } catch (error) {
        if (error instanceof ApiError && error.code === 'ABORTED') {
          updateMessage(input.conversation.id, input.assistantId, {
            status: 'error',
            content: 'Response interrupted.',
            errorCode: 'ABORTED',
          });
        } else {
          updateMessage(input.conversation.id, input.assistantId, {
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
    [consent, getAccessToken, scrollToEnd, updateMessage]
  );

  const send = React.useCallback(
    async (raw?: string) => {
      const text = (raw ?? draft).trim();

      if (!text || sendingRef.current) return;

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
      await performRequest({
        conversation,
        userMessageId: userMessage.id,
        assistantId,
        text,
        history,
      });
    },
    [activeConversation, appendMessage, createConversation, draft, performRequest]
  );

  const remember = React.useCallback(
    async (message: ChatMessage) => {
      const conversation = activeConversation;
      if (!conversation) return;

      try {
        const token = await getAccessToken();
        if (!token) return;
        await createDecision(token, {
          kind: 'decision',
          title: message.content.replace(/\s+/g, ' ').slice(0, 120),
          content: message.content,
          conversationId: conversation.id,
          messageId: message.id,
          project: 'Pierrot',
        });
        Alert.alert('Saved', 'Added to Decision Memory. Review it from Settings.');
      } catch (requestError) {
        Alert.alert('Could not save', friendlyApiMessage(requestError));
      }
    },
    [activeConversation, getAccessToken]
  );

  const retry = React.useCallback(
    async (errorMessage: ChatMessage) => {
      const conversation = activeConversation;
      const text = errorMessage.retryText?.trim();

      if (!conversation || !text || sendingRef.current) return;

      const userMessage = [...conversation.messages]
        .reverse()
        .find((message) => message.role === 'user' && message.content.trim() === text);

      if (!userMessage) return;

      const assistantId = Crypto.randomUUID();
      const history = buildHistory(
        conversation.messages.filter(
          (message) => message.id !== userMessage.id && message.id !== errorMessage.id
        )
      );

      removeMessage(conversation.id, errorMessage.id);
      appendMessage(conversation.id, {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'pending',
        retryText: text,
      });

      await performRequest({
        conversation,
        userMessageId: userMessage.id,
        assistantId,
        text,
        history,
      });
    },
    [activeConversation, appendMessage, performRequest, removeMessage]
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
            onRetry={() => {
              void retry(item);
            }}
            onSendToDev={isAdmin ? () => router.push('/dev') : undefined}
            onRemember={isAdmin ? () => void remember(item) : undefined}
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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  pane: {
    flex: 1,
    backgroundColor: colors.background,
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
    borderBottomColor: colors.line,
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
    color: colors.text,
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
    color: colors.textSecondary,
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
    gap: spacing.md,
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
    color: colors.textSecondary,
    maxWidth: 460,
  },
  suggestions: {
    marginTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  suggestionText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 23,
    color: colors.textSecondary,
  },
  suggestionArrow: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textFaint,
  },
  pressed: {
    opacity: 0.65,
  },
  });
};
