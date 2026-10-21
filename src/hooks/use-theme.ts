/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ColorScheme = 'light' | 'dark' | 'unspecified' | null;

export function getTheme(colorScheme: ColorScheme) {
  return Colors[colorScheme === 'dark' ? 'dark' : 'light'];
}

export function useTheme() {
  return getTheme(useColorScheme());
}
