import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChip } from '@/components/choice-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, THEMES } from '@/constants/theme';
import { useFilters } from '@/contexts/filters-context';
import { useSettings, type ColorMode, type DistanceUnit } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { roundDistance } from '@/lib/distance';
import { logout } from '@/services/api';

const COLOR_MODES: { value: ColorMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'Kilometres' },
  { value: 'mi', label: 'Miles' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { filters, beginEditing, resetFilters } = useFilters();
  const { themeName, colorMode, distanceUnit, updateSetting } = useSettings();
  const version = Constants.expoConfig?.version ?? '—';
  const sdkVersion = Constants.expoConfig?.sdkVersion ?? '—';

  const openDiscoveryPreferences = () => {
    beginEditing();
    router.push('/filters');
  };

  const confirmResetPreferences = () =>
    Alert.alert(
      'Reset training preferences?',
      'Age, distance, goals and every other filter goes back to its default.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetFilters },
      ]
    );

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          // wait for the stored session to clear: navigating first lets a slow logout wipe a newer login
          void logout().finally(() => router.replace('/login'));
        },
      },
    ]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Settings</ThemedText>

          <Section title="Appearance" icon="color-palette-outline">
            <Row icon="contrast-outline" title="App mode" subtitle="Follow your phone, or lock light or dark" />
            <View style={styles.chips}>
              {COLOR_MODES.map((mode) => (
                <ChoiceChip
                  key={mode.value}
                  label={mode.label}
                  selected={colorMode === mode.value}
                  onPress={() => updateSetting('colorMode', mode.value)}
                />
              ))}
            </View>

            <Row icon="brush-outline" title="Color theme" subtitle={`Current theme: ${THEMES[themeName].label}`} onPress={() => router.push('/color-theme')} />
          </Section>

          <Section title="Training preferences" icon="barbell-outline">
            <Row
              icon="options-outline"
              title="Find training partners"
              subtitle={`Ages ${filters.ageRange[0]}–${filters.ageRange[1]} · within ${roundDistance(filters.distance, distanceUnit)} ${distanceUnit}`}
              onPress={openDiscoveryPreferences}
            />

            <Row icon="speedometer-outline" title="Distance units" subtitle="Used for distances on profiles and filters" />
            <View style={styles.chips}>
              {DISTANCE_UNITS.map((unit) => (
                <ChoiceChip
                  key={unit.value}
                  label={unit.label}
                  selected={distanceUnit === unit.value}
                  onPress={() => updateSetting('distanceUnit', unit.value)}
                />
              ))}
            </View>

            <Row
              icon="refresh-outline"
              title="Reset training preferences"
              subtitle={`Back to ages 18–40, within ${roundDistance(25, distanceUnit)} ${distanceUnit}`}
              onPress={confirmResetPreferences}
            />
          </Section>

          <Section title="Account" icon="person-circle-outline">
            <Row icon="person-outline" title="My profile" onPress={() => router.navigate('/profile')} />
            <Row icon="log-out-outline" title="Log out" danger onPress={confirmLogout} />
          </Section>

          <Section title="About" icon="information-circle-outline">
            <Row
              icon="pricetag-outline"
              title="Version"
              right={<ThemedText type="small" themeColor="textSecondary">{version}</ThemedText>}
            />
            <Row
              icon="cube-outline"
              title="Expo SDK"
              right={<ThemedText type="small" themeColor="textSecondary">{sdkVersion}</ThemedText>}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionGroup}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={15} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          {title}
        </ThemedText>
      </View>
      <View style={[styles.sectionBody, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  icon,
  title,
  subtitle,
  danger = false,
  onPress,
  right,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const content = (
    <>
      <View style={[styles.rowIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name={icon} size={18} color={danger ? theme.danger : theme.accent} />
      </View>
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={danger ? { color: theme.danger } : undefined}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  sectionGroup: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.one },
  sectionBody: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 44 },
  pressed: { opacity: 0.7 },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: Spacing.half },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
