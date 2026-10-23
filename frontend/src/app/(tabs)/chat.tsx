import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMatches } from '@/services/api';
import type { Match, Message } from '@/types';

type Conversation = { match: Match; preview?: Message };

function timeLabel(timestamp?: string) {
  if (!timestamp) return '';
  const elapsed = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ChatInboxScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    void getMatches()
      .then((matches) => {
        if (!active) return;
        setLoadFailed(false);
        const rows = matches.map((match) => ({ match, preview: match.lastMessage }));
        setConversations(rows.sort((a, b) => (b.preview?.timestamp ?? b.match.matchedAt).localeCompare(a.preview?.timestamp ?? a.match.matchedAt)));
      })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, []));

  const unreadCount = conversations.reduce((total, item) => total + item.match.unread, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageHeader title="Messages" subtitle={unreadCount ? `${unreadCount} unread` : 'Keep the momentum going'} />
        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <ThemedText type="default">{loadFailed ? 'Could not load conversations' : 'No conversations yet'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {loadFailed ? 'Check the backend connection and reopen this tab.' : 'When you match, your chats will show up here.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.match.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${item.match.user.name}${item.match.unread ? `, ${item.match.unread} unread messages` : ''}`}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.match.id } })}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <ProfileAvatar uri={item.match.user.avatar} name={item.match.user.name} size={58} active={item.match.user.activeNow} verified={item.match.user.verified} />
                <View style={styles.copy}>
                  <View style={styles.nameLine}>
                    <ThemedText type="default" style={styles.name}>{item.match.user.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{timeLabel(item.preview?.timestamp ?? item.match.matchedAt)}</ThemedText>
                  </View>
                  <ThemedText type="small" themeColor={item.match.unread ? 'text' : 'textSecondary'} numberOfLines={1}>
                    {item.preview?.text ?? 'You matched — say hello!'}
                  </ThemedText>
                </View>
                {item.match.unread ? <View style={[styles.unread, { backgroundColor: theme.accent }]}><ThemedText type="caption" themeColor="onAccent">{item.match.unread}</ThemedText></View> : null}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, gap: Spacing.three, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  list: { paddingBottom: Spacing.four },
  row: { minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  pressed: { opacity: 0.72 },
  copy: { flex: 1, gap: Spacing.one },
  nameLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontWeight: '700' },
  unread: { minWidth: 22, height: 22, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.one },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.six + Spacing.two },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
});
