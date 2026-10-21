import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

type ColorScheme = 'light' | 'dark';

function subscribe(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

function getSnapshot(): ColorScheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function getServerSnapshot(): ColorScheme {
  return 'light';
}

export function useColorScheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
