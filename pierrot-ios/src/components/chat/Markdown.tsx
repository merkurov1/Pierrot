import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { absoluteSiteUrl } from '@/config/env';
import { fonts, palette, radius, spacing, type } from '@/constants/theme';

type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

type Block =
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'code'; text: string; language: string | null };

const INLINE_PATTERN =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^()\s]+\)|https?:\/\/[^\s<>()]+)/g;

const SAFE_LINK = /^(https?:\/\/|mailto:|\/|#)/i;

function trimBareUrl(value: string): string {
  return value.replace(/[.,;:!?]+$/g, '').replace(/[)\]]+$/g, '');
}

function parseInline(value: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of value.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      tokens.push({ kind: 'text', text: value.slice(cursor, index) });
    }

    const raw = match[0];

    if (raw.startsWith('`')) {
      tokens.push({ kind: 'code', text: raw.slice(1, -1) });
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      tokens.push({ kind: 'bold', text: raw.slice(2, -2) });
    } else if (raw.startsWith('*') || raw.startsWith('_')) {
      tokens.push({ kind: 'italic', text: raw.slice(1, -1) });
    } else if (raw.startsWith('[')) {
      const close = raw.indexOf('](');
      const label = raw.slice(1, close);
      const href = raw.slice(close + 2, -1);

      if (SAFE_LINK.test(href)) {
        tokens.push({ kind: 'link', text: label, href });
      } else {
        tokens.push({ kind: 'text', text: label });
      }
    } else {
      const url = trimBareUrl(raw);
      tokens.push({ kind: 'link', text: url, href: url });

      const trailing = raw.slice(url.length);
      if (trailing) tokens.push({ kind: 'text', text: trailing });
    }

    cursor = index + raw.length;
  }

  if (cursor < value.length) {
    tokens.push({ kind: 'text', text: value.slice(cursor) });
  }

  return tokens.length > 0 ? tokens : [{ kind: 'text', text: value }];
}

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  let code: { text: string[]; language: string | null } | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: 'paragraph', lines: paragraph });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list) {
      blocks.push({ kind: 'list', ordered: list.ordered, items: list.items });
      list = null;
    }
  };

  const flushQuote = () => {
    if (quote.length > 0) {
      blocks.push({ kind: 'quote', lines: quote });
      quote = [];
    }
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    if (code) {
      if (/^```/.test(line.trim())) {
        blocks.push({
          kind: 'code',
          text: code.text.join('\n'),
          language: code.language,
        });
        code = null;
      } else {
        code.text.push(line);
      }
      continue;
    }

    if (/^```/.test(line.trim())) {
      flushAll();
      code = { text: [], language: line.trim().slice(3).trim() || null };
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      continue;
    }

    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (quoteLine) {
      flushParagraph();
      flushList();
      quote.push(quoteLine[1]);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.*)$/);

    if (unordered || ordered) {
      flushParagraph();
      flushQuote();

      const isOrdered = Boolean(ordered);
      const item = (ordered?.[1] ?? unordered?.[1] ?? '').trim();

      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }

      list.items.push(item);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  if (code) {
    blocks.push({ kind: 'code', text: code.text.join('\n'), language: code.language });
  }

  flushAll();

  return blocks;
}

async function openLink(href: string) {
  if (href.startsWith('#')) return;

  const target = href.startsWith('/') ? absoluteSiteUrl(href) : href;

  try {
    if (/^https?:\/\//i.test(target)) {
      await WebBrowser.openBrowserAsync(target);
      return;
    }

    await Linking.openURL(target);
  } catch {
    // A malformed link must not crash the transcript.
  }
}

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        switch (token.kind) {
          case 'bold':
            return (
              <Text key={index} style={styles.bold}>
                {token.text}
              </Text>
            );
          case 'italic':
            return (
              <Text key={index} style={styles.italic}>
                {token.text}
              </Text>
            );
          case 'code':
            return (
              <Text key={index} style={styles.inlineCode}>
                {token.text}
              </Text>
            );
          case 'link':
            return (
              <Text
                key={index}
                style={styles.link}
                onPress={() => {
                  void openLink(token.href);
                }}>
                {token.text}
              </Text>
            );
          default:
            return <React.Fragment key={index}>{token.text}</React.Fragment>;
        }
      })}
    </>
  );
}

export function Markdown({
  content,
  style,
}: {
  content: string;
  style?: StyleProp<TextStyle>;
}) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const headingStyle =
            block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;

          return (
            <Text key={index} selectable style={[styles.heading, headingStyle, style]}>
              <Inline tokens={parseInline(block.text)} />
            </Text>
          );
        }

        if (block.kind === 'list') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listRow}>
                  <Text selectable style={[styles.bullet, style]}>
                    {block.ordered ? `${itemIndex + 1}.` : '—'}
                  </Text>
                  <Text selectable style={[styles.body, styles.listText, style]}>
                    <Inline tokens={parseInline(item)} />
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        if (block.kind === 'quote') {
          return (
            <View key={index} style={styles.quote}>
              <Text selectable style={[styles.body, styles.quoteText, style]}>
                <Inline tokens={parseInline(block.lines.join('\n'))} />
              </Text>
            </View>
          );
        }

        if (block.kind === 'code') {
          return (
            <ScrollView
              key={index}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.codeBlock}
              contentContainerStyle={styles.codeContent}>
              <Text selectable style={styles.codeText}>
                {block.text}
              </Text>
            </ScrollView>
          );
        }

        return (
          <Text key={index} selectable style={[styles.body, style]}>
            <Inline tokens={parseInline(block.lines.join('\n'))} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  body: {
    ...type.body,
  },
  heading: {
    color: palette.text,
    fontFamily: fonts.serif,
    letterSpacing: -0.2,
  },
  h1: {
    fontSize: 25,
    lineHeight: 32,
    marginTop: spacing.xs,
  },
  h2: {
    fontSize: 21,
    lineHeight: 28,
    marginTop: spacing.xs,
  },
  h3: {
    fontSize: 18,
    lineHeight: 25,
    marginTop: spacing.xxs,
  },
  bold: {
    fontWeight: '600',
  },
  italic: {
    fontStyle: 'italic',
  },
  link: {
    color: '#D9D3C8',
    textDecorationLine: 'underline',
  },
  inlineCode: {
    fontFamily: fonts.mono,
    fontSize: 14,
    backgroundColor: palette.surfaceRaised,
    color: palette.text,
  },
  list: {
    gap: spacing.xs,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bullet: {
    ...type.body,
    color: palette.textMuted,
    width: 22,
  },
  listText: {
    flex: 1,
  },
  quote: {
    borderLeftWidth: 1,
    borderLeftColor: palette.lineStrong,
    paddingLeft: spacing.md,
  },
  quoteText: {
    color: palette.textSecondary,
    fontStyle: 'italic',
  },
  codeBlock: {
    backgroundColor: palette.surface,
    borderRadius: radius.sm,
  },
  codeContent: {
    padding: spacing.md,
  },
  codeText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 20,
    color: palette.textSecondary,
  },
});
