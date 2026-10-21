import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';

type Variant = 'neutral' | 'primary' | 'danger' | 'warning' | 'success';

export function IconButton({
  name,
  label,
  onPress,
  variant = 'neutral',
  size = 52,
  disabled = false,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: number;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const colors = {
    neutral: { background: theme.backgroundElement, foreground: theme.text },
    primary: { background: theme.accent, foreground: theme.onAccent },
    danger: { background: theme.backgroundElement, foreground: theme.danger },
    warning: { background: theme.backgroundElement, foreground: theme.accentSecondary },
    success: { background: theme.backgroundElement, foreground: theme.success },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Ionicons name={name} size={size * 0.42} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.18)',
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.42 },
});
