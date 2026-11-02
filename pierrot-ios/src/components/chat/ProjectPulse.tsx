import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { useProjectStatus } from '@/hooks/useProjectStatus';
import { useMobileBackend } from '@/mobile/MobileBackendContext';
import { formatRelative } from '@/lib/format';
import { fonts, spacing, typography, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

type Metric = { label: string; value: number | null };

function valueOrDash(value: number | null): string {
  return typeof value === 'number' ? value.toLocaleString('en-GB') : '—';
}

export function ProjectPulse({ compact = false }: { compact?: boolean }) {
  const { isAdmin, session } = useAuth();
  const { available } = useMobileBackend();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { data, loading, error, refresh } = useProjectStatus();

  if (!available || !session || !isAdmin) return null;

  const metrics: Metric[] = [
    { label: 'Conversations · 7d', value: data?.metrics.conversations7d ?? null },
    { label: 'Brain docs', value: data?.metrics.brainDocuments ?? null },
    { label: 'Flow · 30d', value: data?.metrics.flowPublished ?? null },
    { label: 'Subscribers', value: data?.metrics.activeSubscribers ?? null },
  ];

  const level = data?.level ?? (error ? 'attention' : 'calm');
  const dotColor =
    level === 'action' ? colors.danger : level === 'attention' ? '#A87935' : colors.success;

  return (
    <View style={[styles.root, compact && styles.compact]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Project pulse</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh project status"
          onPress={() => void refresh()}
          hitSlop={8}>
          <Text style={styles.refresh}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricValue}>{valueOrDash(metric.value)}</Text>
            <Text numberOfLines={1} style={styles.metricLabel}>
              {metric.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text numberOfLines={3} style={styles.status}>
          {error
            ? 'Status unavailable.'
            : data?.summary ||
              'Project status has not loaded yet.'}
        </Text>
      </View>

      <Text style={styles.updated}>
        {error
          ? 'Check the connection'
          : data
            ? `Updated ${formatRelative(data.generatedAt)}${data.dataGaps.length > 0 ? ' · partial data' : ''}`
            : 'No status yet'}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);

  return {
    root: {
      borderTopWidth: 1,
      borderTopColor: colors.line,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    compact: {
      paddingTop: spacing.sm,
    },
    header: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    eyebrow: {
      ...type.label,
      fontSize: 9,
      color: colors.textMuted,
    },
    refresh: {
      ...type.meta,
      fontSize: 9,
      color: colors.textFaint,
      textTransform: 'uppercase' as const,
    },
    grid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.xs,
    },
    metric: {
      width: '48%' as const,
      minHeight: 36,
      justifyContent: 'center' as const,
    },
    metricValue: {
      fontFamily: fonts.serif,
      fontSize: 19,
      lineHeight: 23,
      color: colors.text,
    },
    metricLabel: {
      fontFamily: fonts.mono,
      fontSize: 8,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
      color: colors.textFaint,
    },
    statusRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing.xs,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginTop: 5,
    },
    status: {
      flex: 1,
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    updated: {
      fontFamily: fonts.mono,
      fontSize: 8,
      letterSpacing: 0.4,
      color: colors.textFaint,
    },
  };
};
