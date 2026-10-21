import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChip } from '@/components/choice-chip';
import { PageHeader } from '@/components/page-header';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMyProfile } from '@/services/api';
import type { User } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [me, setMe] = useState<User | null>(null);

  useEffect(() => {
    void getMyProfile().then(setMe);
  }, []);

  if (!me) return <ThemedView style={styles.container} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <PageHeader
            title="My Profile"
            onBack={() => router.back()}
            right={
              <Pressable accessibilityRole="button" accessibilityLabel="Open Premium" onPress={() => router.push('/premium')} style={[styles.premium, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="trophy-outline" size={17} color={theme.accentSecondary} />
                <ThemedText type="smallBold" style={{ color: theme.accentSecondary }}>Premium</ThemedText>
              </Pressable>
            }
          />

          <ThemedView type="backgroundElement" style={[styles.profileCard, { borderColor: theme.border }]}>
            <Image source={{ uri: me.photos[0] ?? me.avatar }} style={[styles.cover, { backgroundColor: theme.imagePlaceholder }]} resizeMode="cover" accessibilityLabel="Your profile cover photo" />
            <View style={styles.profileIdentity}>
              <ProfileAvatar uri={me.avatar} name={me.name} size={82} active={me.activeNow} />
              <View style={styles.nameCopy}>
                <ThemedText type="heading">{me.name}, {me.age}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{me.focus} · {me.fitnessLevel}</ThemedText>
              </View>
            </View>
            <PrimaryButton
              label="View Public Profile"
              onPress={() => router.push({ pathname: '/user/[id]', params: { id: me.id } })}
              style={styles.viewButton}
            />
          </ThemedView>

          <ProfileSection title="About me" icon="person-outline">
            <ThemedText themeColor="textSecondary">{me.bio}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">“{me.prompt}”</ThemedText>
          </ProfileSection>

          <ProfileSection title="Goals" icon="flag-outline">
            <View style={styles.tags}>{me.goals.map((goal) => <ChoiceChip key={goal} label={goal} selected={false} />)}</View>
          </ProfileSection>

          <ProfileSection title="Interests" icon="sparkles-outline">
            <View style={styles.tags}>{me.interests.map((interest) => <ChoiceChip key={interest} label={interest} selected={false} />)}</View>
          </ProfileSection>

          <ProfileSection title="Workout routine" icon="calendar-outline">
            <ThemedText themeColor="textSecondary">{me.schedule}</ThemedText>
          </ProfileSection>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ProfileSection({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Ionicons>['name']; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { borderBottomColor: theme.border }]}>
      <View style={styles.sectionTitle}>
        <Ionicons name={icon} size={19} color={theme.accent} />
        <ThemedText type="smallBold">{title}</ThemedText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.four },
  premium: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radius.round },
  profileCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.large, overflow: 'hidden', paddingBottom: Spacing.three, gap: Spacing.two },
  cover: { width: '100%', height: 190 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, marginTop: -Spacing.six },
  nameCopy: { flex: 1, gap: Spacing.one },
  viewButton: { marginHorizontal: Spacing.three },
  section: { gap: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
});
