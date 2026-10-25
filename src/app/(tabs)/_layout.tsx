import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { View, type ColorValue } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorldLayer, WorldLayer } from '../../components/WorldLayer';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { fieldNotesAvailable } from '../../store/fieldNotes';
import { useTheme } from '../../theme';

// Habits is the home tab: going back from another tab (or from one opened directly) returns to it.
export const unstable_settings = { anchor: 'today' };

type Icon = keyof typeof Ionicons.glyphMap;

type MountainIcon = keyof typeof MaterialCommunityIcons.glyphMap;

/** The Journey tab's mountain (Ionicons has none). */
function mountainIcon(on: MountainIcon, off: MountainIcon) {
  function MountainTabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <MaterialCommunityIcons name={focused ? on : off} size={size} color={color as string} />;
  }
  return MountainTabIcon;
}

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
  const world = useWorldLayer();
  const reduceMotion = useReducedMotion();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* One world behind all three tabs; the screens are transparent over it. */}
      {world ? <WorldLayer /> : null}
      <Tabs
        backBehavior="initialRoute"
        tabBar={on ? undefined : () => null}
        screenListeners={{ tabPress: () => haptic.tap() }}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: world ? 'transparent' : c.bg },
          // Over the shared world the screens are transparent, so a hidden tab must fade out: the content shifts
          // the way the world pans (a plain fade with Reduce Motion).
          animation: world ? (reduceMotion ? 'fade' : 'shift') : 'none',
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
            tabBarIcon: mountainIcon('image-filter-hdr', 'image-filter-hdr-outline'),
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
    </View>
  );
}
