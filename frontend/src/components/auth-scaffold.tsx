import { useEffect } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import appIcon from '@/assets/branding/app-icon.png';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** The one entrance this screen gets. Everything else just is there. */
function Appear({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      reduced ? 1 : withTiming(1, { duration: 320, easing: EASE_OUT }),
    );
  }, [progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: (1 - progress.get()) * 10 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export function AuthScaffold({
  title,
  subtitle,
  error,
  action,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  error?: string;
  action: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();

  // failed submit nudges the form; feedback only, skipped under reduced motion
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!error || reduced) return;
    shake.set(
      withSequence(
        withTiming(-5, { duration: 40 }),
        withTiming(5, { duration: 45 }),
        withTiming(-3, { duration: 45 }),
        withTiming(0, { duration: 45, easing: EASE_OUT }),
      ),
    );
  }, [error, reduced, shake]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.get() }],
  }));

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.safe}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.inner}>
              <View>
                <View style={styles.brandRow}>
                  <View style={styles.logoWrap}>
                    <Image source={appIcon} accessible={false} style={styles.logo} />
                  </View>
                  <ThemedText style={styles.wordmark}>BarbeCue</ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
                  Same goals. Better company.
                </ThemedText>
              </View>

              <Animated.View style={shakeStyle}>
                <Appear>
                  <View style={[styles.rule, { backgroundColor: theme.accent }]} />
                  <ThemedText type="title" style={styles.title}>
                    {title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                    {subtitle}
                  </ThemedText>

                  <View style={styles.fields}>{children}</View>

                  {/* fixed slot: an error never pushes the form around */}
                  <View style={styles.errorSlot}>
                    {error ? (
                      <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
                        {error}
                      </ThemedText>
                    ) : null}
                  </View>

                  <View style={styles.action}>{action}</View>
                  {footer ? <View style={styles.footer}>{footer}</View> : null}
                </Appear>
              </Animated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    justifyContent: 'space-between',
    gap: Spacing.six,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logoWrap: { width: 36, height: 36, borderRadius: 9, overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  wordmark: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tagline: { marginTop: Spacing.half },
  rule: { width: 36, height: 2, marginBottom: Spacing.three },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  subtitle: { marginTop: Spacing.two, maxWidth: 340 },
  fields: { marginTop: Spacing.five, gap: Spacing.three },
  errorSlot: { minHeight: 20, marginTop: Spacing.three },
  action: { marginTop: Spacing.four },
  footer: { alignItems: 'flex-start', marginTop: Spacing.three },
});
