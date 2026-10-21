import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMessages, sendMessage } from '@/services/api';
import type { Message } from '@/types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    getMessages(id ?? '').then(setMessages);
  }, [id]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    const message = await sendMessage(id ?? '', trimmed);
    setMessages((m) => [...m, message]);
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = item.senderId === 'me';
            return (
              <ThemedView
                type={mine ? 'backgroundSelected' : 'backgroundElement'}
                style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <ThemedText type="small">{item.text}</ThemedText>
              </ThemedView>
            );
          }}
        />

        <SafeAreaView edges={['bottom']} style={styles.inputRow}>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Message…"
            placeholderTextColor={theme.textSecondary}
            value={text}
            onChangeText={setText}
            onSubmitEditing={onSend}
          />
          <Pressable onPress={onSend} style={[styles.send, { backgroundColor: theme.text }]}>
            <ThemedText type="smallBold" themeColor="background">Send</ThemedText>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.two },
  bubble: { maxWidth: '75%', padding: Spacing.three, borderRadius: Spacing.four },
  bubbleMine: { alignSelf: 'flex-end', borderBottomRightRadius: Spacing.one },
  bubbleTheirs: { alignSelf: 'flex-start', borderBottomLeftRadius: Spacing.one },
  inputRow: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  input: { flex: 1, borderWidth: 1, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  send: { justifyContent: 'center', paddingHorizontal: Spacing.four, borderRadius: Spacing.three },
});
