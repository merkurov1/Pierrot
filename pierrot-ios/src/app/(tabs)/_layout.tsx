import React from 'react';
import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { palette } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: palette.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Chat' }} />
      <Tabs.Screen name="brain" options={{ title: 'Brain' }} />
      <Tabs.Screen name="flow" options={{ title: 'Flow' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
