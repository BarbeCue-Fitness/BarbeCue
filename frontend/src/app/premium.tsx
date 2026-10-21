import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/page-header';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BENEFITS = [
  { icon: 'sparkles-outline' as const, title: 'Filter by Ethnicity', detail: 'Find people who share your preferences' },
  { icon: 'heart-outline' as const, title: 'See Who Liked You', detail: 'Meet your admirers sooner' },
  { icon: 'options-outline' as const, title: 'Advanced Filters', detail: 'Body type, goals, lifestyle and more' },
  { icon: 'eye-off-outline' as const, title: 'Incognito Mode', detail: 'Browse with more control over visibility' },
  { icon: 'flash-outline' as const, title: 'Super Likes', detail: 'Stand out and get noticed faster' },
];

export default function PremiumScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const focusEthnicity = feature === 'ethnicity';

  const showPurchaseMessage = () => Alert.alert(
    'Premium is not connected yet',
    'The screen is ready for the subscription flow. Store purchases and account entitlements still need to be connected.'
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <PageHeader title="Premium" onBack={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={[styles.crown, { backgroundColor: theme.backgroundSelected, borderColor: theme.accentSecondary }]}>
              <Ionicons name="trophy" size={34} color={theme.accentSecondary} />
            </View>
            <ThemedText type="subtitle" style={styles.heroTitle}>{focusEthnicity ? 'Unlock Ethnicity Filter' : 'Unlock Premium'}</ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
              More matches. More options. More you.
            </ThemedText>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((benefit) => (
              <ThemedView key={benefit.title} type="backgroundElement" style={[styles.benefit, { borderColor: theme.border }]}>
                <View style={[styles.benefitIcon, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name={benefit.icon} size={23} color={theme.accentSecondary} />
                </View>
                <View style={styles.benefitCopy}>
                  <ThemedText type="smallBold">{benefit.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">{benefit.detail}</ThemedText>
                </View>
                <Ionicons name="lock-closed" size={18} color={theme.textSecondary} />
              </ThemedView>
            ))}
          </View>

          <PrimaryButton label="Go Premium" onPress={showPurchaseMessage} style={styles.cta} />
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="Log in to your account" style={styles.loginLink}>
              <ThemedText type="small" themeColor="textSecondary">Already a member? </ThemedText>
              <ThemedText type="smallBold" themeColor="accent">Log in</ThemedText>
            </Pressable>
          </Link>
          <ThemedText type="small" themeColor="textSecondary" style={styles.disclaimer}>
            Subscriptions will be available after App Store and Google Play billing are configured.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three },
  content: { flexGrow: 1, padding: Spacing.three, gap: Spacing.four, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.two },
  crown: { width: 78, height: 78, borderRadius: Radius.round, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { textAlign: 'center' },
  tagline: { textAlign: 'center' },
  benefits: { gap: Spacing.two },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth },
  benefitIcon: { width: 46, height: 46, borderRadius: Radius.small, justifyContent: 'center', alignItems: 'center' },
  benefitCopy: { flex: 1, gap: Spacing.half },
  cta: { minHeight: 58 },
  loginLink: { flexDirection: 'row', justifyContent: 'center', padding: Spacing.one },
  disclaimer: { textAlign: 'center' },
});
