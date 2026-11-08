import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';
import { flipX } from '../i18n/direction';
import { Tap } from './Tap';

/*
 * Settings as a page of the journal (as Habit Details and Insights): each section a small-capitals heading on a
 * hairline, then full-width rows, each closed by a hairline. No cards.
 */

/** A section: its name in small capitals on a hairline, then its rows. */
export function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={first ? null : styles.gap}>
      <View style={styles.head} accessible accessibilityRole="header">
        <T v="overline" color={c.textDim} style={styles.title} maxFontSizeMultiplier={1.6}>
          {title}
        </T>
        <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
      </View>
      {children}
    </View>
  );
}

/** A row: an optional small icon, its label (and a line under it), a value or a chevron at the end. */
export function Row({
  label,
  hint,
  icon,
  value,
  onPress,
  destructive,
  chevron = !!onPress,
  children,
}: {
  label: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.rowLine, { borderColor: c.border }]}>
      <Tap
        onPress={
          onPress
            ? () => {
                onPress();
                haptic.select();
              }
            : undefined
        }
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? [label, hint, value].filter(Boolean).join('. ') : undefined}
        style={styles.row}
      >
        {icon ? (
          <Ionicons name={icon} size={19} color={destructive ? c.danger : c.textDim} style={styles.icon} />
        ) : null}
        <View style={styles.label}>
          <T color={destructive ? c.danger : c.text}>{label}</T>
          {hint ? (
            <T v="caption" color={c.textDim}>
              {hint}
            </T>
          ) : null}
        </View>
        {value ? (
          <T color={c.textDim} numberOfLines={1} style={styles.value}>
            {value}
          </T>
        ) : null}
        {children}
        {chevron ? <Ionicons name="chevron-forward" size={17} color={c.textFaint} style={flipX} /> : null}
      </Tap>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: space.xxl },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.xs },
  title: { flexShrink: 1, maxWidth: '80%', fontSize: 11.5, letterSpacing: 2 },
  rule: { flex: 1, minWidth: 12, height: StyleSheet.hairlineWidth },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  icon: { width: 22, textAlign: 'center' },
  label: { flex: 1, gap: 1 },
  value: { flexShrink: 1, maxWidth: '45%' },
});
