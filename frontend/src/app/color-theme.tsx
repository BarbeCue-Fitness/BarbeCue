import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, THEMES, type ThemeName } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';

const themeNames = Object.keys(THEMES) as ThemeName[];

export default function ColorThemeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { themeName, updateSetting } = useSettings();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <PageHeader title="Color theme" onBack={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="small" themeColor="textSecondary">
            Accent and canvas tint across the app.
          </ThemedText>
          <View style={[styles.list, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {themeNames.map((name) => {
              const colors = THEMES[name];
              const selected = themeName === name;
              return (
                <Pressable
                  key={name}
                  accessibilityRole="button"
                  accessibilityLabel={`Use the ${colors.label} theme`}
                  accessibilityState={{ selected }}
                  onPress={() => updateSetting('themeName', name)}
                  style={({ pressed }) => [
                    styles.row,
                    (pressed || selected) && { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <View style={styles.swatches}>
                    <View style={[styles.swatchDark, { backgroundColor: colors.canvasDark }]} />
                    <View style={[styles.swatchLight, { backgroundColor: colors.canvasLight }]} />
                    <View style={[styles.accentDot, { backgroundColor: colors.accentDark }]}>
                      <View style={[styles.accentDotCore, { backgroundColor: colors.accentLight }]} />
                    </View>
                  </View>
                  <ThemedText type="smallBold" style={styles.name}>
                    {colors.label}
                  </ThemedText>
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={20}
                    color={selected ? theme.accent : theme.border}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.two },
  list: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.small,
    minHeight: 44,
  },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: Spacing.half },
  swatchDark: {
    width: 26,
    height: 26,
    borderTopLeftRadius: Radius.small,
    borderBottomLeftRadius: Radius.small,
  },
  swatchLight: {
    width: 26,
    height: 26,
    borderTopRightRadius: Radius.small,
    borderBottomRightRadius: Radius.small,
  },
  accentDot: {
    width: 20,
    height: 20,
    borderRadius: Radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.half,
  },
  accentDotCore: { width: 9, height: 9, borderRadius: Radius.round },
  name: { flex: 1 },
});
