import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { login } from '@/services/api';

export default function LoginScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="subtitle">Welcome back</ThemedText>
        <ThemedText themeColor="textSecondary">Log in to BarbeCue</ThemedText>

        <View style={styles.form}>
          <TextInput
            accessibilityLabel="Email address"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            accessibilityLabel="Password"
            style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <ThemedText type="small" themeColor="danger" accessibilityRole="alert">{error}</ThemedText> : null}
          <PrimaryButton label={submitting ? 'Logging in…' : 'Log In'} onPress={() => void onLogin()} disabled={submitting} />
          <Link href="/(auth)/sign-up" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Create a new account">
              <ThemedText type="small" themeColor="textSecondary">
                No account? <ThemedText type="smallBold">Sign up</ThemedText>
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  form: { gap: Spacing.three, marginTop: Spacing.four },
  input: { borderWidth: 1, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
});
