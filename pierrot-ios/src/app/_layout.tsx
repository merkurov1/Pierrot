import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/auth/AuthContext';
import { ChatProvider } from '@/chat/ChatContext';
import { MobileBackendProvider } from '@/mobile/MobileBackendContext';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

function RootLayoutInner() {
  const { colors, isDark } = useTheme();

  React.useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <SafeAreaProvider>
      <MobileBackendProvider>
        <AuthProvider>
          <ChatProvider>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
                animation: 'fade',
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="history"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="search"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <Stack.Screen
                name="decisions"
                options={{
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
            </Stack>
          </ChatProvider>
        </AuthProvider>
      </MobileBackendProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
