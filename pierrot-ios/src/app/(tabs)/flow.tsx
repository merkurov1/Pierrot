import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { friendlyApiMessage } from '@/api/client';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';
import { getFlowItems } from '@/api/flow';
import type { FlowItem } from '@/api/types';
import { FlowCard } from '@/components/flow/FlowCard';
import { ActionButton } from '@/components/ui/ActionButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { spacing, typography, ThemeColors } from '@/constants/theme';

const PAGE_SIZE = 12;

export default function FlowScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const columns = width >= 1180 ? 3 : width >= 760 ? 2 : 1;

  const [items, setItems] = React.useState<FlowItem[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [offset, setOffset] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const requestRef = React.useRef(0);

  const load = React.useCallback(
    async (mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'more' && (loadingMore || !hasMore || loading)) return;

      const requestId = ++requestRef.current;
      const nextOffset = mode === 'more' ? offset : 0;

      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);

      setError(null);

      try {
        const data = await getFlowItems(PAGE_SIZE, nextOffset);

        if (requestRef.current !== requestId) return;

        setItems((current) => {
          if (mode === 'more') {
            const seen = new Set(current.map((item) => item.id));
            return [...current, ...data.items.filter((item) => !seen.has(item.id))];
          }

          return data.items;
        });
        setOffset(data.nextOffset);
        setHasMore(data.hasMore);
      } catch (requestError) {
        if (requestRef.current === requestId) {
          setError(friendlyApiMessage(requestError));
        }
      } finally {
        if (requestRef.current === requestId) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [hasMore, loading, loadingMore, offset]
  );

  const initialLoadRef = React.useRef(false);

  React.useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    // Initial network load. setState happens after the request resolves.
    void load('initial');
  }, [load]);

  return (
    <Screen>
      <FlatList
        key={`flow-${columns}`}
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        renderItem={({ item }) => <FlowCard item={item} />}
        ListHeaderComponent={
          <View>
            <PageHeader
              eyebrow="Stream"
              title="Flow"
              subtitle="Notes, links, images and video. Published from the same Flow archive as the website."
              action={
                <ActionButton
                  label="Refresh"
                  variant="quiet"
                  onPress={() => void load('refresh')}
                  loading={refreshing}
                />
              }
            />

            {error ? (
              <Notice title="Flow unavailable" message={error} tone="error">
                <ActionButton
                  label="Try again"
                  variant="outline"
                  onPress={() => void load('initial')}
                />
              </Notice>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.loadingText}>Loading Flow</Text>
            </View>
          ) : !error ? (
            <Text style={styles.empty}>No published Flow entries yet.</Text>
          ) : undefined
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          ) : items.length > 0 && !hasMore ? (
            <Text style={styles.end}>End of the stream.</Text>
          ) : undefined
        }
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load('refresh')}
            tintColor={colors.textMuted}
          />
        }
        onEndReached={() => void load('more')}
        onEndReachedThreshold={0.45}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);
  return StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  column: {
    gap: spacing.lg,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...type.meta,
    color: colors.textMuted,
  },
  empty: {
    ...type.bodySmall,
    color: colors.textMuted,
    paddingVertical: spacing.xl,
  },
  footerLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  end: {
    ...type.meta,
    color: colors.textFaint,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  });
};
