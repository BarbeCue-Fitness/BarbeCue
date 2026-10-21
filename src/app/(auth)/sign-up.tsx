import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextStyle } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { signUp } from '@/services/api';

export default function SignUpScreen() {
  const theme = useTheme();
  const [form, setForm] = useState({ name: '', email: '', password: '', dob: '' });
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const onSignUp = async () => {
    if (!form.name.trim()) return setError('Name is required');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dob)) return setError('Date of birth must be YYYY-MM-DD');
    try {
      await signUp({ ...form, dateOfBirth: form.dob });
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
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
          <TextInput style={inputStyle} placeholder="Full Name" placeholderTextColor={theme.textSecondary} value={form.name} onChangeText={set('name')} />
          <TextInput style={inputStyle} placeholder="Email" placeholderTextColor={theme.textSecondary} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={set('email')} />
          <TextInput style={inputStyle} placeholder="Password (min 6 chars)" placeholderTextColor={theme.textSecondary} secureTextEntry value={form.password} onChangeText={set('password')} />
          <TextInput style={inputStyle} placeholder="Date of Birth (YYYY-MM-DD)" placeholderTextColor={theme.textSecondary} value={form.dob} onChangeText={set('dob')} />
          {error ? <ThemedText type="small" style={{ color: '#ef4444' }}>{error}</ThemedText> : null}
          <Pressable style={[styles.button, { backgroundColor: theme.text }]} onPress={onSignUp}>
            <ThemedText type="smallBold" themeColor="background">Sign Up</ThemedText>
          </Pressable>
          <Link href="/(auth)/login" asChild>
            <Pressable>
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
  button: { alignItems: 'center', padding: Spacing.three, borderRadius: Spacing.three },
});
