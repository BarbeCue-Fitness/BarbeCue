import { Image, ImageSourcePropType, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { User } from '@/types';

export function Card({ user }: { user: User }) {

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Image source={{ uri: user.avatar } as ImageSourcePropType} style={styles.avatar} />
      <ThemedView type="background" style={styles.body}>
        <ThemedText type="subtitle">
          {user.name}, {user.age}
        </ThemedText>
        <ThemedText themeColor="textSecondary">{user.distance} km away</ThemedText>

        <ThemedView type="backgroundSelected" style={styles.tag}>
          <ThemedText type="smallBold">{user.fitnessLevel}</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundSelected" style={styles.tag}>
          <ThemedText type="smallBold">{user.focus}</ThemedText>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {user.bio}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Spacing.four,
    overflow: 'hidden',
    elevation: 4,
  },
  avatar: { flex: 1, width: '100%' },
  body: {
    padding: Spacing.four,
    gap: Spacing.two,
    minHeight: 220,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.three,
  },
});
