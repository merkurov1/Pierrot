import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { fonts, radius, typography, type ThemeColors } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/theme/ThemeContext';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  square?: boolean;
};

function initials(name?: string | null): string {
  const value = name?.trim();
  if (!value) return 'P';

  const parts = value.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

export function Avatar({ uri, name, size = 32, square = false }: AvatarProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const radiusValue = square ? radius.sm : size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radiusValue }}
        contentFit="cover"
        transition={160}
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radiusValue }]}>
      <Text style={[styles.initials, { fontSize: Math.max(9, size * 0.3), color: colors.textSecondary }]}>
        {initials(name)}
      </Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => {
  const type = typography(colors);

  return {
    fallback: {
      backgroundColor: colors.surfaceActive,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    initials: {
      fontFamily: fonts.mono,
      letterSpacing: 0.5,
      color: type.label.color,
    },
  };
};
