import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/discover-card';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDiscoverUsers, sendSwipe } from '@/services/api';
import type { User } from '@/types';

export default function DiscoverScreen() {
  const theme = useTheme();
  const swiperRef = useRef<Swiper<User>>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [matched, setMatched] = useState<User | null>(null);

  const load = () => getDiscoverUsers().then(setUsers);
  useEffect(() => {
    load();
  }, []);

  const onSwipe = async (index: number, action: 'like' | 'skip') => {
    const user = users[index];
    if (!user) return;
    const { matched: isMatch } = await sendSwipe({ userId: user.id, action, timestamp: new Date().toISOString() });
    if (isMatch) setMatched(user);
  };

  useEffect(() => {
    if (!matched) return;
    const timer = setTimeout(() => setMatched(null), 3000);
    return () => clearTimeout(timer);
  }, [matched]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText type="subtitle" style={styles.title}>
          BarbeCue
        </ThemedText>

        {users.length === 0 ? (
          <ThemedText themeColor="textSecondary">Loading partners…</ThemedText>
        ) : (
          <Swiper
            ref={swiperRef}
            cards={users}
            renderCard={(card) => (card ? <Card user={card} /> : <View />)}
            cardIndex={0}
            backgroundColor="transparent"
            stackSize={3}
            stackScale={8}
            stackSeparation={12}
            onSwipedLeft={(i) => onSwipe(i, 'skip')}
            onSwipedRight={(i) => onSwipe(i, 'like')}
            onSwipedAll={load}
            overlayLabels={{
              left: { title: 'SKIP', style: { label: { color: '#ef4444' } } },
              right: { title: 'MATCH', style: { label: { color: '#22c55e' } } },
            }}
          />
        )}

        <View style={styles.actions}>
          <IconButton name="close" color="#ef4444" onPress={() => swiperRef.current?.swipeLeft()} />
          <IconButton name="star" color="#f59e0b" onPress={() => swiperRef.current?.swipeTop()} />
          <IconButton name="heart" color="#22c55e" onPress={() => swiperRef.current?.swipeRight()} />
        </View>
      </SafeAreaView>

      {matched && (
        <ThemedView type="backgroundElement" style={styles.matchBanner}>
          <Ionicons name="hand-left" size={24} color={theme.text} />
          <ThemedText>It&apos;s a match with {matched.name}!</ThemedText>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: Spacing.three },
  title: { textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.five,
    paddingBottom: Spacing.three,
  },
  matchBanner: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
