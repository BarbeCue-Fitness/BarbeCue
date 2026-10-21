import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Filters } from '@/types';

const GENDERS = ['Male', 'Female', 'Non-binary'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DIETS = ['No preference', 'High protein', 'Vegetarian', 'Vegan', 'Keto'];
const LANGUAGES = ['English', 'Spanish', 'Korean', 'Hindi'];
const ACTIVITY = ['Low', 'Moderate', 'High'];
const INTERESTS = ['Powerlifting', 'Running', 'Yoga', 'Cycling', 'Boxing', 'Climbing'];

const DEFAULTS: Filters = {
  ageRange: [18, 40],
  distance: 25,
  gender: [],
  fitnessLevel: [],
  diet: [],
  languages: [],
  activityLevel: [],
  interests: [],
  height: '',
};

type FiltersKey = 'gender' | 'fitnessLevel' | 'diet' | 'languages' | 'activityLevel' | 'interests';

function Chip({ label, active, theme, onPress }: { label: string; active: boolean; theme: { text: string; backgroundElement: string }; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? theme.text : theme.backgroundElement }]}>
      <ThemedText type="small" themeColor={active ? 'background' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

export default function FiltersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [premium, setPremium] = useState(false);

  const toggle = (key: FiltersKey, value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Section title={`Age Range: ${filters.ageRange[0]}–${filters.ageRange[1]}`}>
            <View style={styles.chips}>
              {/* shortcut: stepped buttons instead of a two-thumb range slider, upgrade when a slider lib is added */}
              {[18, 25, 30, 40].map((min) => (
                <Chip key={min} label={`${min}+`} theme={theme} active={filters.ageRange[0] === min} onPress={() => setFilters((f) => ({ ...f, ageRange: [min, 60] }))} />
              ))}
            </View>
          </Section>

          <Section title={`Distance: ${filters.distance} km`}>
            <View style={styles.chips}>
              {[5, 10, 25, 50].map((d) => (
                <Chip key={d} label={`${d} km`} theme={theme} active={filters.distance === d} onPress={() => setFilters((f) => ({ ...f, distance: d }))} />
              ))}
            </View>
          </Section>

          <Section title="Gender">
            <View style={styles.chips}>{GENDERS.map((g) => <Chip key={g} label={g} theme={theme} active={filters.gender.includes(g)} onPress={() => toggle('gender', g)} />)}</View>
          </Section>

          <Section title="Fitness Level">
            <View style={styles.chips}>{LEVELS.map((l) => <Chip key={l} label={l} theme={theme} active={filters.fitnessLevel.includes(l)} onPress={() => toggle('fitnessLevel', l)} />)}</View>
          </Section>

          <Section title="Diet Preference">
            <View style={styles.chips}>{DIETS.map((d) => <Chip key={d} label={d} theme={theme} active={filters.diet.includes(d)} onPress={() => toggle('diet', d)} />)}</View>
          </Section>

          <Section title="Languages">
            <View style={styles.chips}>{LANGUAGES.map((l) => <Chip key={l} label={l} theme={theme} active={filters.languages.includes(l)} onPress={() => toggle('languages', l)} />)}</View>
          </Section>

          <Section title="Activity Level">
            <View style={styles.chips}>{ACTIVITY.map((a) => <Chip key={a} label={a} theme={theme} active={filters.activityLevel.includes(a)} onPress={() => toggle('activityLevel', a)} />)}</View>
          </Section>

          <Section title="Interests">
            <View style={styles.chips}>{INTERESTS.map((i) => <Chip key={i} label={i} theme={theme} active={filters.interests.includes(i)} onPress={() => toggle('interests', i)} />)}</View>
          </Section>

          <Section title="Ethnicity (Premium)">
            <View style={styles.row}>
              <ThemedText type="small" themeColor="textSecondary">
                {premium ? 'Unlocked — filter by ethnicity' : 'Unlock ethnicity filters'}
              </ThemedText>
              <Switch value={premium} onValueChange={setPremium} />
            </View>
          </Section>
        </ScrollView>

        <Pressable style={[styles.apply, { backgroundColor: theme.text }]} onPress={() => router.back()}>
          <ThemedText type="smallBold" themeColor="background">Apply Filters</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  apply: { alignItems: 'center', padding: Spacing.three, borderRadius: Spacing.three, margin: Spacing.four },
});
