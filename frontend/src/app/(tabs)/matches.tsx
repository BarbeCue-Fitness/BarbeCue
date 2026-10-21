import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useFilters } from '@/contexts/filters-context';
import { useSettings } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/distance';
import { getLikesYou, getMatches, getMessages, sendSwipe } from '@/services/api';
import type { Match, Message, User } from '@/types';

type MatchFilter = 'All' | 'New' | 'Active' | 'Expired';
type MatchRow = { match: Match; preview?: Message };
type DisplayRow = { id: string; user: User; match?: Match; preview?: Message; isLike: boolean };

const MATCH_FILTERS: MatchFilter[] = ['All', 'New', 'Active', 'Expired'];

function timeLabel(timestamp: string) {
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(elapsed / 3_600_000);
  if (hours < 1) return 'Matched just now';
  if (hours < 24) return `Matched ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Matched ${days}d ago`;
}

export default function MatchesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { distanceUnit } = useSettings();
  const { beginEditing } = useFilters();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [likes, setLikes] = useState<User[]>([]);
  const [filter, setFilter] = useState<MatchFilter>('All');
  const [showLikes, setShowLikes] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([getMatches(), getLikesYou()]).then(async ([allMatches, allLikes]) => {
      const rows = await Promise.all(allMatches.map(async (match) => {
        const messages = await getMessages(match.id);
        const preview = messages.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
        return { match, preview };
      }));
      if (active) {
        setMatches(rows.sort((a, b) => b.match.matchedAt.localeCompare(a.match.matchedAt)));
        setLikes(allLikes);
      }
    });
    return () => { active = false; };
  }, []));

  const visibleMatches = useMemo(() => filter === 'All'
    ? matches
    : matches.filter(({ match }) => match.category?.toLowerCase() === filter.toLowerCase()), [filter, matches]);
  const unreadCount = matches.reduce((count, row) => count + row.match.unread, 0);
  const likeBack = async (user: User) => {
    const result = await sendSwipe({ userId: user.id, action: 'like', timestamp: new Date().toISOString() });
    if (result.matchId) {
      setShowLikes(false);
      router.push({ pathname: '/chat/[id]', params: { id: result.matchId } });
    }
  };
  const displayRows: DisplayRow[] = showLikes
    ? likes.map((user) => ({ id: user.id, user, isLike: true }))
    : visibleMatches.map(({ match, preview }) => ({ id: match.id, user: match.user, match, preview, isLike: false }));

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <ThemedText type="heading">{showLikes ? 'Likes You' : 'Matches'}</ThemedText>
            <View style={[styles.count, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{showLikes ? likes.length : matches.length}</ThemedText>
            </View>
          </View>
          <IconButton name="options-outline" label="Open filters" onPress={() => { beginEditing(); router.push('/filters'); }} />
        </View>

        <View style={styles.switchRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Show matches" accessibilityState={{ selected: !showLikes }} onPress={() => setShowLikes(false)} style={[styles.modeButton, !showLikes && { borderBottomColor: theme.accent }]}>
            <ThemedText type="smallBold" themeColor={!showLikes ? 'accent' : 'textSecondary'}>Matches</ThemedText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Show likes you received" accessibilityState={{ selected: showLikes }} onPress={() => setShowLikes(true)} style={[styles.modeButton, showLikes && { borderBottomColor: theme.accent }]}>
            <ThemedText type="smallBold" themeColor={showLikes ? 'accent' : 'textSecondary'}>Likes You{likes.length ? ` · ${likes.length}` : ''}</ThemedText>
          </Pressable>
        </View>

        {!showLikes ? (
          <View style={styles.filters}>
            {MATCH_FILTERS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Show ${value.toLowerCase()} matches`}
                accessibilityState={{ selected: filter === value }}
                onPress={() => setFilter(value)}
                style={[styles.filterTab, filter === value && { borderBottomColor: theme.accent }]}>
                <ThemedText type="small" themeColor={filter === value ? 'text' : 'textSecondary'}>{value}</ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FlatList<DisplayRow>
          data={displayRows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ThemedText type="small" themeColor="textSecondary" style={styles.empty}>{showLikes ? 'No likes yet. Keep discovering.' : `No ${filter.toLowerCase()} matches yet. Keep discovering.`}</ThemedText>}
          renderItem={({ item }) => {
            const { user, match, preview, isLike } = item;
            return (
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${user.name}, age ${user.age}, profile`}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}>
                  <ProfileAvatar uri={user.avatar} name={user.name} size={58} active={user.activeNow} verified={user.verified} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${user.name} profile`}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
                  style={styles.rowCopy}>
                  <ThemedText type="smallBold">{user.name}, {user.age}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{formatDistance(user.distance, distanceUnit, false)} · {user.focus}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {isLike ? user.prompt : preview?.text ?? timeLabel(match!.matchedAt)}
                  </ThemedText>
                </Pressable>
                {isLike ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Like ${user.name} back`} onPress={() => void likeBack(user)} style={[styles.messageAction, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="heart" size={19} color={theme.accent} />
                  </Pressable>
                ) : match!.unread ? (
                  <View style={[styles.unread, { backgroundColor: theme.accent }]}><ThemedText type="caption" themeColor="onAccent">{match!.unread}</ThemedText></View>
                ) : (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Message ${user.name}`} onPress={() => router.push({ pathname: '/chat/[id]', params: { id: match!.id } })} style={[styles.messageAction, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={19} color={theme.text} />
                  </Pressable>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          ListHeaderComponent={!showLikes && unreadCount > 0 ? <ThemedText type="small" themeColor="textSecondary" style={styles.listHeader}>{unreadCount} unread messages</ThemedText> : null}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  count: { minWidth: 26, height: 26, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one },
  switchRow: { flexDirection: 'row', marginTop: Spacing.one },
  modeButton: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filters: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  filterTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  list: { paddingBottom: Spacing.four },
  listHeader: { paddingTop: Spacing.two, paddingBottom: Spacing.one },
  row: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  rowCopy: { flex: 1, gap: Spacing.half },
  messageAction: { width: 44, height: 44, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  unread: { minWidth: 23, height: 23, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.six + Spacing.two },
  empty: { textAlign: 'center', paddingTop: Spacing.six },
});
