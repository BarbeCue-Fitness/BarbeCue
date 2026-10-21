import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getProgress } from '@/services/api';
import type { Progress } from '@/types';

const BAR_HEIGHT = 92;

export default function ProgressScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    void getProgress().then(setProgress);
  }, []);

  if (!progress) return <ThemedView style={styles.container} />;

  const sessions = progress.training.reduce((sum, day) => sum + day.sessions, 0);
  const minutes = progress.training.reduce((sum, day) => sum + day.minutes, 0);
  const firstWeek = progress.weight[0];
  const lastWeek = progress.weight[progress.weight.length - 1];
  const weightDelta = lastWeek.kg - firstWeek.kg;
  const likes = progress.activity.reduce((sum, week) => sum + week.likes, 0);
  const matches = progress.activity.reduce((sum, week) => sum + week.matches, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heading}>
            <ThemedText type="title">Progress</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your last 7 days of training
            </ThemedText>
          </View>

          <View style={styles.stats}>
            <StatTile icon="flame" value={`${progress.streakDays}d`} label="Day streak" />
            <StatTile icon="barbell" value={String(sessions)} label="Sessions" />
            <StatTile icon="time" value={String(minutes)} label="Minutes" />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open the nutrition scanner"
            onPress={() => router.push('/nutrition')}
            style={({ pressed }) => [
              styles.scan,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.scanIcon, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="scan-outline" size={20} color={theme.accent} />
            </View>
            <View style={styles.scanCopy}>
              <ThemedText type="smallBold">Nutrition scanner</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Scan a meal for calories and macros</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </Pressable>

          <Section title="Training" note={`${sessions} sessions · ${minutes} minutes this week`}>
            <BarChart
              values={progress.training.map((day) => day.minutes)}
              labels={progress.training.map((day) => day.day.slice(0, 1))}
              captions={progress.training.map((day) => `${day.day}: ${day.minutes} minutes`)}
            />
          </Section>

          <Section title="Weight" note={`${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg since ${firstWeek.week}`}>
            <BarChart
              mode="range"
              values={progress.weight.map((point) => point.kg)}
              labels={progress.weight.map((point) => point.week)}
              captions={progress.weight.map((point) => `${point.week}: ${point.kg} kg`)}
            />
          </Section>

          <Section title="Matches" note={`${likes} likes · ${matches} matches in ${progress.activity.length} weeks`}>
            <BarChart
              values={progress.activity.map((week) => week.matches)}
              labels={progress.activity.map((week) => week.week)}
              captions={progress.activity.map((week) => `${week.week}: ${week.likes} likes, ${week.matches} matches`)}
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.tile, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name={icon} size={16} color={theme.accent} />
      <ThemedText type="heading">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionGroup}>
      <ThemedText type="heading">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {note}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {children}
      </View>
    </View>
  );
}

/**
 * Simple theme-aware bar chart. `zero` scales from 0, `range` zooms into the
 * min/max band so small weight changes stay visible.
 */
function BarChart({
  values,
  labels,
  captions,
  mode = 'zero',
}: {
  values: number[];
  labels: string[];
  captions: string[];
  mode?: 'zero' | 'range';
}) {
  const theme = useTheme();
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = max - min;

  const heightOf = (value: number) => {
    if (mode === 'range') return spread > 0 ? BAR_HEIGHT * (0.5 + ((value - min) / spread) * 0.5) : BAR_HEIGHT * 0.75;
    return max > 0 ? (value / max) * BAR_HEIGHT : 0;
  };

  return (
    <View style={styles.chart}>
      {values.map((value, index) => (
        <View key={`${index}-${labels[index]}`} accessible accessibilityLabel={captions[index]} style={styles.column}>
          <View style={[styles.track, { height: BAR_HEIGHT, backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.bar, { height: heightOf(value), backgroundColor: theme.accent }]} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {labels[index]}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.five },
  heading: { gap: Spacing.half },
  stats: { flexDirection: 'row', gap: Spacing.two },
  tile: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'flex-start',
  },
  sectionGroup: { gap: Spacing.two },
  scan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scanIcon: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  scanCopy: { flex: 1, gap: Spacing.half },
  pressed: { opacity: 0.7 },
  card: {
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  chart: { flexDirection: 'row', gap: Spacing.one, alignItems: 'flex-end' },
  column: { flex: 1, gap: Spacing.half, alignItems: 'center' },
  track: { width: '100%', justifyContent: 'flex-end', borderRadius: Radius.small, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: Radius.small },
});
