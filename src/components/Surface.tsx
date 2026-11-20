import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { radius } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export function Surface({ children, style }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors, isDark } = useTheme();
  return <View style={[{ backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, shadowColor: '#0F172A', shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: isDark ? 0 : 1 }, style]}>{children}</View>;
}
