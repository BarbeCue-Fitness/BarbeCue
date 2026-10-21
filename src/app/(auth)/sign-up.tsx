import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signUp } from '@/services/api';

export default function SignUpScreen() {
  const theme = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const onSignUp = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) return setError('Date of birth must be YYYY-MM-DD');
    const dob = new Date(form.dob);
    if (Number.isNaN(dob.getTime())) return setError('Date of birth must be a real date');
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

  const inputStyle: TextStyle = StyleSheet.flatten([
    styles.input,
    { color: theme.text, borderColor: theme.backgroundSelected },
  ]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="subtitle">Create account</ThemedText>
        <ThemedText themeColor="textSecondary">Find your training crew</ThemedText>

        <View style={styles.form}>
          <TextInput accessibilityLabel="Full name" style={inputStyle} placeholder="Full Name" placeholderTextColor={theme.textSecondary} autoComplete="name" value={form.name} onChangeText={set('name')} />
          <TextInput accessibilityLabel="Email address" style={inputStyle} placeholder="Email" placeholderTextColor={theme.textSecondary} autoCapitalize="none" keyboardType="email-address" autoComplete="email" value={form.email} onChangeText={set('email')} />
          <TextInput accessibilityLabel="Password" style={inputStyle} placeholder="Password (min 6 chars)" placeholderTextColor={theme.textSecondary} secureTextEntry autoComplete="new-password" value={form.password} onChangeText={set('password')} />
          <TextInput accessibilityLabel="Date of birth" style={inputStyle} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor={theme.textSecondary} value={form.dob} onChangeText={set('dob')} />
          {error ? <ThemedText type="small" themeColor="danger" accessibilityRole="alert">{error}</ThemedText> : null}
          <PrimaryButton label={submitting ? 'Creating account…' : 'Sign Up'} onPress={() => void onSignUp()} disabled={submitting} />
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Log in to your account">
              <ThemedText type="small" themeColor="textSecondary">
                Already have an account? <ThemedText type="smallBold">Log in</ThemedText>
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
