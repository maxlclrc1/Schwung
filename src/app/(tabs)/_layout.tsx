import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ColorValue, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PagerTabs } from '../../components/PagerTabs';
import { WorldLayer } from '../../components/WorldLayer';
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

const HABITS = { title: 'Habits', tabBarIcon: tabIcon('checkmark-circle', 'checkmark-circle-outline') };
const JOURNEY = { title: 'Journey', tabBarIcon: mountainIcon('image-filter-hdr', 'image-filter-hdr-outline') };
const INSIGHTS = { title: 'Insights', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') };

/** Habits, Journey and Insights as bottom tabs, swiped between as one pager over the shared world (PagerTabs). */
export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.fill, { backgroundColor: c.bg }]}>
      {/* One world behind all three tabs; the pages are transparent over it, and move with it. */}
      <WorldLayer />
      <PagerTabs>
        <PagerTabs.Screen name="today" options={HABITS} />
        <PagerTabs.Screen name="progress" options={JOURNEY} />
        <PagerTabs.Screen name="insights" options={INSIGHTS} />
      </PagerTabs>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
