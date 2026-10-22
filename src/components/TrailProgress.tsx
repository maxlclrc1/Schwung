import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

/** Quiz progress as trail markers: walked steps filled, the current one glowing, the rest ahead. */
export function TrailProgress({ step, total }: { step: number; total: number }) {
  const { c } = useTheme();
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Question ${step + 1} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={i === 0 ? styles.first : styles.cell}>
          {i > 0 ? (
            <View style={styles.trail}>
              {[0, 1, 2].map((d) => (
                <ThemedView key={d} style={[styles.dot, { backgroundColor: i <= step ? c.accent : c.border }]} />
              ))}
            </View>
          ) : null}
          {i === step ? (
            <ThemedView style={[styles.current, { backgroundColor: c.accentSoft }]}>
              <ThemedView style={[styles.core, { backgroundColor: c.accent }]} />
            </ThemedView>
          ) : (
            <ThemedView
              style={[
                styles.marker,
                i < step ? { backgroundColor: c.accent, borderColor: c.accent } : { borderColor: c.border },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  cell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  first: { flexDirection: 'row', alignItems: 'center' },
  trail: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: 2 },
  dot: { width: 3, height: 3, borderRadius: 1.5 },
  marker: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  current: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  core: { width: 10, height: 10, borderRadius: 5 },
});
