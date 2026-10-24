import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ASCENT_PHASES, LANDMARKS } from '../core/ascent';
import { LEVEL_NAME, LEVELS, shownText } from '../core/habits';
import type { Level } from '../core/types';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/**
 * One habit's three levels as a path: Foundation, Momentum, Mastery, each with the person's own target.
 * With `current`, it marks where they are and the next step; with `onPick`, each level can be chosen (habit detail).
 * With `days`, each level shows the phase it is planned for (the plan screen).
 */
export function TargetPath({
  targets,
  current,
  onPick,
  days,
  about,
}: {
  targets: Record<Level, string>;
  current?: Level;
  onPick?: (level: Level) => void;
  days?: boolean;
  about?: [string, string, string];
}) {
  const { c } = useTheme();
  const at = current ? LEVELS.indexOf(current) : -1;
  return (
    <ThemedView
      style={[styles.box, { backgroundColor: c.surface }]}
      accessibilityRole={onPick ? 'radiogroup' : undefined}
    >
      {LEVELS.map((level, i) => {
        const phase = ASCENT_PHASES[i];
        const mark = LANDMARKS[phase.to];
        const summit = i === LEVELS.length - 1;
        const here = i === at;
        const next = i === at + 1 && at >= 0;
        const done = at >= 0 && i < at;
        const tint = here ? c.accentInk : summit ? c.gold : c.accentInk;
        const target = shownText(targets[level]);
        const tag = here ? 'You’re here' : next ? 'Next' : null;
        const row = (
          <View style={styles.row}>
            <View style={styles.rail}>
              <ThemedView
                style={[
                  styles.badge,
                  {
                    borderColor: tint,
                    backgroundColor: here ? c.accentSoft : c.bg,
                  },
                ]}
              >
                <Ionicons name={done ? 'checkmark' : mark.icon} size={13} color={tint} />
              </ThemedView>
              {summit ? null : <ThemedView style={[styles.line, { backgroundColor: done ? c.accentInk : c.border }]} />}
            </View>
            <View style={[styles.text, summit && styles.textLast]}>
              <View style={styles.head}>
                <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                  {LEVEL_NAME[level]}
                  {days ? ` · Days ${phase.from}–${phase.to}` : ''}
                </T>
                {tag ? (
                  <ThemedView style={[styles.tag, { backgroundColor: here ? c.accent : c.surfaceHigh }]}>
                    <T
                      v="caption"
                      color={here ? c.onAccent : c.textDim}
                      style={styles.tagText}
                      maxFontSizeMultiplier={1.3}
                    >
                      {tag}
                    </T>
                  </ThemedView>
                ) : null}
              </View>
              <T v="bodyStrong" color={here || at < 0 ? c.text : c.textDim}>
                {target}
              </T>
              {about ? (
                <T v="caption" color={c.textDim}>
                  {about[i]}
                </T>
              ) : null}
            </View>
          </View>
        );
        const label = `${LEVEL_NAME[level]}${days ? `, days ${phase.from} to ${phase.to}` : ''}. ${target}.${
          tag ? ` ${tag}.` : ''
        }${about ? ` ${about[i]}` : ''}`;
        return onPick ? (
          <Pressable
            key={level}
            onPress={() => {
              if (here) return;
              haptic.tap();
              onPick(level);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: here }}
            accessibilityLabel={label}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            {row}
          </Pressable>
        ) : (
          <View key={level} accessible accessibilityLabel={label}>
            {row}
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, padding: space.lg },
  row: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 26 },
  badge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, minHeight: space.md, marginVertical: 4, borderRadius: 1 },
  text: { flex: 1, gap: 2, paddingBottom: space.lg },
  textLast: { paddingBottom: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  tag: { paddingHorizontal: space.sm, paddingVertical: 1, borderRadius: radius.pill },
  tagText: { fontWeight: '700' },
});
