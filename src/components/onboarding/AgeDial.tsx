import { StyleSheet, View } from 'react-native';
import type { AgeBand } from '../../core/reset/profile';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { useTints } from './kit';
import { RollingText, StepRound, Tape } from './Tape';

export const AGE_MIN = 12;
export const AGE_MAX = 90;

/** The band the program keeps (only the band is saved, never the age itself). */
export function bandOf(years: number): AgeBand {
  return years < 16
    ? 'u16'
    : years < 18
      ? '16_17'
      : years < 30
        ? '18_29'
        : years < 50
          ? '30_49'
          : years < 65
            ? '50_64'
            : '65p';
}
/** An age inside a band, for coming back to a band already chosen. */
export const YEARS_OF: Record<AgeBand, number> = {
  u16: 15,
  '16_17': 17,
  '18_29': 24,
  '30_49': 38,
  '50_64': 56,
  '65p': 68,
};
const BAND_LABEL: Record<AgeBand, string> = {
  u16: 'Under 16',
  '16_17': '16–17',
  '18_29': '18–29',
  '30_49': '30–49',
  '50_64': '50–64',
  '65p': '65+',
};

/**
 * The age, large, on a soft disc; a tape underneath to slide, − and + for one year. Nothing counts as chosen
 * until it's touched.
 */
export function AgeDial({ years, onChange }: { years: number | null; onChange: (y: number) => void }) {
  const { c } = useTheme();
  const t = useTints();
  const rest = 25;
  const band = years === null ? null : bandOf(years);
  const young = band === 'u16';
  const set = (y: number) => onChange(Math.max(AGE_MIN, Math.min(AGE_MAX, y)));

  return (
    <View
      style={{ gap: space.lg }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Your age"
      accessibilityValue={{ text: years === null ? 'Not chosen' : `${years}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        set(years === null ? rest : years + (e.nativeEvent.actionName === 'increment' ? 1 : -1))
      }
    >
      <View style={styles.stage}>
        <View
          pointerEvents="none"
          style={[styles.disc, { backgroundColor: young ? 'transparent' : t.lavender.soft }]}
        />
        <View style={styles.number}>
          <StepRound
            icon="remove"
            label="One year younger"
            disabled={years === AGE_MIN}
            onPress={() => set((years ?? rest + 1) - 1)}
          />
          <View style={styles.digits}>
            <RollingText
              text={years === null ? '––' : years >= AGE_MAX ? `${AGE_MAX}+` : `${years}`}
              size={88}
              charWidth={56}
              color={years === null ? c.textFaint : c.text}
            />
          </View>
          <StepRound
            icon="add"
            label="One year older"
            disabled={years === AGE_MAX}
            onPress={() => set((years ?? rest - 1) + 1)}
          />
        </View>
        <View
          style={[styles.chip, { backgroundColor: young ? 'transparent' : band ? t.lavender.soft : 'transparent' }]}
        >
          <T v="caption" color={young ? c.danger : band ? t.lavender.ink : c.textFaint} style={{ fontWeight: '700' }}>
            {band
              ? young
                ? 'Schwung is made for people 16 and older.'
                : `${BAND_LABEL[band]} years`
              : 'Slide the ruler to your age'}
          </T>
        </View>
      </View>
      <Tape
        min={AGE_MIN}
        max={AGE_MAX}
        step={1}
        unitPx={16}
        minorEvery={1}
        majorEvery={5}
        labelEvery={10}
        format={(v) => `${v}`}
        value={years}
        rest={rest}
        onChange={set}
        tint={t.lavender}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', paddingTop: space.lg },
  disc: { position: 'absolute', top: 0, width: 140, height: 140, borderRadius: 70 },
  number: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 112 },
  digits: { minWidth: 120, alignItems: 'center' },
  chip: {
    marginTop: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minHeight: 30,
    justifyContent: 'center',
  },
});
