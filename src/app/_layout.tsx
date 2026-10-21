import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';

import '@/global.css';

import { useResolvedColorScheme } from '@/hooks/use-theme';
import { FiltersProvider } from '@/contexts/filters-context';
import { SettingsProvider } from '@/contexts/settings-context';

function RootNavigator() {
  const colorScheme = useResolvedColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="(auth)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="more-filters" />
        <Stack.Screen name="color-theme" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <FiltersProvider>
        <RootNavigator />
      </FiltersProvider>
    </SettingsProvider>
  );
}
