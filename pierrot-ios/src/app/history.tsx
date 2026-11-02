import React from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeContext';
import { router, useLocalSearchParams } from 'expo-router';

import { friendlyApiMessage } from '@/api/client';
import {
  deleteServerConversation,
  getServerConversation,
  importServerConversation,
  listServerConversations,
  updateServerConversation,
} from '@/api/mobile';
import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import type { Conversation } from '@/chat/types';
import { ProjectPulse } from '@/components/chat/ProjectPulse';
import { Screen } from '@/components/ui/Screen';
import { formatRelative } from '@/lib/format';
import { fonts, layout, spacing, typography, ThemeColors } from '@/constants/theme';

export default function HistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const {
    conversations,
    setActiveId,
    startNewConversation,
    deleteConversation,
    renameConversation,
    setPinned,
    upsertConversation,
  } = useChat();
  const { session, consent, getAccessToken } = useAuth();
  const params = useLocalSearchParams<{ conversation?: string }>();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const close = () => router.back();

  React.useEffect(() => {
    if (params.conversation) {
      setActiveId(params.conversation);
      router.back();
    }
  }, [params.conversation, setActiveId]);

  const select = (id: string) => {
    setActiveId(id);
    close();
  };

  const create = () => {
    startNewConversation();
    close();
  };

  const withToken = async (): Promise<string | null> => {
    if (!session) return null;
    return getAccessToken();
  };

  const remove = (id: string, title: string) => {
    Alert.alert(
      'Delete conversation?',
      `“${title}” will be removed from this device and, when possible, from the server archive.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteConversation(id);
            void withToken().then((token) => {
              if (token) void deleteServerConversation(token, id).catch(() => undefined);
            });
          },
        },
      ]
    );
  };

  const togglePin = (id: string, pinned: boolean) => {
    setPinned(id, !pinned);
    void withToken().then((token) => {
      if (token) {
        void updateServerConversation(token, id, { pinned: !pinned }).catch(() => undefined);
      }
    });
  };

  const rename = (conversation: Conversation) => {
    if (Platform.OS !== 'ios' || !Alert.prompt) return;

    Alert.prompt('Rename conversation', undefined, (value) => {
      const title = value?.trim();
      if (!title) return;
      renameConversation(conversation.id, title);
      void withToken().then((token) => {
        if (token) {
          void updateServerConversation(token, conversation.id, { title }).catch(() => undefined);
        }
      });
    }, 'plain-text', conversation.title);
  };

  const syncFromServer = async () => {
    if (!session || busy) return;
    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      const list = await listServerConversations(token, { limit: 50 });

      for (const item of list.items) {
        const local = conversations.find((conversation) => conversation.id === item.id);
        if (!local) continue;

        const detail = await getServerConversation(token, item.id);
        upsertConversation({
          ...local,
          title: detail.title || local.title,
          pinned: detail.pinned,
          updatedAt: detail.lastMessageAt || local.updatedAt,
          messages: detail.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            status: 'complete' as const,
            provider: message.provider || undefined,
          })),
        });
      }
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const importToServer = async () => {
    if (!session || busy) return;

    if (consent !== 'granted') {
      setError('Enable server transcript storage in Settings before importing.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      let imported = 0;

      for (const conversation of conversations) {
        const messages = conversation.messages
          .filter((message) => message.status === 'complete' && message.content.trim())
          .map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          }));

        if (messages.length === 0) continue;

        await importServerConversation(token, {
          conversationId: conversation.id,
          sessionId: conversation.sessionId,
          title: conversation.title,
          consent: 'granted',
          messages,
        });
        imported += 1;
      }

      Alert.alert('Archive imported', `${imported} conversation(s) are now in the server archive.`);
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen bottomInset>
      <View style={styles.root}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Archive</Text>
            <Text style={styles.title}>Conversations</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
            <Text style={styles.action}>Close</Text>
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <Pressable accessibilityRole="button" onPress={create} hitSlop={8}>
            <Text style={styles.action}>New</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void syncFromServer()} hitSlop={8}>
            <Text style={styles.action}>{busy ? 'Working…' : 'Sync'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void importToServer()} hitSlop={8}>
            <Text style={styles.action}>Import</Text>
          </Pressable>
          <Text style={styles.count}>
            {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <ProjectPulse compact />

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}>
          {conversations.length === 0 ? (
            <Text style={styles.empty}>Nothing here yet. Start a conversation in Chat.</Text>
          ) : (
            conversations.map((conversation) => (
              <Pressable
                key={conversation.id}
                onPress={() => select(conversation.id)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.rowBody}>
                  <Text numberOfLines={2} style={styles.rowTitle}>
                    {conversation.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {formatRelative(conversation.updatedAt)}
                    {conversation.messages.length > 0
                      ? ` · ${conversation.messages.length} messages`
                      : ''}
                  </Text>
                </View>

                <View style={styles.rowActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={conversation.pinned ? 'Unpin conversation' : 'Pin conversation'}
                    hitSlop={8}
                    onPress={() => togglePin(conversation.id, Boolean(conversation.pinned))}>
                    <Text style={styles.delete}>{conversation.pinned ? 'Unpin' : 'Pin'}</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => rename(conversation)}>
                    <Text style={styles.delete}>Rename</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete conversation"
                    hitSlop={8}
                    onPress={() => remove(conversation.id, conversation.title)}>
                    <Text style={styles.delete}>Delete</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: layout.content,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    ...type.label,
    marginBottom: spacing.sm,
  },
  title: {
    ...type.title,
  },
  action: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.textSecondary,
    paddingTop: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: spacing.sm,
  },
  count: {
    ...type.meta,
    color: colors.textFaint,
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  empty: {
    ...type.bodySmall,
    color: colors.textMuted,
    paddingTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  pressed: {
    opacity: 0.65,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  error: {
    ...type.bodySmall,
    color: colors.danger,
    paddingVertical: spacing.sm,
  },
  rowTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 25,
    color: colors.text,
  },
  rowMeta: {
    ...type.meta,
    color: colors.textFaint,
  },
  delete: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  });
};
