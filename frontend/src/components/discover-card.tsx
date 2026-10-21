import { Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/distance';
import type { User } from '@/types';
import { ThemedText } from './themed-text';

export function DiscoverCard({
  user,
  onPress,
  bottomInset = 0,
}: {
  user: User;
  onPress: () => void;
  /** space kept clear at the bottom for the floating action buttons */
  bottomInset?: number;
}) {
  const theme = useTheme();
  const { distanceUnit } = useSettings();
  const tags = user.interests.slice(0, 3);
  const moreCount = Math.max(0, user.interests.length - tags.length);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${user.name}, age ${user.age}, profile`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.imagePlaceholder }, pressed && styles.pressed]}>
      <Image
        accessibilityLabel={`${user.name} at the gym`}
        source={{ uri: user.photos[0] ?? user.avatar }}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.16)', 'transparent', 'rgba(0,0,0,0.92)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.activeBadge}>
        <View style={[styles.activeDot, { backgroundColor: user.activeNow ? theme.success : theme.textSecondary }]} />
        <ThemedText type="small" themeColor="onImage">{user.activeNow ? 'Active now' : 'Recently active'}</ThemedText>
      </View>

      <View style={[styles.photoIdentity, { bottom: 236 + bottomInset }]}>
        <View style={styles.nameRow}>
          <ThemedText type="subtitle" themeColor="onImage">{user.name}, {user.age}</ThemedText>
          {user.verified ? <Ionicons name="checkmark-circle" size={22} color={theme.accentSecondary} /> : null}
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-sharp" size={15} color={theme.onImage} />
          <ThemedText type="small" themeColor="onImage">{formatDistance(user.distance, distanceUnit)}</ThemedText>
          <View style={[styles.metaDot, { backgroundColor: theme.onImage }]} />
          <Ionicons name="barbell" size={15} color={theme.onImage} />
          <ThemedText type="small" themeColor="onImage">{user.focus}</ThemedText>
        </View>
      </View>

      <View style={[styles.promptCard, { backgroundColor: theme.backgroundElement, bottom: Spacing.two + bottomInset }]}>
        <View style={styles.promptHeader}>
          <Ionicons name="barbell" size={17} color={theme.accent} />
          <ThemedText type="small" themeColor="textSecondary">Looking for</ThemedText>
        </View>
        <ThemedText type="default" numberOfLines={3} style={styles.promptText}>{user.prompt}</ThemedText>
        <View style={styles.tags}>
          {tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" numberOfLines={1}>{tag}</ThemedText>
            </View>
          ))}
          {moreCount > 0 ? (
            <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">+{moreCount}</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.footer}>
          <View style={styles.distanceRow}>
            <Ionicons name="fitness" size={15} color={theme.accent} />
            <ThemedText type="small" themeColor="textSecondary">{user.fitnessLevel} · {user.schedule}</ThemedText>
          </View>
          <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.96 },
  activeBadge: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.round,
    backgroundColor: 'rgba(11,11,12,0.72)',
  },
  activeDot: { width: 8, height: 8, borderRadius: Radius.round },
  photoIdentity: { position: 'absolute', left: Spacing.three, right: Spacing.three, bottom: 236, gap: Spacing.one },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaDot: { width: 4, height: 4, borderRadius: Radius.round, marginHorizontal: Spacing.half },
  promptCard: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.two,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  promptText: { fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  tag: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Radius.round, maxWidth: '42%' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  distanceRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
});
