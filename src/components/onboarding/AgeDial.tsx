import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { AgeBand } from '../../core/reset/profile';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { settle, useTints } from './kit';
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
 * The age, large, over a small painted horizon whose sun travels the sky with the years (a life as one day); a
 * tape underneath to slide, − and + for one year. Nothing counts as chosen until it's touched.
 */
export function AgeDial({ years, onChange }: { years: number | null; onChange: (y: number) => void }) {
  const { c } = useTheme();
  const t = useTints();
  const rest = 25;
  const shown = years ?? rest;
  const sun = useSharedValue((shown - AGE_MIN) / (AGE_MAX - AGE_MIN));
  useEffect(() => {
    sun.set(settle((shown - AGE_MIN) / (AGE_MAX - AGE_MIN), 520));
  }, [shown, sun]);
  const W = 220;
  const H = 120;
  const body = useAnimatedStyle(() => {
    const a = Math.PI * (0.08 + sun.value * 0.84);
    return {
      transform: [{ translateX: W / 2 - Math.cos(a) * 92 - 14 }, { translateY: 96 - Math.sin(a) * 70 - 14 }],
    };
  });
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
        <View style={{ width: W, height: H }} pointerEvents="none">
          <View style={[styles.halo, { backgroundColor: t.lavender.soft }]} />
          <Animated.View style={[styles.sun, { backgroundColor: young ? c.danger : t.peach.fill }, body]} />
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            <Path
              d={`M0 ${H} L0 98 C 40 84, 70 78, 104 88 C 140 98, 170 74, ${W} 86 L ${W} ${H} Z`}
              fill={t.mist.fill}
              fillOpacity={0.4}
            />
            <Path
              d={`M0 ${H} L0 108 C 50 96, 90 112, 130 102 C 170 92, 196 104, ${W} 100 L ${W} ${H} Z`}
              fill={t.sage.fill}
              fillOpacity={0.6}
            />
          </Svg>
        </View>
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
  stage: { alignItems: 'center' },
  halo: { position: 'absolute', left: 30, top: 6, width: 160, height: 160, borderRadius: 80 },
  sun: { position: 'absolute', left: 0, top: 0, width: 28, height: 28, borderRadius: 14 },
  number: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginTop: -space.xl },
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
