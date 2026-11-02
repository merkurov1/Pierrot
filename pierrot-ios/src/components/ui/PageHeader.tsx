import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { layout, spacing, type } from '@/constants/theme';

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, subtitle, action }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: layout.content,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  body: {
    flex: 1,
  },
  eyebrow: {
    ...type.label,
    marginBottom: spacing.sm,
  },
  title: {
    ...type.title,
  },
  subtitle: {
    ...type.bodySmall,
    marginTop: spacing.sm,
    maxWidth: 520,
  },
  action: {
    paddingTop: spacing.xs,
  },
});
