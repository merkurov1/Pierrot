import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, layout, palette, spacing } from '@/constants/theme';

type TabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options?: { title?: unknown } }>;
  emitter: {
    emit: (event: any) => unknown;
  };
  navigateToTab: (routeKey: string) => void;
};
const LABELS: Record<string, string> = {
  index: 'Chat',
  brain: 'Brain',
  flow: 'Flow',
  settings: 'Settings',
};

export function AppTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label =
            LABELS[route.name] ??
            (typeof options?.title === 'string' ? options.title : route.name);

          const onPress = () => {
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            }) as { defaultPrevented?: boolean };

            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
              <View style={[styles.dot, focused && styles.dotActive]} />
              <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: palette.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
    paddingTop: spacing.xs,
  },
  inner: {
    width: '100%',
    maxWidth: layout.chat,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: layout.tabBarHeight - spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: palette.text,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: palette.textFaint,
  },
  labelActive: {
    color: palette.text,
  },
});
