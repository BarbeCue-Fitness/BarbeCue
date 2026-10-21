import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getMyProfile } from '@/services/api';
import type { User } from '@/types';

export default function ProfileScreen() {
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    getMyProfile().then(setMe);
  }, []);

  if (!me) return <ThemedView style={{ flex: 1 }} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView type="backgroundElement" style={styles.header}>
            <ThemedView type="backgroundSelected" style={styles.avatar}>
              <ThemedText type="subtitle">{me.name[0]}</ThemedText>
            </ThemedView>
            <ThemedText type="subtitle">
              {me.name}, {me.age}
            </ThemedText>
            <ThemedText themeColor="textSecondary">{me.focus} · {me.fitnessLevel}</ThemedText>
          </ThemedView>

          <Section title="Bio">
            <ThemedText themeColor="textSecondary">{me.bio}</ThemedText>
          </Section>

          <Section title="Fitness Goals">
            <ThemedView  style={styles.tags}>
              {me.goals.map((g) => (
                <ThemedView key={g} type="backgroundSelected" style={styles.tag}>
                  <ThemedText type="small">{g}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </Section>

          <Section title="Interests">
            <ThemedView  style={styles.tags}>
              {me.interests.map((i) => (
                <ThemedView key={i} type="backgroundSelected" style={styles.tag}>
                  <ThemedText type="small">{i}</ThemedText>
                </ThemedView>
              ))}
            </ThemedView>
          </Section>

          <Section title="Workout Schedule">
            <ThemedText themeColor="textSecondary">{me.schedule}</ThemedText>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView  style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four, borderRadius: Spacing.four },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: { gap: Spacing.two },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.three },
});
