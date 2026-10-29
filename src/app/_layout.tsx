import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CeremonyHost } from '../components/ceremony/Ceremonies';
import { FinaleHost } from '../components/onboarding/Handoff';
import { prefetchArt } from '../components/artPrefetch';
import { cleanupTemps } from '../lib/appFiles';
import { RecoveryScreen } from '../components/RecoveryScreen';
import { ReminderSync } from '../components/reminders/ReminderSync';
import { usePreferences } from '../store/preferences';
import { useResetPilot } from '../store/resetPilot';
import { useRootTheme, useThemePreference } from '../theme';
import { ThemeTransitionProvider } from '../theme/transition';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Both saves (the preferences and the program) are loaded before anything is shown.
const subscribeHydration = (cb: () => void) => {
  const a = usePreferences.persist.onFinishHydration(cb);
  const b = useResetPilot.persist.onFinishHydration(cb);
  return () => {
    a();
    b();
  };
};
const isHydrated = () => usePreferences.persist.hasHydrated() && useResetPilot.persist.hasHydrated();

function useHydrated() {
  return useSyncExternalStore(subscribeHydration, isHydrated);
}

/**
 * Native UI (alerts, keyboard, date picker) follows the app's choice too; 'unspecified' hands control back to the
 * phone's setting. On its own, so a theme choice doesn't re-render the whole app from the root.
 */
function NativeAppearance() {
  const preference = useThemePreference();
  useEffect(() => {
    // Not every platform implements it (react-native-web doesn't), and it's only a nicety.
    if (typeof Appearance.setColorScheme !== 'function') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);
  return null;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const { c, isDark } = useRootTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  useEffect(() => {
    if (!hydrated) return;
    void SplashScreen.hideAsync().catch(() => {});
    // Temporary share files left by a share that was cut off (lib/appFiles.ts); never saves or recovery copies.
    cleanupTemps();
    // The artwork about to be seen, decoded ahead of time (components/artPrefetch.ts).
    void prefetchArt(useResetPilot.getState().program);
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      <ThemeTransitionProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NativeAppearance />
        <ReminderSync />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
            animation: 'fade',
            animationDuration: 200,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          {/* No swipe back: set-up's own Back walks through the questions, and its drags belong to its controls. */}
          <Stack.Screen
            name="life-reset/setup"
            options={{ animation: 'slide_from_right', gestureEnabled: false, fullScreenGestureEnabled: false }}
          />
          {/* Habits, Journey and Insights. */}
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="life-reset/[id]" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="life-reset/add" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="life-reset/collection" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="life-reset/reflect" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen
            name="life-reset/story"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="privacy" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="legal" options={{ presentation: 'modal', animation: 'default' }} />
        </Stack>
        {/* The Day 1 and summit ceremonies, then the onboarding finale over everything, so Habits comes up beneath. */}
        <CeremonyHost />
        <FinaleHost />
        {/* A save that couldn't be fully read: over everything, until the person decides (store/recovery.ts). */}
        <RecoveryScreen />
      </ThemeTransitionProvider>
    </SafeAreaProvider>
  );
}
