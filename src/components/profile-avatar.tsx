import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProfileAvatar({
  uri,
  name,
  size = 56,
  active = false,
  verified = false,
}: {
  uri: string;
  name: string;
  size?: number;
  active?: boolean;
  verified?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Image
        accessibilityLabel={`${name} profile photo`}
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2, borderColor: theme.border, backgroundColor: theme.imagePlaceholder }]}
      />
      {verified ? (
        <View accessible accessibilityLabel="Verified" style={[styles.verified, { backgroundColor: theme.accent }]}>
          <Ionicons name="checkmark" size={12} color={theme.onAccent} />
        </View>
      ) : null}
      {active ? <View accessible accessibilityLabel="Active now" style={[styles.active, { borderColor: theme.background, backgroundColor: theme.success }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderWidth: 1 },
  verified: {
    position: 'absolute',
    right: -1,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: Radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  active: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 13,
    height: 13,
    borderRadius: Radius.round,
    borderWidth: 2,
  },
});
