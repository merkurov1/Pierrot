import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { useChat } from '@/chat/ChatContext';
import { Avatar } from '@/components/ui/Avatar';
import { ProjectPulse } from '@/components/chat/ProjectPulse';
import { PIERROT_AVATAR_SRC } from '@/config/pierrot';
import { formatRelative } from '@/lib/format';
import { fonts, radius, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/theme/ThemeContext';

export function ConversationSidebar() {
  const { conversations, activeId, setActiveId, startNewConversation } = useChat();
  const { session, me, isAdmin } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const displayName = me?.user?.name || session?.user.name || session?.user.email || 'Guest';

  return (
    <View style={styles.root}>
      <View style={styles.brand}>
        <Avatar uri={PIERROT_AVATAR_SRC} name="Pierrot" size={30} />
        <View style={styles.brandText}>
          <Text style={styles.wordmark}>Pierrot</Text>
          <Text style={styles.signature}>
            {isAdmin ? 'Owner workspace' : 'Personal intelligence'}
          </Text>
        </View>
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
                <View style={styles.rowTitleLine}>
                  {conversation.pinned ? <Text style={styles.pin}>•</Text> : null}
                  <Text
                    numberOfLines={2}
                    style={[styles.rowTitle, active && styles.rowTitleActive]}>
                    {conversation.title}
                  </Text>
                </View>
                <Text style={styles.rowMeta}>
                  {formatRelative(conversation.updatedAt)}
                  {conversation.messages.length > 0 ? ` · ${conversation.messages.length}` : ''}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <ProjectPulse compact />

      <View style={styles.footer}>
        <Avatar uri={me?.user?.image} name={displayName} size={26} />
        <View style={styles.footerText}>
          <Text numberOfLines={1} style={styles.footerTitle}>
            {displayName}
          </Text>
          <Text numberOfLines={1} style={styles.footerMeta}>
            {session ? (isAdmin ? 'Owner / ADMIN' : 'Signed in') : 'Not signed in'}
          </Text>
        </View>
        <View style={[styles.dot, session ? styles.dotOn : null]} />
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);

  return {
    root: {
      width: 292,
      borderRightWidth: 1,
      borderRightColor: colors.line,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
    },
    brand: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.xl,
    },
    brandText: {
      flex: 1,
    },
    wordmark: {
      fontFamily: fonts.serif,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.6,
      color: colors.text,
    },
    signature: {
      ...type.label,
      fontSize: 8,
      marginTop: 2,
    },
    newButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
    },
    newGlyph: {
      color: colors.textSecondary,
      fontSize: 18,
      lineHeight: 20,
    },
    newLabel: {
      ...type.meta,
      color: colors.textSecondary,
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
      color: colors.textFaint,
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
      backgroundColor: colors.surface,
    },
    rowTitleLine: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: 4,
    },
    pin: {
      color: colors.accent,
      fontSize: 13,
      lineHeight: 18,
    },
    rowTitle: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    rowTitleActive: {
      color: colors.text,
    },
    rowMeta: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 0.5,
      color: colors.textFaint,
    },
    footer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    footerText: {
      flex: 1,
    },
    footerTitle: {
      ...type.meta,
      color: colors.textSecondary,
    },
    footerMeta: {
      fontFamily: fonts.sans,
      fontSize: 10,
      color: colors.textFaint,
      marginTop: 1,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textFaint,
    },
    dotOn: {
      backgroundColor: colors.success,
    },
  };
};
