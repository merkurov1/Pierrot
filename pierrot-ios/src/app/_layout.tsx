import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/AuthContext';
import { ChatProvider } from '@/chat/ChatContext';
import { palette } from '@/constants/theme';

export default function RootLayout() {
  React.useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChatProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.background },
              animation: 'fade',
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="history"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                contentStyle: { backgroundColor: palette.background },
              }}
            />
          </Stack>
        </ChatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
