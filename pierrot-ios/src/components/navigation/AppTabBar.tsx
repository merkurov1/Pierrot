import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeContext';
import { useMobileBackend } from '@/mobile/MobileBackendContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, layout, spacing, ThemeColors } from '@/constants/theme';

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
  dev: 'Dev',
  settings: 'Settings',
};

export function AppTabBar({ state, descriptors, emitter, navigateToTab }: TabBarProps) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { available } = useMobileBackend();

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.inner}>
        {state.routes.map((route, index) => {
          if (route.name === 'dev' && !available) return null;

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

const makeStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
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
    backgroundColor: colors.text,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.textFaint,
  },
  labelActive: {
    color: colors.text,
  },
  });
};
