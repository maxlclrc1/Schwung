import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { Appearance, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rescheduleReminders } from '../lib/notifications';
import { useClock } from '../lib/useClock';
import { useFieldNotes } from '../store/fieldNotes';
import { onPilotHydrated, pilotHydrated } from '../store/pilotGate';
import { useApp } from '../store/useApp';
import { useTheme, useThemePreference } from '../theme';
import { ThemeTransitionProvider } from '../theme/transition';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Every save (Schwung's, retired Field Notes' and the Life Reset's) is loaded before anything is shown.
const subscribeHydration = (cb: () => void) => {
  const a = useApp.persist.onFinishHydration(cb);
  const b = useFieldNotes.persist.onFinishHydration(cb);
  const c = onPilotHydrated(cb);
  return () => {
    a();
    b();
    c();
  };
};
const isHydrated = () => useApp.persist.hasHydrated() && useFieldNotes.persist.hasHydrated() && pilotHydrated();

function useHydrated() {
  return useSyncExternalStore(subscribeHydration, isHydrated);
}

/** Keeps levels and reminders in step with the calendar. */
function Housekeeping() {
  const { todayKey, yesterdayEditable } = useClock();
  const startedAt = useApp((s) => s.startedAt);

  useEffect(() => {
    if (startedAt) useApp.getState().reconcileNow(yesterdayEditable);
    if (startedAt) void rescheduleReminders().catch(() => {});
  }, [startedAt, todayKey, yesterdayEditable]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void rescheduleReminders().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  return null;
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
  const { c, isDark } = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <SafeAreaProvider>
      <ThemeTransitionProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Housekeeping />
        <NativeAppearance />
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
          <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="start" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="reveal" options={{ animation: 'slide_from_right' }} />
          {/* Habit Science V2 onboarding: development preview only (lib/flags). */}
          <Stack.Screen name="v2/quiz" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="v2/time" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="v2/plan" options={{ animation: 'slide_from_right' }} />
          {/* The program has started by now; there's no going back into onboarding. */}
          <Stack.Screen name="reminder" options={{ animation: 'slide_from_right', gestureEnabled: false }} />
          {/* Today, and in testing builds the Habits, Journey and Field Notes tabs. */}
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', animation: 'default' }} />
          {/* The Life Reset pilot: development and internal-testing builds only. */}
          <Stack.Screen name="pilot/setup" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="pilot/[id]" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="swap/[id]" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="journey" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'default' }} />
          {/* Field Notes: development and internal-testing builds only (each screen redirects away otherwise). */}
          <Stack.Screen name="fieldnotes/setup" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="fieldnotes/note" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen name="fieldnotes/history" options={{ presentation: 'modal', animation: 'default' }} />
          {/* Development builds only (the screen redirects away in release builds). */}
          <Stack.Screen name="dev/exercise" options={{ presentation: 'modal', animation: 'default' }} />
          <Stack.Screen
            name="ceremony"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
        </Stack>
      </ThemeTransitionProvider>
    </SafeAreaProvider>
  );
}
