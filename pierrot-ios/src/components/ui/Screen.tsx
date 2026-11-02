import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';

export function Screen({
  children,
  style,
  bottomInset = false,
}: React.PropsWithChildren<{ style?: ViewStyle; bottomInset?: boolean }>) {
  return (
    <View style={styles.root}>
      <SafeAreaView
        edges={bottomInset ? ['top', 'bottom', 'left', 'right'] : ['top', 'left', 'right']}
        style={[styles.safe, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safe: {
    flex: 1,
  },
});
