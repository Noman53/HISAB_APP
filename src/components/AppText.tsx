import React from 'react';
import { Text, TextProps } from 'react-native';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';

type AppTextProps = TextProps & { localized?: boolean };

export function AppText({ style, children, localized = false, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const { translate } = useLanguage();
  const text = localized && typeof children === 'string' ? translate(children) : children;
  return <Text {...props} style={[{ color: colors.text, fontFamily: 'System' }, style]}>{text}</Text>;
}
