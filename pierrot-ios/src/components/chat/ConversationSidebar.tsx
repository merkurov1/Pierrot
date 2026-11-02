import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import { formatRelative } from '@/lib/format';
import { fonts, palette, radius, spacing, type } from '@/constants/theme';

export function ConversationSidebar() {
  const { conversations, activeId, setActiveId, startNewConversation } = useChat();
  const { session, isAdmin } = useAuth();

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Text style={styles.wordmark}>Pierrot</Text>
        <Text style={styles.signature}>Digital shadow</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={startNewConversation}
        style={({ pressed }) => [styles.newButton, pressed && styles.pressed]}>
        <Text style={styles.newGlyph}>+</Text>
        <Text style={styles.newLabel}>New conversation</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Conversations</Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}>
        {conversations.length === 0 ? (
          <Text style={styles.empty}>No conversations yet.</Text>
        ) : (
          conversations.map((conversation) => {
            const active = conversation.id === activeId;

            return (
              <Pressable
                key={conversation.id}
                onPress={() => setActiveId(conversation.id)}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && styles.pressed,
                ]}>
                <Text numberOfLines={2} style={[styles.rowTitle, active && styles.rowTitleActive]}>
                  {conversation.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {formatRelative(conversation.updatedAt)}
                  {conversation.messages.length > 0
                    ? ` · ${conversation.messages.length}`
                    : ''}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.dot, session ? styles.dotOn : null]} />
        <View style={styles.footerText}>
          <Text style={styles.footerTitle}>
            {session ? (isAdmin ? 'Owner' : 'Signed in') : 'Guest'}
          </Text>
          <Text numberOfLines={1} style={styles.footerMeta}>
            {session?.user.email ?? 'Not signed in'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 292,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: palette.line,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.background,
  },
  brand: {
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xl,
  },
  wordmark: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: palette.text,
  },
  signature: {
    ...type.label,
    marginTop: spacing.xs,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.lineStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  newGlyph: {
    color: palette.textSecondary,
    fontSize: 18,
    lineHeight: 20,
  },
  newLabel: {
    ...type.meta,
    color: palette.textSecondary,
  },
  pressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    ...type.label,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: spacing.xxs,
    paddingBottom: spacing.md,
  },
  empty: {
    ...type.bodySmall,
    color: palette.textFaint,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    gap: 3,
  },
  rowActive: {
    backgroundColor: palette.surface,
  },
  rowTitle: {
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 19,
    color: palette.textSecondary,
  },
  rowTitleActive: {
    color: palette.text,
  },
  rowMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    color: palette.textFaint,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.textFaint,
  },
  dotOn: {
    backgroundColor: palette.success,
  },
  footerText: {
    flex: 1,
  },
  footerTitle: {
    ...type.meta,
    color: palette.textSecondary,
  },
  footerMeta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: palette.textFaint,
    marginTop: 1,
  },
});
