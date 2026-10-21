import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const backgroundColor =
    colorScheme === 'dark'
      ? darkColor ?? theme[type ?? 'background']
      : lightColor ?? theme[type ?? 'background'];

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
