import React from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { friendlyApiMessage } from '@/api/client';
import { deleteDecision, listDecisions, type Decision } from '@/api/mobile';
import { useAuth } from '@/auth/AuthContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { fonts, layout, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

export default function DecisionsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { session, isAdmin, getAccessToken } = useAuth();
  const [items, setItems] = React.useState<Decision[]>([]);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!session || !isAdmin) {
      setBusy(false);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) return;
      const result = await listDecisions(token, { limit: 50 });
      setItems(result.items);
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(false);
    }
  }, [getAccessToken, isAdmin, session]);

  React.useEffect(() => {
    // Initial network load; setState happens after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const remove = (decision: Decision) => {
    Alert.alert('Delete decision?', decision.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const token = await getAccessToken();
              if (!token) return;
              await deleteDecision(token, decision.id);
              setItems((current) => current.filter((item) => item.id !== decision.id));
            } catch (requestError) {
              setError(friendlyApiMessage(requestError));
            }
          })();
        },
      },
    ]);
  };

  return (
    <Screen bottomInset>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Memory"
          title="Decisions"
          subtitle="User-confirmed decisions, positions, preferences, constraints and tasks."
          action={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          }
        />

        {!session || !isAdmin ? (
          <Notice
            title="Owner access required"
            message="Sign in with the owner account in Settings to review Decision Memory."
          />
        ) : null}
        {error ? <Notice tone="error" title="Decision memory" message={error} /> : null}

        {busy ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No decisions saved yet. Use “Remember” on a message.</Text>
        ) : (
          items.map((decision) => (
            <View key={decision.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.kind}>{decision.kind}</Text>
                <Text style={styles.status}>{decision.status}</Text>
              </View>
              <Text style={styles.title}>{decision.title}</Text>
              <Text style={styles.body}>{decision.content}</Text>
              {decision.project ? <Text style={styles.meta}>Project · {decision.project}</Text> : null}
              <View style={styles.cardActions}>
                <ActionButton label="Delete" variant="quiet" onPress={() => remove(decision)} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: layout.content,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    center: { paddingVertical: spacing.xxl, alignItems: 'center' },
    empty: { ...type.bodySmall, color: colors.textMuted },
    card: {
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    kind: { ...type.label, fontSize: 9 },
    status: { fontFamily: fonts.mono, fontSize: 9, color: colors.accent },
    title: { ...type.heading, fontSize: 19, lineHeight: 25 },
    body: { ...type.bodySmall, color: colors.textSecondary },
    meta: { ...type.meta, color: colors.textFaint },
    cardActions: { alignSelf: 'flex-start', marginTop: spacing.xs },
    link: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.accent,
    },
  });
};
