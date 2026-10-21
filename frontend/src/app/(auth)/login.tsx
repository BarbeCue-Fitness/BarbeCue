import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

import { AuthField } from '@/components/auth-field';
import { AuthScaffold } from '@/components/auth-scaffold';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
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
    <AuthScaffold
      title="Welcome back."
      subtitle="Log in to pick up your streak."
      error={error}
      action={
        <PrimaryButton
          label={submitting ? 'Logging in…' : 'Log In'}
          onPress={() => void onLogin()}
          disabled={submitting}
          style={styles.cta}
          leading={
            submitting ? <ActivityIndicator size="small" color={theme.onAccent} /> : undefined
          }
        />
      }
      footer={
        <Link href="/(auth)/sign-up" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              First time?{' '}
              <ThemedText type="smallBold" style={styles.linkText}>
                Create an account.
              </ThemedText>
            </ThemedText>
          </Pressable>
        </Link>
      }>
      <AuthField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError('');
        }}
      />
      <AuthField
        label="Password"
        secure
        autoComplete="current-password"
        textContentType="password"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError('');
        }}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  cta: { alignSelf: 'flex-start', minWidth: 220, borderRadius: Radius.small },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { textDecorationLine: 'underline' },
});
