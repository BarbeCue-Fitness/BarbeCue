import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, ScrollView, View, StyleSheet, useWindowDimensions } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

// the nav pill is 76px tall and overlays the slot; reserve that strip for it
const NAV_HEIGHT = 76;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingTop: NAV_HEIGHT }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="discover" href="/" asChild>
            <TabButton>Discover</TabButton>
          </TabTrigger>
          <TabTrigger name="matches" href="/matches" asChild>
            <TabButton>Matches</TabButton>
          </TabTrigger>
          <TabTrigger name="chat" href="/chat" asChild>
            <TabButton>Chat</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton>Progress</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={typeof children === 'string' ? children : undefined}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const maxWidth = Math.min(width - Spacing.three * 2, MaxContentWidth) - Spacing.five * 2;

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ width: maxWidth }}
          contentContainerStyle={styles.tabRow}>
          <ThemedText type="smallBold" style={styles.brandText}>
            BarbeCue
          </ThemedText>

          {props.children}
        </ScrollView>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexGrow: 1,
    maxWidth: MaxContentWidth,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
