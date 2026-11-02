import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

import type { FlowItem } from '@/api/types';
import { absoluteSiteUrl } from '@/config/env';
import { firstLine, formatFlowDate, hostFromUrl, plainTextFromMarkdown } from '@/lib/format';
import { fonts, palette, radius, spacing, type } from '@/constants/theme';

const TYPE_LABEL: Record<string, string> = {
  note: 'Note',
  article: 'Article',
  link: 'Link',
  photo: 'Photograph',
  video: 'Video',
  quote: 'Quote',
};

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function imageFor(item: FlowItem): string | null {
  const meta = item.metadata ?? {};
  const direct =
    stringValue(meta.public_url) ??
    stringValue(meta.image) ??
    stringValue(meta.image_url) ??
    stringValue(meta.og_image);

  if (direct) return direct;

  if (Array.isArray(meta.images)) {
    for (const entry of meta.images) {
      const url =
        stringValue(entry) ??
        stringValue(recordValue(entry)?.url) ??
        stringValue(recordValue(entry)?.public_url);

      if (url) return url;
    }
  }

  const youtube = recordValue(meta.youtube);
  const thumbnail = stringValue(youtube?.thumbnail_url);
  const videoId = stringValue(youtube?.video_id);

  if (thumbnail) return thumbnail;
  if (videoId) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return null;
}

function titleFor(item: FlowItem): string {
  const title = item.title?.trim();
  if (title) return title;

  const fromBody = firstLine(item.body_md);
  if (fromBody) return fromBody;

  return TYPE_LABEL[item.type] ?? 'Flow';
}

function excerptFor(item: FlowItem): string {
  const text = plainTextFromMarkdown(item.body_md);
  if (!text) return '';

  return text.length > 260 ? `${text.slice(0, 259).trimEnd()}…` : text;
}

export function FlowCard({ item }: { item: FlowItem }) {
  const image = imageFor(item);
  const title = titleFor(item);
  const excerpt = excerptFor(item);
  const host = hostFromUrl(item.source_url);
  const candidate = item.source_url || (item.slug ? absoluteSiteUrl(`/flow/${item.slug}`) : null);
  const href = candidate && /^https?:\/\//i.test(candidate) ? candidate : null;

  const open = () => {
    if (!href) return;
    void WebBrowser.openBrowserAsync(href);
  };

  return (
    <Pressable
      accessibilityRole="link"
      onPress={open}
      disabled={!href}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      {image ? (
        <Image
          source={{ uri: image }}
          style={styles.image}
          contentFit="cover"
          transition={180}
          accessibilityIgnoresInvertColors
        />
      ) : null}

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{TYPE_LABEL[item.type] ?? item.type}</Text>
        <Text style={styles.meta}>{formatFlowDate(item.published_at)}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>

      {excerpt && excerpt !== title ? <Text style={styles.excerpt}>{excerpt}</Text> : null}

      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.host}>
          {host || (item.slug ? 'merkurov.love' : 'Flow')}
        </Text>
        {href ? <Text style={styles.arrow}>↗</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
  pressed: {
    opacity: 0.72,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  meta: {
    ...type.label,
    fontSize: 9,
    color: palette.textFaint,
  },
  title: {
    ...type.heading,
    fontSize: 21,
    lineHeight: 28,
  },
  excerpt: {
    ...type.bodySmall,
    color: palette.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xxs,
  },
  host: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    color: palette.textFaint,
    flex: 1,
  },
  arrow: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: palette.textMuted,
  },
});
