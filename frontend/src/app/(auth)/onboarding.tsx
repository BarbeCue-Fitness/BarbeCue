import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SLIDES = [
  { icon: 'barbell-outline', title: 'Find Your Training Partner', text: 'Swipe to meet people who lift, run, and stretch at your pace.' },
  { icon: 'location-outline', title: 'Explore People Near You', text: 'Filter by distance, gym and fitness level to find your crew.' },
  { icon: 'people-outline', title: 'Match & Train', text: 'Chat, plan workouts and keep each other consistent.' },
] as const;

export default function OnboardingScreen() {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / (e.nativeEvent.layoutMeasurement.width || 1)));
  };

  const next = () =>
    page < SLIDES.length - 1
      ? listRef.current?.scrollToIndex({ index: page + 1, animated: true })
      : router.push('/login');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <FlatList
          ref={listRef}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          keyExtractor={(s) => s.title}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Ionicons name={item.icon} size={56} color={theme.accent} />
              <ThemedText type="subtitle" style={styles.center}>{item.title}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.center}>{item.text}</ThemedText>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View accessibilityRole="progressbar" accessibilityLabel={`Step ${page + 1} of ${SLIDES.length}`} style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={[styles.dot, { backgroundColor: theme.textSecondary }, i === page && { backgroundColor: theme.text }]} />
            ))}
          </View>
          <PrimaryButton label={page === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={next} style={styles.button} />
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Skip onboarding">
              <ThemedText type="small" themeColor="textSecondary">Skip</ThemedText>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    maxWidth: '100%',
  },
  center: { textAlign: 'center', maxWidth: 320 },
  footer: { alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  dots: { flexDirection: 'row', gap: Spacing.two },
  dot: { width: 8, height: 8, borderRadius: Radius.round },
  button: { alignSelf: 'stretch' },
});
