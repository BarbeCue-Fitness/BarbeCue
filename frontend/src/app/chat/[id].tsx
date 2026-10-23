import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMatchById, getMessages, getSession, markMessagesRead, sendMessage } from '@/services/api';
import type { Match, Message } from '@/types';

function timeLabel(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp));
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const listRef = useRef<FlatList<Message>>(null);
  const [match, setMatch] = useState<Match | undefined>();
  const [missing, setMissing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      let active = true;
      let timer: ReturnType<typeof setInterval> | undefined;
      // the thread is the whole point: poll so answers to "gym at 6?" show up live while visible.
      // backend hiccup → empty refresh → append nothing, poll on (never kill the loop)
      const refresh = () =>
        void getMessages(id)
          .then(async (incoming) => {
            await markMessagesRead(id);
            if (!active || !incoming.length) return;
            setMessages((current) => {
              const known = new Set(current.map((m) => m.id));
              const additions = incoming.filter((m) => !known.has(m.id));
              return additions.length ? [...current, ...additions] : current;
            });
          })
          .catch(() => {});

      void Promise.all([getMatchById(id), getMessages(id)])
        .then(async ([currentMatch, currentMessages]) => {
          if (!active) return;
          if (!currentMatch) {
            // getMatchById swallows 404s and resolves undefined: a dead match id must not 404 on a 5s loop forever
            setMissing(true);
            if (timer) clearInterval(timer);
            return;
          }
          setMissing(false);
          setMatch(currentMatch);
          setMessages(currentMessages);
          await markMessagesRead(id).catch(() => {});
          if (!active) return;
          setMessages((current) => current.map((message) => ({ ...message, read: true })));
        })
        .catch(() => { /* transient backend hiccup: the poll resumes on its own */ });

      timer = setInterval(refresh, 5000);
      return () => {
        active = false;
        if (timer) clearInterval(timer);
      };
    }, [id])
  );

  const onSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !id || sending) return;
    setSending(true);
    setSendError('');
    setText('');
    try {
      const message = await sendMessage(id, trimmed);
      setMessages((current) => [...current, message]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setText(trimmed); // restore unsent text — a failed send must not eat the message
      setSendError('Message not sent. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }, [id, sending, text]);

  const insertWorkoutPrompt = () => setText((current) => current || 'Want to train together this week?');

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to messages" onPress={() => router.back()} style={styles.back}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>
            {match ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${match.user.name} profile`}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: match.user.id } })}
                style={styles.person}>
                <ProfileAvatar uri={match.user.avatar} name={match.user.name} size={44} active={match.user.activeNow} verified={match.user.verified} />
                <View style={styles.personCopy}>
                  <ThemedText type="smallBold">{match.user.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{match.user.activeNow ? 'Active now' : 'Your gym match'}</ThemedText>
                </View>
              </Pressable>
            ) : (
              <ThemedText type="smallBold">Conversation</ThemedText>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View profile"
              onPress={() => match ? router.push({ pathname: '/user/[id]', params: { id: match.user.id } }) : Alert.alert('Conversation', 'The match details are still loading.')}
              style={styles.more}>
              <Ionicons name="person-outline" size={21} color={theme.text} />
            </Pressable>
          </View>

          {missing ? (
            <View style={styles.missing}>
              <Ionicons name="chatbubble-ellipses-outline" size={34} color={theme.accent} />
              <ThemedText style={styles.missingTitle}>This match is no longer available</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">It may have been unmatched or blocked.</ThemedText>
              <PrimaryButton label="Back to matches" onPress={() => router.replace('/matches')} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(message) => message.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const mine = item.senderId === getSession()?.id;
                return (
                  <View style={[styles.messageGroup, mine ? styles.mine : styles.theirs]}>
                    <ThemedView
                      type={mine ? 'backgroundSelected' : 'backgroundElement'}
                      style={[styles.bubble, mine && { backgroundColor: theme.accent }]}>
                      <ThemedText type="small" themeColor={mine ? 'onAccent' : 'text'}>{item.text}</ThemedText>
                      <View style={styles.messageMeta}>
                        <ThemedText type="caption" style={{ color: mine ? theme.onAccent : theme.textSecondary }}>{timeLabel(item.timestamp)}</ThemedText>
                        {mine ? <Ionicons name={item.read ? 'checkmark-done' : 'checkmark'} size={14} color={theme.onAccent} /> : null}
                      </View>
                    </ThemedView>
                  </View>
                );
              }}
            />
          )}

          {!missing && sendError ? <ThemedText type="caption" themeColor="danger" accessibilityRole="alert" style={styles.sendError}>{sendError}</ThemedText> : null}
          {!missing ? (
            <SafeAreaView edges={['bottom']} style={[styles.composer, { borderTopColor: theme.border }]}>
              <IconButton name="barbell-outline" label="Insert workout invite" size={46} onPress={insertWorkoutPrompt} />
              <TextInput
                accessibilityLabel="Message"
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
                placeholder="Type a message…"
                placeholderTextColor={theme.textSecondary}
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => void onSend()}
                returnKeyType="send"
                maxLength={1000}
                multiline
              />
              <IconButton
                name="send"
                label="Send message"
                variant="primary"
                size={48}
                disabled={!text.trim() || sending}
                onPress={() => void onSend()}
              />
            </SafeAreaView>
          ) : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  personCopy: { gap: Spacing.half },
  more: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  list: { flexGrow: 1, justifyContent: 'flex-end', padding: Spacing.three, gap: Spacing.two },
  messageGroup: { maxWidth: '82%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  bubble: { padding: Spacing.two, borderRadius: Radius.medium, gap: Spacing.one },
  messageMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: Spacing.half },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  sendError: { textAlign: 'center', paddingBottom: Spacing.half },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  missingTitle: { fontWeight: '700', textAlign: 'center' },
  input: { flex: 1, minHeight: 46, maxHeight: 120, borderWidth: 1, borderRadius: Radius.round, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
});
