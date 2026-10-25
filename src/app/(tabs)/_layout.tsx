import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { fieldNotesAvailable } from '../../store/fieldNotes';
import { useTheme } from '../../theme';

// Habits is the home tab: going back from another tab (or from one opened directly) returns to it.
export const unstable_settings = { anchor: 'today' };

type Icon = keyof typeof Ionicons.glyphMap;

function tabIcon(on: Icon, off: Icon) {
  function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? on : off} size={size} color={color as string} />;
  }
  return TabIcon;
}

/**
 * Habits, Journey and Field Notes as bottom tabs (development and internal-testing builds). The public release
 * has no tab bar and no other tabs: Today shows on its own, exactly as before. (It's still this navigator rather
 * than a bare Slot, so Today can open the ceremony, the journey sheet and Settings over itself.)
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const on = tabs();
  return (
    <Tabs
      backBehavior="initialRoute"
      tabBar={on ? undefined : () => null}
      screenListeners={{ tabPress: () => haptic.tap() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.accentInk,
        tabBarInactiveTintColor: c.textDim,
        // A little taller than the default so labels never clip; the home indicator's space comes on top.
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 56 + insets.bottom },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{ title: 'Habits', tabBarIcon: tabIcon('checkmark-circle', 'checkmark-circle-outline') }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Journey',
          tabBarIcon: tabIcon('trail-sign', 'trail-sign-outline'),
          href: on ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="fieldnotes"
        options={{
          title: 'Field Notes',
          tabBarIcon: tabIcon('compass', 'compass-outline'),
          href: on && fieldNotesAvailable() ? undefined : null,
        }}
      />
    </Tabs>
  );
}
