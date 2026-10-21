import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getLikesYou, getMatches } from '@/services/api';
import type { Match, User } from '@/types';

export default function MatchesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'matches' | 'likes'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [likes, setLikes] = useState<User[]>([]);

  useEffect(() => {
    getMatches().then(setMatches);
    getLikesYou().then(setLikes);
  }, []);

  const data = tab === 'matches' ? matches : likes;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText type="subtitle">Matches</ThemedText>

        <ThemedView type="backgroundElement" style={styles.tabs}>
          {(['matches', 'likes'] as const).map((t) => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <ThemedText type="smallBold">{t === 'matches' ? 'Matches' : 'Likes You'}</ThemedText>
            </Pressable>
          ))}
        </ThemedView>

        <FlatList
          data={data as { id: string; user: User }[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const user: User = 'user' in item ? (item as Match).user : (item as User);
            return (
              <Pressable
                style={styles.row}
                disabled={tab === 'likes'}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: (item as Match).id } })}>
                <ThemedView type="backgroundElement" style={styles.avatar}>
                  <ThemedText type="subtitle">{user.name[0]}</ThemedText>
                </ThemedView>
                <ThemedView  style={styles.rowBody}>
                  <ThemedText type="default">
                    {user.name}, {user.age}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {user.focus} · {user.distance} km
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: Spacing.three, padding: Spacing.four },
  tabs: { flexDirection: 'row', borderRadius: Spacing.three, padding: Spacing.one },
  tab: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Spacing.two },
  tabActive: { backgroundColor: 'rgba(128,128,128,0.25)' },
  list: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { gap: 2, flex: 1 },
});
