import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_THEME, THEMES, type ThemeName } from '@/constants/theme';
import { loadSettingsRaw, saveSettingsRaw } from '@/lib/settings-storage';

export type ColorMode = 'system' | 'light' | 'dark';
export type DistanceUnit = 'km' | 'mi';

type Settings = {
  themeName: ThemeName;
  colorMode: ColorMode;
  distanceUnit: DistanceUnit;
};

const DEFAULTS: Settings = { themeName: DEFAULT_THEME, colorMode: 'system', distanceUnit: 'km' };

function loadSettings(): Settings {
  try {
    const raw = loadSettingsRaw();
    if (!raw) return DEFAULTS;
    const stored = JSON.parse(raw) as Partial<Settings>;
    return {
      themeName: stored.themeName && stored.themeName in THEMES ? stored.themeName : DEFAULTS.themeName,
      colorMode: stored.colorMode === 'light' || stored.colorMode === 'dark' ? stored.colorMode : 'system',
      distanceUnit: stored.distanceUnit === 'mi' ? 'mi' : 'km',
    };
  } catch {
    return DEFAULTS;
  }
}

type SettingsContextValue = Settings & {
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);
  useEffect(() => {
    saveSettingsRaw(JSON.stringify(settings));
  }, [settings]);
  const value = useMemo(() => ({ ...settings, updateSetting }), [settings, updateSetting]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside SettingsProvider');
  return context;
}
