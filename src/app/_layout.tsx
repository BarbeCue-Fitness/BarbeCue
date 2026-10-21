import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';

import '@/global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{ headerShown: false }}
        initialRouteName="(auth)">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="filters" options={{ presentation: 'modal', headerShown: true, title: 'Filters' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Chat' }} />
        <Stack.Screen name="(auth)" />
      </Stack>
    </ThemeProvider>
  );
}
