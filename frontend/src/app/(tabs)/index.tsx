import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';

import { ChoiceChip } from '@/components/choice-chip';
import { DiscoverCard } from '@/components/discover-card';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useFilters } from '@/contexts/filters-context';
import { useSettings } from '@/contexts/settings-context';
import { useTheme } from '@/hooks/use-theme';
import { roundDistance } from '@/lib/distance';
import { syncLocation } from '@/lib/location';
import { getDiscoverUsers, getMatches, sendSwipe } from '@/services/api';
import type { SwipeAction, User } from '@/types';

type DiscoveryMode = 'nearby' | 'standouts';

/** height of the floating action row that sits over the card's photo */
const ACTION_INSET = 84;

export default function DiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { distanceUnit } = useSettings();
  const { filters, beginEditing } = useFilters();
  const swiperRef = useRef<Swiper<User>>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [deckSize, setDeckSize] = useState<{ width: number; height: number } | null>(null);
  const [mode, setMode] = useState<DiscoveryMode>('nearby');
  const [matched, setMatched] = useState<{ user: User; matchId?: string } | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [locationOk, setLocationOk] = useState<boolean | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [gear] = useState(() => new Animated.Value(0));
  const gearSpin = gear.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const matchOpacity = useSharedValue(1);
  const matchBannerStyle = useAnimatedStyle(() => ({ opacity: matchOpacity.value }));

  const toggleOptions = () => {
    const next = !optionsOpen;
    setOptionsOpen(next);
    Animated.timing(gear, { toValue: next ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  };

  useEffect(() => {
    let active = true;
    // location first, deck second: the backend needs our pin to compute distances,
    // and fetching before the pin lands would show an empty deck until the next visit
    void (async () => {
      try {
        const ok = await syncLocation();
        const [filteredUsers, matches] = await Promise.all([getDiscoverUsers(filters, mode), getMatches()]);
        if (!active) return;
        setUsers(filteredUsers);
        setMatchCount(matches.length);
        setLocationOk(ok);
        setLoadError(null);
        setLoading(false);
        setCompleted(false);
      } catch {
        // a failed deck fetch must not spin forever: show what went wrong instead
        if (!active) return;
        setLoadError('Could not reach the BarbeCue server. Restart the backend, then reload the app.');
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [filters, mode]);

  // matches made on other screens (like-backs) must not leave the chip stale: refresh only the
  // count on focus — refetching the deck itself would reset the card stack on every tab visit
  useFocusEffect(useCallback(() => {
    let active = true;
    void getMatches()
      .then((allMatches) => { if (active) setMatchCount(allMatches.length); })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  // the deck lib fires its index callback from an animation callback chain — overlapping
  // swipes (rapid button taps) desync that index from the card on screen and would send the
  // wrong person's like. gate the button path so one flight finishes before the next starts.
  const swipingRef = useRef(false);
  const actSwipe = (swipe: () => void) => {
    if (swipingRef.current) return;
    swipingRef.current = true;
    // the swipe callback clears the gate; watchdog only guards a callback that never arrives
    setTimeout(() => { swipingRef.current = false; }, 900);
    swipe();
  };

  const onSwipe = async (index: number, action: SwipeAction['action']) => {
    swipingRef.current = false; // one callback per completed card: the next press may fly
    const user = users[index];
    if (!user) return;
    try {
      const result = await sendSwipe({ userId: user.id, action, timestamp: new Date().toISOString() });
      if (result.matched) {
        setMatched({ user, matchId: result.matchId });
        setMatchCount((count) => count + 1);
      }
    } catch {
      // a lost swipe must be visible, not silently dropped with no popup and no match
      Alert.alert('Swipe did not go through', 'The server did not confirm this swipe — try again once you are back online.');
      // the card already left the deck, but the server kept the user unswiped: reload so it comes back
      void getDiscoverUsers(filters, mode).then((next) => {
        setUsers(next);
        setCompleted(false);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!matched) return;
    // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutable by design
    matchOpacity.value = 0;
    // soft entrance, a readable hold, then a slow dissolve — no pop-in/pop-out
    matchOpacity.value = withTiming(1, { duration: 250 });
    const timer = setTimeout(() => {
      matchOpacity.value = withTiming(0, { duration: 900 });
    }, 2600);
    // unmount just after the fade completes so it never pops out mid-animation
    const hide = setTimeout(() => setMatched(null), 3600);
    return () => { clearTimeout(timer); clearTimeout(hide); };
  }, [matched, matchOpacity]);

  const openFilters = () => {
    beginEditing();
    router.push('/filters');
  };
  const filterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'ageRange') return count + (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 40 ? 1 : 0);
    if (key === 'distance') return count + (filters.distance !== 25 ? 1 : 0);
    if (Array.isArray(value)) return count + (value.length > 0 ? 1 : 0);
    return count;
  }, 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Ionicons name="barbell" size={25} color={theme.accent} />
            <View style={styles.brandCopy}>
              <ThemedText type="heading">BarbeCue</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">Same goals. Better company.</ThemedText>
            </View>
          </View>
          <ChoiceChip label={`Matches ${matchCount}`} selected={false} onPress={() => router.push('/matches')} />
        </View>

        <View
          style={styles.deck}
          onLayout={({ nativeEvent }: { nativeEvent: { layout: { x: number; y: number; width: number; height: number } } }) => {
            const { width, height } = nativeEvent.layout;
            setDeckSize((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
          }}>
          {loading ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <ThemedText type="small" themeColor="textSecondary">Finding your gym partners…</ThemedText>
            </ThemedView>
          ) : loadError ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={34} color={theme.accent} />
              <ThemedText type="default" style={styles.emptyTitle}>Could not reach the server</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{loadError}</ThemedText>
            </ThemedView>
          ) : completed ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={34} color={theme.accent} />
              <ThemedText type="default" style={styles.emptyTitle}>You’re all caught up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">New gym partners will show up here as they join.</ThemedText>
              <ChoiceChip label="Adjust filters" selected onPress={openFilters} />
            </ThemedView>
          ) : users.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.empty}>
              <Ionicons name={locationOk ? 'search-outline' : 'location-outline'} size={34} color={theme.accent} />
              <ThemedText type="default" style={styles.emptyTitle}>
                {locationOk ? 'No partners match these filters' : 'We couldn’t see your location'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {locationOk
                  ? 'Try increasing your distance or widening your preferences.'
                  : 'Allow location access to find partners nearby, then reopen the app.'}
              </ThemedText>
              <ChoiceChip label="Adjust filters" selected onPress={openFilters} />
            </ThemedView>
          ) : (
            <Swiper
              key={`${mode}-${users.map((user) => user.id).join('-')}`}
              ref={swiperRef}
              cards={users}
              renderCard={(user) => user ? (
                <DiscoverCard
                  user={user}
                  bottomInset={ACTION_INSET}
                  onPress={() => router.push({ pathname: '/user/[id]', params: { id: user.id } })}
                />
              ) : <View />}
              cardIndex={0}
              backgroundColor="transparent"
              // the lib sizes cards from the window (height - 2*60), which overflows the deck;
              // measured deck size pins each card to the visible area so nothing hides behind actions/tab bar
              cardStyle={deckSize ? { top: 0, left: 0, width: deckSize.width, height: deckSize.height } : undefined}
              stackSize={2}
              stackScale={5}
              stackSeparation={8}
              onSwipedLeft={(index) => void onSwipe(index, 'skip')}
              onSwipedRight={(index) => void onSwipe(index, 'like')}
              onSwipedTop={(index) => void onSwipe(index, 'super-like')}
              onSwipedAll={() => setCompleted(true)}
              overlayLabels={{
                left: {
                  title: 'PASS',
                  // wrapper pinned to the card's right edge: the card exits left, so the right edge stays on screen
                  style: { label: { color: theme.danger }, wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: Spacing.four, marginRight: Spacing.three } },
                },
                right: {
                  title: 'LIKE',
                  style: { label: { color: theme.accent }, wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: Spacing.four, marginLeft: Spacing.three } },
                },
                top: {
                  title: 'SUPER LIKE',
                  style: { label: { color: theme.accentSecondary }, wrapper: { flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', marginTop: Spacing.four } },
                },
              }}
            />
          )}
          {optionsOpen ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.optionsRow}
              contentContainerStyle={styles.optionsContent}>
              <ChoiceChip label="Standouts" selected={mode === 'standouts'} onPress={() => setMode('standouts')} />
              <ChoiceChip label="Nearby" selected={mode === 'nearby'} onPress={() => setMode('nearby')} />
              <ChoiceChip label="Age" selected={filters.ageRange[0] !== 18 || filters.ageRange[1] !== 40} onPress={openFilters} />
              <ChoiceChip label="Gender" selected={filters.gender.length > 0} onPress={openFilters} />
              <ChoiceChip label={`${roundDistance(filters.distance, distanceUnit)} ${distanceUnit}`} selected={filters.distance !== 25} onPress={openFilters} />
              <ChoiceChip label={filterCount > 0 ? `More · ${filterCount}` : 'More'} selected={false} onPress={openFilters} />
            </ScrollView>
          ) : null}
          <Animated.View style={[styles.menuButton, { transform: [{ rotate: gearSpin }] }]}>
            <IconButton
              name="menu"
              label={optionsOpen ? 'Hide options' : 'Show options'}
              size={44}
              onPress={toggleOptions}
            />
          </Animated.View>
        </View>

        {!loading && users.length > 0 && !completed ? (
          <View style={styles.actions} pointerEvents="box-none">
            <IconButton name="close" label="Pass" variant="danger" size={58} onPress={() => actSwipe(() => swiperRef.current?.swipeLeft())} />
            <IconButton name="barbell" label="Super like" variant="warning" size={68} onPress={() => actSwipe(() => swiperRef.current?.swipeTop())} />
            <IconButton name="heart" label="Like" variant="primary" size={58} onPress={() => actSwipe(() => swiperRef.current?.swipeRight())} />
          </View>
        ) : null}
      </SafeAreaView>

      {matched ? (
        <Reanimated.View style={[styles.matchBanner, { backgroundColor: theme.backgroundElement }, matchBannerStyle]}>
          <Ionicons name="heart" size={20} color={theme.accent} />
          <ThemedText type="smallBold">It’s a match with {matched.user.name}!</ThemedText>
          <ChoiceChip label="Message" selected onPress={() => matched.matchId ? router.push({ pathname: '/chat/[id]', params: { id: matched.matchId } }) : router.push('/matches')} />
        </Reanimated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.one },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandCopy: { gap: Spacing.half },
  // overflow hidden clips the swiper's card stack so it never paints over the action row below
  deck: { flex: 1, minHeight: 0, overflow: 'hidden' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two, borderRadius: Radius.large },
  emptyTitle: { textAlign: 'center', fontWeight: '700' },
  // transparent overlay: the photo runs edge to edge behind the buttons
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.two,
    zIndex: 1,
  },
  // pinned to the card's top-left corner, on the same line as the options chips when they open
  menuButton: { position: 'absolute', top: Spacing.one, left: Spacing.one, zIndex: 3 },
  // single line of mode + filter chips, hidden until the menu button is pressed
  optionsRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  optionsContent: { paddingVertical: Spacing.one, paddingLeft: 60, gap: Spacing.one, alignItems: 'center' },
  matchBanner: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 96,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
  },
});
