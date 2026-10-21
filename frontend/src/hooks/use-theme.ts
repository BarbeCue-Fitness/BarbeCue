/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { getColorSet } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettings } from '@/contexts/settings-context';

/** The light/dark mode actually in effect: the user's choice, or the system when set to System. */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const { colorMode } = useSettings();
  const systemScheme = useColorScheme();
  if (colorMode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
  return colorMode;
}

export function useTheme() {
  const { themeName } = useSettings();
  return getColorSet(themeName, useResolvedColorScheme());
}
