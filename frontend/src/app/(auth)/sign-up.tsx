import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';

import { AuthField } from '@/components/auth-field';
import { AuthScaffold } from '@/components/auth-scaffold';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signUp } from '@/services/api';

export default function SignUpScreen() {
  const theme = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const onSignUp = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (form.password.length < 8) return setError('Password must be at least 8 characters'); // server enforces min 8
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) return setError('Date of birth must be YYYY-MM-DD');
    const [year, month, day] = form.dob.split('-').map(Number);
    const dob = new Date(year, month - 1, day);
    // "2000-02-31" parses as March 2 in JS: reject dates the calendar does not have
    if (dob.getFullYear() !== year || dob.getMonth() !== month - 1 || dob.getDate() !== day) {
      return setError('Date of birth must be a real date');
    }
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
    if (age < 18) return setError('You must be 18 or older to join BarbeCue');
    setSubmitting(true);
    setError('');
    try {
      await signUp({ ...form, dateOfBirth: form.dob });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      title="Pull up a bench."
      subtitle="Create your account and find your training partner."
      error={error}
      action={
        <PrimaryButton
          label={submitting ? 'Signing up…' : 'Sign Up'}
          onPress={() => void onSignUp()}
          disabled={submitting}
          style={styles.cta}
          leading={
            submitting ? <ActivityIndicator size="small" color={theme.onAccent} /> : undefined
          }
        />
      }
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Log in to your account"
            style={styles.link}>
            <ThemedText type="small" themeColor="textSecondary">
              Already with us?{' '}
              <ThemedText type="smallBold" style={styles.linkText}>
                Log in.
              </ThemedText>
            </ThemedText>
          </Pressable>
        </Link>
      }>
      <AuthField
        label="Full name"
        autoComplete="name"
        textContentType="name"
        value={form.name}
        onChangeText={set('name')}
      />
      <AuthField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        value={form.email}
        onChangeText={set('email')}
      />
      <AuthField
        label="Password"
        secure
        autoComplete="new-password"
        textContentType="newPassword"
        value={form.password}
        onChangeText={set('password')}
      />
      <AuthField
        label="Date of birth"
        placeholder="YYYY-MM-DD"
        value={form.dob}
        onChangeText={set('dob')}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  cta: { alignSelf: 'flex-start', minWidth: 220, borderRadius: Radius.small },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { textDecorationLine: 'underline' },
});
