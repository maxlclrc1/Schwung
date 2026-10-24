import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { EXERCISE_CONTENT, EXERCISE_SAFETY, SELF_CHECK, type ExerciseId } from '../core/v2/exercise';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/** How to do an exercise habit: set-up, each movement in plain steps, its rhythm, and the safety lines. */
export function ExerciseGuide({ id }: { id: ExerciseId }) {
  const { c } = useTheme();
  const content = EXERCISE_CONTENT[id];
  return (
    <View style={{ gap: space.md }}>
      <T v="overline" color={c.textDim} accessibilityRole="header">
        How to do it
      </T>
      <T color={c.textDim}>{content.setup}</T>
      {content.movements.map((m, i) => (
        <ThemedView
          key={m.name}
          style={[styles.card, { backgroundColor: c.surface }]}
          accessible
          accessibilityLabel={`Movement ${i + 1}: ${m.name}. ${m.steps.join(' ')}`}
        >
          <T v="bodyStrong">{m.name}</T>
          {m.steps.map((step) => (
            <T key={step} v="caption" color={c.textDim}>
              {step}
            </T>
          ))}
        </ThemedView>
      ))}
      <T v="caption" color={c.textDim}>
        {content.rhythm}
      </T>
      <SafetyLines />
    </View>
  );
}

export function SafetyLines() {
  const { c } = useTheme();
  return (
    <ThemedView
      style={[styles.card, { backgroundColor: c.surface }]}
      accessible
      accessibilityLabel={`Safety. ${EXERCISE_SAFETY.join(' ')}`}
    >
      <T v="overline" color={c.accentInk}>
        Safety
      </T>
      {EXERCISE_SAFETY.map((line) => (
        <View key={line} style={styles.line}>
          <Ionicons name="shield-checkmark-outline" size={16} color={c.textDim} style={{ marginTop: 2 }} />
          <T v="caption" color={c.text} style={{ flex: 1 }}>
            {line}
          </T>
        </View>
      ))}
    </ThemedView>
  );
}

/** The level-up self-check for exercise habits: ticked by the person, never preselected. */
export function SelfCheckToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={SELF_CHECK}
      style={styles.line}
      hitSlop={6}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? c.accentInk : c.textDim} />
      <T v="caption" style={{ flex: 1 }}>
        {SELF_CHECK}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: space.lg, gap: space.xs },
  line: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
});
