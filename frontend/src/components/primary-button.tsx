import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  leading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.accent },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <ThemedText type="smallBold" style={{ color: theme.onAccent }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.round,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leading: { marginRight: Spacing.two },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
