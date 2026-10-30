import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { ASCENT_ASPECT, DAY_POINTS, LANDMARKS, trailDots } from '../core/ascent';
import { PROGRAM_DAYS } from '../core/dates';
import { useTheme } from '../theme';
import { TodayOrb } from './Ascent';
import { physical } from '../i18n/direction';

const DOTS = trailDots(3);

/**
 * The Ascent before the climb: the empty trail and its landmarks, with one glowing orb at the trailhead.
 * Drawn over the WorldBackdrop's painting, which is placed to match this view (full width, 3:2).
 * Decorative only, so screen readers skip it. Nothing containing an icon is ever scaled.
 */
export function TrailHero({ width }: { width: number }) {
  const { c, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const height = Math.round(width / ASCENT_ASPECT);
  const ahead = isDark ? 'rgba(245,243,255,0.26)' : 'rgba(25,22,33,0.2)';
  const halo = isDark ? 'rgba(167,139,250,0.22)' : 'rgba(116,81,200,0.16)';
  const badge = isDark ? 'rgba(28,27,37,0.92)' : 'rgba(255,255,255,0.94)';
  const start = DAY_POINTS[0];

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[physical, { width, height }]}
    >
      {DOTS.map((d, i) => (
        <View
          key={i}
          style={[styles.dot, { left: d.x * width - 1.25, top: d.y * height - 1.25, backgroundColor: ahead }]}
        />
      ))}
      {Object.entries(LANDMARKS).map(([day, mark]) => {
        const p = DAY_POINTS[Number(day) - 1];
        const summit = Number(day) === PROGRAM_DAYS;
        const size = summit ? 26 : 20;
        return (
          <View
            key={day}
            style={[
              styles.badge,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                left: p.x * width - size / 2,
                top: p.y * height - size / 2,
                backgroundColor: badge,
                borderColor: summit ? c.gold : ahead,
              },
            ]}
          >
            <Ionicons name={mark.icon} size={summit ? 14 : 11} color={summit ? c.gold : c.textDim} />
          </View>
        );
      })}
      <TodayOrb
        x={start.x * width}
        y={start.y * height}
        color={c.accent}
        halo={halo}
        animate={!reduceMotion}
        todayDone={false}
        landmark={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 1.25 },
  badge: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
