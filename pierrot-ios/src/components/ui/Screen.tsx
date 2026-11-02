import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemedStyles } from '@/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColors } from '@/constants/theme';

export function Screen({
  children,
  style,
  bottomInset = false,
}: React.PropsWithChildren<{ style?: ViewStyle; bottomInset?: boolean }>) {
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  });
};
