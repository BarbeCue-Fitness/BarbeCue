import { LogBox } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useEffect, useState } from 'react';

import '@/global.css';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { FiltersProvider } from '@/contexts/filters-context';
import { SettingsProvider } from '@/contexts/settings-context';
import { loadSession } from '@/services/api';
import type { AuthUser } from '@/types';

// expo-router's forked stack card still calls the deprecated InteractionManager; the banner
// would otherwise surface inside the app on every screen stack push (dev builds only)
LogBox.ignoreLogs(['InteractionManager has been deprecated']);

function RootNavigator({ session }: { session: AuthUser | null }) {
  const colorScheme = useResolvedColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName={session ? '(tabs)' : '(auth)'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="more-filters" />
        <Stack.Screen name="color-theme" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="nutrition" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="(auth)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // restore the persisted session before the first navigation decision
  const [session, setSession] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void loadSession().then((user) => {
      if (!active) return;
      setSession(user);
      setReady(true);
    });
    return () => { active = false; };
  }, []);

  if (!ready) return null;

  return (
    <SettingsProvider>
      <FiltersProvider>
        <RootNavigator session={session} />
      </FiltersProvider>
    </SettingsProvider>
  );
}
