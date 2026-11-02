import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useChat } from '@/chat/ChatContext';
import { Screen } from '@/components/ui/Screen';
import { formatRelative } from '@/lib/format';
import { fonts, layout, palette, spacing, type } from '@/constants/theme';

export default function HistoryScreen() {
  const { conversations, setActiveId, startNewConversation, deleteConversation } = useChat();

  const close = () => router.back();

  const select = (id: string) => {
    setActiveId(id);
    close();
  };

  const create = () => {
    startNewConversation();
    close();
  };

  const remove = (id: string, title: string) => {
    Alert.alert('Delete conversation?', `“${title}” will be removed from this device.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(id) },
    ]);
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
            <Text style={styles.action}>New conversation</Text>
          </Pressable>
          <Text style={styles.count}>
            {conversations.length} {conversations.length === 1 ? 'thread' : 'threads'}
          </Text>
        </View>

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

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete conversation"
                  hitSlop={8}
                  onPress={() => remove(conversation.id, conversation.title)}>
                  <Text style={styles.delete}>Delete</Text>
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: palette.textSecondary,
    paddingTop: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: palette.line,
    paddingVertical: spacing.sm,
  },
  count: {
    ...type.meta,
    color: palette.textFaint,
  },
  list: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  empty: {
    ...type.bodySmall,
    color: palette.textMuted,
    paddingTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  pressed: {
    opacity: 0.65,
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 25,
    color: palette.text,
  },
  rowMeta: {
    ...type.meta,
    color: palette.textFaint,
  },
  delete: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: palette.textFaint,
  },
});
