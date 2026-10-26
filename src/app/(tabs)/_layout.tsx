import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Platform, View, type ColorValue, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onPageTransitionStart, pageTransition, useTabPager } from '../../components/TabPager';
import { useWorldLayer, WorldLayer } from '../../components/WorldLayer';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { fieldNotesAvailable } from '../../store/fieldNotes';
import { useTheme } from '../../theme';

/** The tabs a swipe moves between, in order. */
const PAGES = ['/today', '/progress', '/fieldnotes'] as const;
type Page = (typeof PAGES)[number];
/** On the web, the browser keeps vertical pans and hands sideways ones to the pager (iOS decides natively). */
const WEB_PAN_Y = Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : null;

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
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  // Swiping between the tabs, over the world (testing builds; see TabPager). The pages sit side by side and all
  // stay mounted, so a drag shows the next one coming in; with Reduce Motion a swipe just changes tab (a fade).
  const routes = fieldNotesAvailable() ? PAGES : PAGES.slice(0, 2);
  const index = (routes as readonly string[]).indexOf(pathname);
  // The tab underneath while a sheet or Settings is open over it.
  const [focused, setFocused] = useState(Math.max(0, index));
  if (index >= 0 && index !== focused) setFocused(index);
  const pager = useTabPager({
    routes,
    index,
    width,
    enabled: on && world,
    follow: !reduceMotion,
  });
  const slide = world && !reduceMotion;
  return (
    <View {...(on && world ? pager : null)} style={[{ flex: 1, backgroundColor: c.bg }, on && world && WEB_PAN_Y]}>
      {/* One world behind all three tabs; the screens are transparent over it. */}
      {world ? <WorldLayer /> : null}
      <Tabs
        // The pages stay attached while off screen, so they can slide in beside the current one.
        detachInactiveScreens={!slide}
        backBehavior="initialRoute"
        tabBar={on ? undefined : () => null}
        screenListeners={{ tabPress: () => haptic.tap(), transitionStart: onPageTransitionStart }}
        screenOptions={({ route }) => ({
          headerShown: false,
          sceneStyle: { backgroundColor: world ? 'transparent' : c.bg },
          // Over the shared world the screens are transparent: they slide side by side as the world pans (a swipe
          // drags them; a tap slides them the same way), or fade with Reduce Motion.
          ...(slide
            ? { ...pageTransition(width, Math.abs(PAGES.indexOf(`/${route.name}` as Page) - focused)), lazy: false }
            : { animation: world ? 'fade' : 'none' }),
          tabBarActiveTintColor: c.accentInk,
          tabBarInactiveTintColor: c.textDim,
          // A little taller than the default so labels never clip; the home indicator's space comes on top.
          tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 56 + insets.bottom },
          tabBarLabelStyle: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
        })}
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
