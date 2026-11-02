import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { friendlyApiMessage } from '@/api/client';
import {
  unifiedSearch,
  type SearchResultItem,
  type SearchScope,
  type UnifiedSearchResult,
} from '@/api/mobile';
import { useAuth } from '@/auth/AuthContext';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { formatFlowDate } from '@/lib/format';
import { fonts, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

const SCOPES: { id: SearchScope; label: string }[] = [
  { id: 'brain', label: 'Brain' },
  { id: 'media', label: 'Media' },
  { id: 'flow', label: 'Flow' },
  { id: 'archive', label: 'Conversations' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'web', label: 'Web' },
  { id: 'github', label: 'GitHub' },
];

export default function SearchScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { session, isAdmin, getAccessToken } = useAuth();
  const [query, setQuery] = React.useState('');
  const [auto, setAuto] = React.useState(true);
  const [selected, setSelected] = React.useState<SearchScope[]>([]);
  const [result, setResult] = React.useState<UnifiedSearchResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    const text = query.trim();
    if (!text || busy) return;

    setBusy(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Owner session required.');
        return;
      }

      setResult(
        await unifiedSearch(token, {
          query: text,
          ...(auto ? {} : { scopes: selected }),
          limit: 6,
        })
      );
    } catch (requestError) {
      setError(friendlyApiMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const open = (item: SearchResultItem) => {
    if (item.url) {
      void WebBrowser.openBrowserAsync(item.url);
      return;
    }

    if (item.scope === 'archive' && item.deepLink.includes('conversation=')) {
      const conversation = item.deepLink.split('conversation=')[1]?.split('&')[0];
      if (conversation) {
        router.replace({ pathname: '/history', params: { conversation } });
      }
      return;
    }

    if (item.scope === 'decisions') router.replace('/history');
    if (item.scope === 'brain') router.replace('/brain');
    if (item.scope === 'github') router.replace('/dev');
  };

  if (!session || !isAdmin) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader
            eyebrow="Retrieval"
            title="Search"
            subtitle="Web, Brain, Media, conversations, decisions and GitHub."
          />
          <Notice
            title="Owner access required"
            message="Sign in with the owner account in Settings to use the unified search."
          />
          <ActionButton label="Close" variant="outline" onPress={() => router.back()} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen bottomInset>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <PageHeader
          eyebrow="Retrieval"
          title="Search"
          subtitle="One query across the archive, media, Brain, GitHub and the web."
          action={
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
          }
        />

        <TextField
          label="Query"
          value={query}
          onChangeText={setQuery}
          placeholder="What are you looking for?"
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => void run()}
        />

        <View style={styles.scopeRow}>
          <Pressable
            onPress={() => setAuto((value) => !value)}
            style={[styles.chip, auto && styles.chipActive]}>
            <Text style={[styles.chipText, auto && styles.chipTextActive]}>Auto</Text>
          </Pressable>
          {SCOPES.map((scope) => {
            const active = selected.includes(scope.id);
            return (
              <Pressable
                key={scope.id}
                disabled={auto}
                onPress={() =>
                  setSelected((current) =>
                    active ? current.filter((value) => value !== scope.id) : [...current, scope.id]
                  )
                }
                style={[styles.chip, active && styles.chipActive, auto && styles.chipDisabled]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {scope.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <ActionButton
            label={busy ? 'Searching' : 'Search'}
            onPress={() => void run()}
            loading={busy}
            disabled={!query.trim()}
          />
          <Text style={styles.help}>
            {auto ? 'Sources are selected from the query.' : `${selected.length} sources selected.`}
          </Text>
        </View>

        {error ? <Notice tone="error" title="Search failed" message={error} /> : null}

        {result ? (
          <View style={styles.results}>
            <View style={styles.synthesis}>
              <Text style={styles.synthesisLabel}>
                {result.partial ? 'Partial answer' : 'Grounded answer'}
              </Text>
              <Text style={styles.synthesisText}>{result.synthesis}</Text>
              <Text style={styles.meta}>
                {result.routedScopes.join(' · ')} · {formatFlowDate(result.generatedAt)}
              </Text>
            </View>

            {result.sources.map((source) => (
              <View key={source.scope} style={styles.source}>
                <View style={styles.sourceHeader}>
                  <Text style={styles.sourceLabel}>{source.scope}</Text>
                  <Text style={styles.meta}>
                    {source.status === 'ok' ? `${source.count} result${source.count === 1 ? '' : 's'}` : source.code || source.status}
                  </Text>
                </View>
                {source.results.map((item) => (
                  <Pressable key={`${source.scope}-${item.id}`} onPress={() => open(item)} style={styles.item}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
                    {item.excerpt ? (
                      <Text numberOfLines={3} style={styles.itemExcerpt}>
                        {item.excerpt}
                      </Text>
                    ) : null}
                    <Text style={styles.meta}>
                      {item.source}
                      {item.date ? ` · ${formatFlowDate(item.date)}` : ''}
                      {item.novelty === 'new' ? ' · new' : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        ) : busy ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.textMuted} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      borderWidth: 1,
      borderColor: colors.lineStrong,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
    },
    chipActive: { backgroundColor: colors.text, borderColor: colors.text },
    chipDisabled: { opacity: 0.45 },
    chipText: { fontFamily: fonts.sans, fontSize: 11, color: colors.textSecondary },
    chipTextActive: { color: colors.inverseText },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
    help: { ...type.bodySmall, color: colors.textFaint, flexShrink: 1 },
    results: { gap: spacing.lg, marginTop: spacing.sm },
    synthesis: { gap: spacing.xs, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
    synthesisLabel: { ...type.label, color: colors.accent },
    synthesisText: { ...type.body, color: colors.text },
    meta: { fontFamily: fonts.mono, fontSize: 9, lineHeight: 14, color: colors.textFaint },
    source: { gap: spacing.xs, paddingTop: spacing.sm },
    sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sourceLabel: { ...type.label, fontSize: 9 },
    item: {
      gap: 3,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
    itemTitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, color: colors.text },
    itemSubtitle: { fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted },
    itemExcerpt: { ...type.bodySmall, color: colors.textSecondary },
    loading: { paddingVertical: spacing.xxl, alignItems: 'center' },
    link: {
      fontFamily: fonts.mono,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.accent,
    },
  });
};
