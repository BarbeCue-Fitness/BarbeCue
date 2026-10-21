import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={onBack}
          style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
      ) : null}
      <View style={styles.titleWrap}>
        <ThemedText type="heading">{title}</ThemedText>
        {subtitle ? <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 48 },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { flex: 1, gap: Spacing.half },
});
