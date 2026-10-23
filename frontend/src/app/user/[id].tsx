import { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceChip } from '@/components/choice-chip';
import { PrimaryButton } from '@/components/primary-button';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSettings } from '@/contexts/settings-context';
import { formatDistance } from '@/lib/distance';
import { getUserById, getSession, sendSwipe } from '@/services/api';
import type { User } from '@/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { distanceUnit } = useSettings();
  const { width } = useWindowDimensions();
  const [user, setUser] = useState<User | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [matchedMatchId, setMatchedMatchId] = useState<string | null>(null);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void getUserById(id)
      .then((profile) => {
        if (!active) return;
        setUser(profile ?? null);
        setMatchedMatchId(profile?.matchId ?? null); // /users/{id} already knows the active match
        setLoadFailed(!profile); // a 404 resolves undefined: do not show "Loading" forever
        setLoadFailed(false);
      })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, [id]);

  const matched = matchedMatchId !== null;

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backOnly}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {loadFailed ? 'This profile is unavailable. Go back and try again.' : 'Loading profile…'}
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const photos = user.photos.length ? user.photos : [user.avatar];
  const isOwnProfile = user.id === getSession()?.id;
  const openMessage = (matchId?: string) => {
    const id = matchId ?? matchedMatchId;
    if (!id) return;
    // arrow-wrapped: RN calls onPress with the press event, and openMessage's first
    // parameter would swallow it and end up in the router as "/chat/[object Object]"
    router.push({ pathname: '/chat/[id]', params: { id } });
  };

  const likeProfile = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const result = await sendSwipe({ userId: user.id, action: 'like', timestamp: new Date().toISOString() });
      if (result.matched) {
        setMatchedMatchId(result.matchId ?? null);
        openMessage(result.matchId);
      } else {
        Alert.alert('Like sent', `${user.name} will see it in your matches if they like you back.`);
      }
    } catch (error) {
      Alert.alert('Like did not go through', error instanceof Error ? error.message : 'Check your connection and try again.');
    } finally {
      setLiking(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.gallery}>
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${item}-${index}`}
              onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => <Image source={{ uri: item }} resizeMode="cover" style={[styles.heroImage, { width, backgroundColor: theme.imagePlaceholder }]} accessibilityLabel={`${user.name} profile photo`} />}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.galleryBack}>
              <Ionicons name="arrow-back" size={22} color={theme.onImage} />
            </Pressable>
            <View style={styles.photoCount}><ThemedText type="smallBold" themeColor="onImage">{photoIndex + 1}/{photos.length}</ThemedText></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Profile options" onPress={() => Alert.alert('Profile options', 'Report and block actions will be available when the account service is connected.')} style={styles.galleryMore}>
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.onImage} />
            </Pressable>
          </View>

          <View style={styles.identity}>
            <View style={styles.identityCopy}>
              <View style={styles.nameRow}>
                <ThemedText type="heading">{user.name}, {user.age}</ThemedText>
                {user.verified ? <Ionicons name="checkmark-circle" size={21} color={theme.accent} /> : null}
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="location-sharp" size={16} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">{formatDistance(user.distance, distanceUnit)}</ThemedText>
                <View style={[styles.statusDot, { backgroundColor: user.activeNow ? theme.success : theme.textSecondary }]} />
                <ThemedText type="small" themeColor="textSecondary">{user.activeNow ? 'Active now' : 'Recently active'}</ThemedText>
              </View>
            </View>
            <ProfileAvatar uri={user.avatar} name={user.name} size={54} active={user.activeNow} verified={user.verified} />
          </View>

          <View style={styles.tags}>
            {[...new Set([user.focus, ...user.interests.slice(0, 3)])].map((tag) => <ChoiceChip key={tag} label={tag} selected={false} />)}
            {user.interests.length > 3 ? <ChoiceChip label={`+${user.interests.length - 3}`} selected={false} /> : null}
          </View>

          <ProfileSection title="About me" icon="person-outline">
            <ThemedText themeColor="textSecondary">{user.bio}</ThemedText>
          </ProfileSection>

          <ProfileSection title="Goals" icon="flag-outline">
            <View style={styles.tags}>{user.goals.map((goal) => <ChoiceChip key={goal} label={goal} selected={false} />)}</View>
          </ProfileSection>

          <ProfileSection title="Interests" icon="sparkles-outline">
            <View style={styles.tags}>{user.interests.map((interest) => <ChoiceChip key={interest} label={interest} selected={false} />)}</View>
          </ProfileSection>

          <ProfileSection title="Workout routine" icon="calendar-outline">
            <ThemedText themeColor="textSecondary">{user.schedule}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{user.fitnessLevel} · {user.diet ?? 'Flexible diet'} · {user.languages.join(', ')}</ThemedText>
          </ProfileSection>

          <View style={styles.photoStrip}>
            {photos.slice(0, 3).map((photo, index) => (
              <Image key={`${photo}-thumb`} source={{ uri: photo }} style={[styles.thumb, { backgroundColor: theme.imagePlaceholder }]} accessibilityLabel={`${user.name} photo ${index + 1}`} />
            ))}
            {photos.length > 3 ? <View style={[styles.morePhotos, { backgroundColor: theme.backgroundSelected }]}><ThemedText type="smallBold">+{photos.length - 3}</ThemedText></View> : null}
          </View>

        </ScrollView>
        {!isOwnProfile ? (
          <SafeAreaView edges={['bottom']} style={[styles.footer, { borderTopColor: theme.border }]}>
            <PrimaryButton
              label={matched ? 'Message' : `Like ${user.name}`}
              disabled={liking}
              onPress={() => (matched ? openMessage() : void likeProfile())}
              leading={<Ionicons name={matched ? 'chatbubble-ellipses' : 'heart'} size={19} color={theme.onAccent} />}
            />
          </SafeAreaView>
        ) : null}
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
  content: { paddingBottom: Spacing.four, gap: Spacing.three },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  gallery: { position: 'relative', height: 380 },
  heroImage: { height: 380 },
  galleryBack: { position: 'absolute', top: Spacing.two, left: Spacing.two, width: 44, height: 44, borderRadius: Radius.round, backgroundColor: 'rgba(11,11,12,0.68)', alignItems: 'center', justifyContent: 'center' },
  galleryMore: { position: 'absolute', top: Spacing.two, right: Spacing.two, width: 44, height: 44, borderRadius: Radius.round, backgroundColor: 'rgba(11,11,12,0.68)', alignItems: 'center', justifyContent: 'center' },
  photoCount: { position: 'absolute', top: Spacing.two, right: 60, minWidth: 44, height: 36, borderRadius: Radius.round, backgroundColor: 'rgba(11,11,12,0.68)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.two },
  identity: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, marginTop: Spacing.one },
  identityCopy: { flex: 1, gap: Spacing.one },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  statusDot: { width: 8, height: 8, borderRadius: Radius.round, marginLeft: Spacing.one },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, paddingHorizontal: Spacing.three },
  section: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  photoStrip: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three },
  thumb: { flex: 1, height: 94, borderRadius: Radius.small },
  morePhotos: { position: 'absolute', right: Spacing.three, width: '30%', height: 94, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', opacity: 0.88 },
  backOnly: { height: 44, width: 44, justifyContent: 'center', alignItems: 'center' },
});
