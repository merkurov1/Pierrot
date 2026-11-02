import React from 'react';
import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Chat' }} />
      <Tabs.Screen name="brain" options={{ title: 'Brain' }} />
      <Tabs.Screen name="flow" options={{ title: 'Flow' }} />
      <Tabs.Screen name="dev" options={{ title: 'Dev' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
