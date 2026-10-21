import { Platform } from 'react-native';

type ColorSet = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  accent: string;
  accentSecondary: string;
  success: string;
  danger: string;
  border: string;
  onAccent: string;
  onImage: string;
  imagePlaceholder: string;
};

/**
 * 10 selectable app themes. Each varies the accent + canvas tint and keeps
 * shared ink/surface tokens. Every accent/canvas/ink pair was verified for
 * WCAG AA per mode: dark accent on dark canvas >= 6.3:1, dark ink label on
 * accent >= 6.3:1, light accent on light canvas >= 3.1:1 (icons), dark ink
 * label on light accent >= 4.6:1.
 */
export const THEMES = {
  ember: { label: 'Ember', accentDark: '#FF5A1F', accentLight: '#E8430A', canvasDark: '#0B0B0C', canvasLight: '#FAF6F1' },
  rose: { label: 'Rose', accentDark: '#FF6B8A', accentLight: '#D9416E', canvasDark: '#110A0D', canvasLight: '#FBF3F5' },
  ocean: { label: 'Ocean', accentDark: '#38BDF8', accentLight: '#0284C7', canvasDark: '#0A0F14', canvasLight: '#F2F6F9' },
  forest: { label: 'Forest', accentDark: '#34D399', accentLight: '#059669', canvasDark: '#081110', canvasLight: '#F0F7F3' },
  violet: { label: 'Violet', accentDark: '#A78BFA', accentLight: '#8B5CF6', canvasDark: '#0D0C15', canvasLight: '#F5F4FA' },
  blossom: { label: 'Blossom', accentDark: '#F472B6', accentLight: '#EC4899', canvasDark: '#120A10', canvasLight: '#FBF3F8' },
  gold: { label: 'Gold', accentDark: '#FBBF24', accentLight: '#BF7F10', canvasDark: '#110F07', canvasLight: '#FAF6EA' },
  mint: { label: 'Mint', accentDark: '#2DD4BF', accentLight: '#0D9488', canvasDark: '#07110F', canvasLight: '#EFF7F5' },
  indigo: { label: 'Indigo', accentDark: '#818CF8', accentLight: '#7480F8', canvasDark: '#0B0D16', canvasLight: '#F3F4FB' },
  matcha: { label: 'Matcha', accentDark: '#A3E635', accentLight: '#5C8F0C', canvasDark: '#0E1206', canvasLight: '#F5F8EC' },
} as const;

export type ThemeName = keyof typeof THEMES;
export const DEFAULT_THEME: ThemeName = 'ember';

const UNIVERSAL = {
  light: {
    text: '#1C1C1E',
    backgroundElement: '#FFFFFF',
    textSecondary: '#706B68',
    accentSecondary: '#FFB020',
    success: '#198754',
    danger: '#C83224',
    border: '#E6E0DC',
    onAccent: '#0B0B0C',
    onImage: '#FFFFFF',
    imagePlaceholder: '#D8D1CC',
  },
  dark: {
    text: '#F7F4F1',
    backgroundElement: '#1C1C1E',
    textSecondary: '#AAA5A1',
    accentSecondary: '#FFB020',
    success: '#49C98C',
    danger: '#FF6257',
    border: '#343235',
    onAccent: '#0B0B0C',
    onImage: '#FFFFFF',
    imagePlaceholder: '#29282A',
  },
} as const;

const withAlpha = (hex: string, opacity: number) => {
  const value = hex.replace('#', '');
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${opacity})`;
};

export function getColorSet(theme: ThemeName, mode: 'light' | 'dark'): ColorSet {
  const { accentDark, accentLight, canvasDark, canvasLight } = THEMES[theme];
  return {
    ...UNIVERSAL[mode],
    background: mode === 'dark' ? canvasDark : canvasLight,
    accent: mode === 'dark' ? accentDark : accentLight,
    backgroundSelected: mode === 'dark' ? withAlpha(accentDark, 0.14) : withAlpha(accentLight, 0.1),
  };
}

export type ThemeColor = keyof ColorSet;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  round: 999,
} as const;

export const MaxContentWidth = 800;
