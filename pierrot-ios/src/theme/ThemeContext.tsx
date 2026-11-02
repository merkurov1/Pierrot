import React from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { themes, type ThemeColors } from '@/constants/theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'pierrot.theme.v1';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  colors: ThemeColors;
  isDark: boolean;
  setPreference: (value: ThemePreference) => Promise<void>;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = React.useState<ThemePreference>('light');
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (mounted && isPreference(stored)) setPreferenceState(stored);
      } catch {
        // Default light is safe if secure storage is unavailable.
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const setPreference = React.useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);

    try {
      await SecureStore.setItemAsync(STORAGE_KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch {
      // The choice still applies for the current process.
    }
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      colors: themes[resolved],
      isDark: resolved === 'dark',
      setPreference,
    }),
    [preference, resolved, setPreference]
  );

  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = React.useContext(ThemeContext);

  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');

  return value;
}

export function useThemedStyles<T extends Record<string, unknown>>(
  factory: (colors: ThemeColors) => T
): T {
  const { colors } = useTheme();
  return React.useMemo(
    () => StyleSheet.create(factory(colors) as never) as unknown as T,
    [colors, factory]
  );
}
