import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChip } from '@/components/choice-chip';
import { PageHeader } from '@/components/page-header';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { PREFER_NOT_TO_SAY } from '@/constants/filters';
import { useFilters } from '@/contexts/filters-context';
import { useTheme } from '@/hooks/use-theme';

const BODY_TYPES = ['Slim', 'Athletic', 'Muscular', 'Curvy', 'Average', PREFER_NOT_TO_SAY];
const GOALS = ['Build Muscle', 'Lose Weight', 'Maintain', 'Get Fit', 'Athletic', 'General Health'];
const DIETS = ['High protein', 'Vegetarian', 'Vegan', 'Keto', PREFER_NOT_TO_SAY];
const LANGUAGES = ['English', 'Hindi', 'Spanish', 'Korean', 'Other'];
const ACTIVITY = ['Low', 'Moderate', 'High', PREFER_NOT_TO_SAY];
const INTERESTS = ['Gym', 'Running', 'Yoga', 'Cycling', 'Boxing', 'Climbing', 'Music', 'Healthy Food'];

type MultiKey = 'bodyType' | 'goals' | 'diet' | 'languages' | 'activityLevel' | 'interests';

function FilterSection({
  title,
  icon,
  values,
  selected,
  onToggle,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.section, { borderColor: theme.border }]}>
      <View style={styles.sectionTitle}>
        <Ionicons name={icon} size={20} color={theme.accent} />
        <ThemedText type="smallBold">{title}</ThemedText>
      </View>
      <View style={styles.chips}>{values.map((value) => <ChoiceChip key={value} label={value} selected={selected.includes(value)} onPress={() => onToggle(value)} />)}</View>
    </ThemedView>
  );
}

export default function MoreFiltersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { draftFilters, setDraftFilters } = useFilters();
  const toggle = (key: MultiKey, value: string) => {
    const selected = draftFilters[key];
    setDraftFilters({ ...draftFilters, [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] });
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}><PageHeader title="More Filters" onBack={() => router.back()} /></View>
        <ScrollView contentContainerStyle={styles.content}>
          <FilterSection title="Body Type" icon="body-outline" values={BODY_TYPES} selected={draftFilters.bodyType} onToggle={(value) => toggle('bodyType', value)} />
          <FilterSection title="Goals" icon="flag-outline" values={GOALS} selected={draftFilters.goals} onToggle={(value) => toggle('goals', value)} />
          <FilterSection title="Diet Preference" icon="restaurant-outline" values={DIETS} selected={draftFilters.diet} onToggle={(value) => toggle('diet', value)} />
          <FilterSection title="Languages" icon="globe-outline" values={LANGUAGES} selected={draftFilters.languages} onToggle={(value) => toggle('languages', value)} />
          <FilterSection title="Activity Level" icon="walk-outline" values={ACTIVITY} selected={draftFilters.activityLevel} onToggle={(value) => toggle('activityLevel', value)} />
          <FilterSection title="Interests" icon="sparkles-outline" values={INTERESTS} selected={draftFilters.interests} onToggle={(value) => toggle('interests', value)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Premium filters"
            onPress={() => router.push({ pathname: '/premium', params: { feature: 'advanced' } })}
            style={styles.premiumLink}>
            <Ionicons name="lock-closed" size={17} color={theme.accentSecondary} />
            <ThemedText type="small" themeColor="textSecondary">Unlock advanced filters with Premium</ThemedText>
            <Ionicons name="chevron-forward" size={18} color={theme.accentSecondary} />
          </Pressable>
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  content: { padding: Spacing.three, gap: Spacing.two },
  section: { padding: Spacing.three, gap: Spacing.two, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.medium },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  premiumLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
});
