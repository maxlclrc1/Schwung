import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SettingsButton } from '../../components/HeaderButton';
import { JourneyView } from '../../components/JourneyView';
import { Screen, T } from '../../components/ui';
import { tabs } from '../../lib/flags';
import { useApp } from '../../store/useApp';
import { space } from '../../theme';

/** The Journey tab (testing builds): the same journey the public release opens as a sheet from Today. */
export default function JourneyTab() {
  const insets = useSafeAreaInsets();
  const started = useApp((s) => s.startedAt !== null);
  // Opened from a marker on the Ascent: outline that day.
  const picked = Number(useLocalSearchParams<{ day?: string }>().day) || null;
  if (!tabs()) return <Redirect href="/journey" />;
  return (
    <Screen edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        <T v="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
          Your journey
        </T>
        <SettingsButton />
      </View>
      {started ? (
        <JourneyView picked={picked} />
      ) : (
        <View style={styles.empty}>
          <T>Your 66 days will show here once you start a habit plan.</T>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
});
