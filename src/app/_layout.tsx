import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { rescheduleReminders } from '../lib/notifications';
import { useClock } from '../lib/useClock';
import { useApp } from '../store/useApp';
import { useTheme } from '../theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

const subscribeHydration = (cb: () => void) => useApp.persist.onFinishHydration(cb);
const isHydrated = () => useApp.persist.hasHydrated();

function useHydrated() {
  return useSyncExternalStore(subscribeHydration, isHydrated);
}

/** Keeps levels and reminders in step with the calendar. */
function Housekeeping() {
  const { todayKey, yesterdayEditable } = useClock();
  const startedAt = useApp((s) => s.startedAt);

  useEffect(() => {
    if (!startedAt) return;
    useApp.getState().reconcileNow(yesterdayEditable);
    void rescheduleReminders().catch(() => {});
  }, [startedAt, todayKey, yesterdayEditable]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void rescheduleReminders().catch(() => {});
    });
    return () => sub.remove();
  }, []);

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
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Housekeeping />
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
        <Stack.Screen name="reveal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="reminder" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="today" options={{ gestureEnabled: false }} />
        <Stack.Screen name="habit/[id]" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="swap/[id]" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="add" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="journey" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen
          name="ceremony"
          options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
