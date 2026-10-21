import { Host, Slider } from '@expo/ui';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChip } from '@/components/choice-chip';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { PREFER_NOT_TO_SAY } from '@/constants/filters';
import { useFilters } from '@/contexts/filters-context';
import { useSettings } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { roundDistance } from '@/lib/distance';

const GENDERS = ['Male', 'Female', 'Non-binary'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const HEIGHTS = [
  { label: '< 5’2”', value: 'under-5-2' },
  { label: '5’2”–5’8”', value: '5-2-to-5-8' },
  { label: '> 5’8”', value: 'over-5-8' },
];

type MultiKey = 'gender' | 'fitnessLevel' | 'height';

function FilterCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>{children}</ThemedView>;
}

function SectionTitle({ title, icon }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={19} color={theme.accent} />
      <ThemedText type="smallBold">{title}</ThemedText>
    </View>
  );
}

export default function FiltersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { distanceUnit } = useSettings();
  const { draftFilters, setDraftFilters, resetDraftFilters, applyDraftFilters } = useFilters();

  const toggle = (key: MultiKey, value: string) => {
    const selected = draftFilters[key];
    setDraftFilters({ ...draftFilters, [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] });
  };

  const setSingle = (key: 'gender' | 'fitnessLevel', value: string) => {
    const selected = draftFilters[key];
    setDraftFilters({ ...draftFilters, [key]: selected.includes(value) ? [] : [value] });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={[styles.headerIcon, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="options-outline" size={19} color={theme.accent} />
          </View>
          <View style={styles.headerCopy}>
            <ThemedText type="default" style={styles.headerTitle}>Smart Filters</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Filter by pace, distance and goals</ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close filters" hitSlop={8} onPress={() => router.back()} style={styles.close}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FilterCard>
            <SectionTitle title="Age Range" icon="people-outline" />
            <ThemedText type="default" style={styles.valueText}>{draftFilters.ageRange[0]} – {draftFilters.ageRange[1]}</ThemedText>
            <View style={styles.sliderLabelRow}>
              <ThemedText type="small" themeColor="textSecondary">Minimum · {draftFilters.ageRange[0]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Maximum · {draftFilters.ageRange[1]}</ThemedText>
            </View>
            <Host matchContents={{ vertical: true }} style={styles.sliderHost}>
              <Slider
                min={18}
                max={59}
                step={1}
                value={draftFilters.ageRange[0]}
                onValueChange={(value) => setDraftFilters({ ...draftFilters, ageRange: [Math.min(Math.round(value), draftFilters.ageRange[1] - 1), draftFilters.ageRange[1]] })}
              />
            </Host>
            <Host matchContents={{ vertical: true }} style={styles.sliderHost}>
              <Slider
                min={19}
                max={60}
                step={1}
                value={draftFilters.ageRange[1]}
                onValueChange={(value) => setDraftFilters({ ...draftFilters, ageRange: [draftFilters.ageRange[0], Math.max(Math.round(value), draftFilters.ageRange[0] + 1)] })}
              />
            </Host>
          </FilterCard>

          <FilterCard>
            <View style={styles.titleWithAction}>
              <SectionTitle title="Location" icon="location-outline" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Set a ${roundDistance(5, distanceUnit)} ${distanceUnit} search radius`}
                onPress={() => setDraftFilters({ ...draftFilters, distance: 5 })}
                hitSlop={8}
                style={[styles.locationAction, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="locate-outline" size={18} color={theme.accent} />
              </Pressable>
            </View>
            <ThemedText type="default" style={styles.valueText}>Within {roundDistance(draftFilters.distance, distanceUnit)} {distanceUnit}</ThemedText>
            <Host matchContents={{ vertical: true }} style={styles.sliderHost}>
              <Slider min={1} max={50} step={1} value={draftFilters.distance} onValueChange={(value) => setDraftFilters({ ...draftFilters, distance: Math.round(value) })} />
            </Host>
            <View style={styles.rangeLabels}>
              <ThemedText type="small" themeColor="textSecondary">{roundDistance(1, distanceUnit)} {distanceUnit}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{roundDistance(50, distanceUnit)} {distanceUnit}</ThemedText>
            </View>
          </FilterCard>

          <FilterCard>
            <SectionTitle title="Gender" icon="people-outline" />
            <View style={styles.chips}>
              <ChoiceChip label="Any" selected={draftFilters.gender.length === 0} onPress={() => setDraftFilters({ ...draftFilters, gender: [] })} />
              {GENDERS.map((gender) => <ChoiceChip key={gender} label={gender} selected={draftFilters.gender.includes(gender)} onPress={() => setSingle('gender', gender)} />)}
              <ChoiceChip label={PREFER_NOT_TO_SAY} selected={draftFilters.gender.includes(PREFER_NOT_TO_SAY)} onPress={() => setSingle('gender', PREFER_NOT_TO_SAY)} />
            </View>
          </FilterCard>

          <FilterCard>
            <SectionTitle title="Fitness Level" icon="barbell-outline" />
            <View style={styles.chips}>
              <ChoiceChip label="Any" selected={draftFilters.fitnessLevel.length === 0} onPress={() => setDraftFilters({ ...draftFilters, fitnessLevel: [] })} />
              {LEVELS.map((level) => <ChoiceChip key={level} label={level} selected={draftFilters.fitnessLevel.includes(level)} onPress={() => setSingle('fitnessLevel', level)} />)}
            </View>
          </FilterCard>

          <FilterCard>
            <SectionTitle title="Height" icon="resize-outline" />
            <View style={styles.chips}>
              <ChoiceChip label="Any" selected={draftFilters.height.length === 0} onPress={() => setDraftFilters({ ...draftFilters, height: [] })} />
              {HEIGHTS.map((height) => <ChoiceChip key={height.value} label={height.label} selected={draftFilters.height.includes(height.value)} onPress={() => toggle('height', height.value)} />)}
              <ChoiceChip label={PREFER_NOT_TO_SAY} selected={draftFilters.height.includes(PREFER_NOT_TO_SAY)} onPress={() => toggle('height', PREFER_NOT_TO_SAY)} />
            </View>
          </FilterCard>

          <FilterCard>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Unlock ethnicity filter with Premium"
              onPress={() => router.push({ pathname: '/premium', params: { feature: 'ethnicity' } })}
              style={styles.premiumRow}>
              <View style={styles.premiumCopy}>
                <SectionTitle title="Ethnicity" icon="person-outline" />
                <ThemedText type="small" themeColor="textSecondary">Unlock with Premium to filter by ethnicity</ThemedText>
              </View>
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed" size={14} color={theme.accentSecondary} />
                <ThemedText type="smallBold" style={{ color: theme.accentSecondary }}>Premium</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </Pressable>
          </FilterCard>

          <FilterCard>
            <Pressable accessibilityRole="button" accessibilityLabel="More filters" onPress={() => router.push('/more-filters')} style={styles.moreRow}>
              <View style={styles.moreCopy}>
                <SectionTitle title="More Filters" icon="options-outline" />
                <ThemedText type="small" themeColor="textSecondary">Body type, goals, diet, languages and activity</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </Pressable>
          </FilterCard>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Reset all filters" onPress={resetDraftFilters} style={styles.reset}>
            <ThemedText type="smallBold" themeColor="accent">Reset</ThemedText>
          </Pressable>
          <PrimaryButton label="Apply Filters" onPress={() => { applyDraftFilters(); router.back(); }} style={styles.apply} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  headerIcon: { width: 42, height: 42, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: Spacing.half },
  headerTitle: { fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.four },
  card: { padding: Spacing.three, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium, gap: Spacing.two },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  valueText: { fontWeight: '700' },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderHost: { width: '100%', minHeight: 30 },
  titleWithAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationAction: { width: 40, height: 40, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 52 },
  premiumCopy: { flex: 1, gap: Spacing.two },
  premiumBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.round },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 52 },
  moreCopy: { flex: 1, gap: Spacing.two },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  reset: { minHeight: 48, minWidth: 68, alignItems: 'center', justifyContent: 'center' },
  apply: { flex: 1 },
});
