import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, type ComponentProps } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { togglePrecaution, type HealthAnswer, type Precaution } from '../../core/reset/profile';
import { space, useTheme } from '../../theme';
import { T } from '../ui';
import { HEALTH } from '../pilot/SetupParts';
import { useT } from '../../i18n/react';
import { physical } from '../../i18n/direction';
import { Press } from './Choices';
import { settle, useTints, type Tint } from './kit';

/*
 * Set-up's health question as alpine field notes (docs/archive/design-exploration/HEALTH_SCREEN_REDESIGN.md, Option B): a
 * window onto the world painting opens the page and fades into it; the precautions are waypoints on one fine trail
 * down the margin, each with its own small icon. Chosen, a waypoint fills with the question's peach and its icon
 * turns into a tick with a quarter turn, and its row takes the peach wash and ink. After a hairline with a short warm
 * rule, "None of these" (sage) and "Rather not say" (mist) are two quiet choices with their own icons.
 *
 * The answer is the same as ever: precautions, [] for "None of these", 'unknown' for "Rather not say"; null while
 * unanswered. Unticking the last precaution leaves it unanswered (togglePrecaution).
 */

type Icon = ComponentProps<typeof Ionicons>['name'];
const ICON: Record<Precaution, Icon> = {
  joint: 'bandage-outline',
  walkingDifficult: 'walk-outline',
  heart: 'heart-outline',
  pregnancy: 'flower-outline',
  fluidLimit: 'water-outline',
  sleepCondition: 'moon-outline',
};

const HAIR = StyleSheet.hairlineWidth * 2;
const MARK = 32;
/** The painting window's height; the question starts this much above its foot, in the mist. */
const WINDOW = 176;
const OVERLAP = 64;

/** The painting window's art: the painting's summit and dusk band, its fade into the backdrop above and below
 * baked into the image's alpha (PAD transparent points at each end), so drawing it needs no mask. */
const WINDOW_ART = {
  dark: require('../../../assets/health-window-dark.webp'),
  light: require('../../../assets/health-window-light.webp'),
};
const PAD = 20;

/**
 * The painting's summit at dusk, at the top of the page, fading on its alpha into the backdrop above and below (no
 * edge). It sits behind the question's first lines. Decorative. A plain image: an SVG image under an SVG mask
 * crashed Expo Go on iOS when this step opened.
 */
export function PaintingWindow() {
  const { isDark } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[styles.window, physical]}
    >
      <Image
        source={isDark ? WINDOW_ART.dark : WINDOW_ART.light}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessible={false}
        transition={0}
      />
    </View>
  );
}

/** The same colour, fully transparent (so a wash fades in without passing through grey). */
const clear = (color: string) =>
  color.startsWith('#') ? `${color.slice(0, 7)}00` : color.replace(/,\s*[\d.]+\)$/, ', 0)');

/** 0 → 1 as `on` turns true, on the shared curve (instant with reduced motion). */
function useOn(on: boolean) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(settle(on ? 1 : 0));
  }, [on, v]);
  return v;
}

/** One precaution: its waypoint (icon, or a tick when chosen) and its words; the row takes the tint when chosen. */
function Precaution({
  label,
  icon,
  on,
  tint,
  onPress,
}: {
  label: string;
  icon: Icon;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const hair = `${c.text}1A`;
  const t = useOn(on);
  // Worked out here, not in the worklet: a plain function can't be called on the UI thread (it crashed iOS).
  const none = clear(tint.soft);
  const wash = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [none, tint.soft]),
  }));
  const mark = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [tint.soft, tint.fill]),
  }));
  const before = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ rotate: `${t.value * 90}deg` }] }));
  const after = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ rotate: `${(t.value - 1) * 90}deg` }] }));
  return (
    <Press
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.row, wash]}>
        <Animated.View style={[styles.mark, mark]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, before]}>
            <Ionicons name={icon} size={16} color={tint.ink} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, after]}>
            <Ionicons name="checkmark" size={17} color={tint.on} />
          </Animated.View>
        </Animated.View>
        <View style={[styles.words, { borderBottomColor: hair }]}>
          <T color={on ? tint.ink : c.text} style={[styles.label, on && styles.on]}>
            {label}
          </T>
        </View>
      </Animated.View>
    </Press>
  );
}

/** "None of these" or "Rather not say": quiet, with its icon; chosen, a tick and its own tint. */
function Either({
  label,
  icon,
  on,
  tint,
  onPress,
}: {
  label: string;
  icon: Icon;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <View style={[styles.either, on && { backgroundColor: tint.soft }]}>
        <Ionicons name={on ? 'checkmark' : icon} size={17} color={on ? tint.ink : c.textDim} />
        <T color={on ? tint.ink : c.textDim} style={[styles.small, on && styles.on]}>
          {label}
        </T>
      </View>
    </Press>
  );
}

export function HealthList({ value, onChange }: { value: HealthAnswer; onChange: (h: HealthAnswer) => void }) {
  const { c, isDark } = useTheme();
  const tints = useTints();
  const t = useT();
  const trail = isDark ? 'rgba(245,243,255,0.26)' : 'rgba(25,22,33,0.22)';
  return (
    <View>
      <View>
        {/* The margin trail: one fine line through every waypoint, like a route down the page. */}
        <View pointerEvents="none" style={[styles.trail, { backgroundColor: trail }]} />
        {HEALTH.map((h) => (
          <Precaution
            key={h.id}
            label={h.label}
            icon={ICON[h.id]}
            tint={tints.peach}
            on={Array.isArray(value) && value.includes(h.id)}
            onPress={() => onChange(togglePrecaution(value, h.id))}
          />
        ))}
      </View>
      {/* A field-journal break: a hairline with a short warm rule at its start. */}
      <View style={[styles.rule, { backgroundColor: `${c.text}29` }]}>
        <View style={[styles.accent, { backgroundColor: c.peach }]} />
      </View>
      <View style={styles.pair}>
        <Either
          label={t('setup.q.none')}
          icon="leaf-outline"
          tint={tints.sage}
          on={Array.isArray(value) && value.length === 0}
          onPress={() => onChange([])}
        />
        <Either
          label={t('setup.q.ratherNot')}
          icon="eye-off-outline"
          tint={tints.mist}
          on={value === 'unknown'}
          onPress={() => onChange('unknown')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    height: WINDOW + PAD * 2,
    marginHorizontal: -space.xl,
    marginTop: -space.xl - PAD,
    marginBottom: -OVERLAP - PAD,
  },
  // Through the waypoints' centres, from the first to the last.
  trail: { position: 'absolute', top: 28, bottom: 28, start: space.xs + MARK / 2 - 0.65, width: 1.3 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingStart: space.xs },
  mark: { width: MARK, height: MARK, borderRadius: MARK / 2, overflow: 'hidden' },
  mid: { alignItems: 'center', justifyContent: 'center' },
  words: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingEnd: space.sm,
    borderBottomWidth: HAIR,
  },
  label: { fontSize: 17, lineHeight: 22 },
  on: { fontWeight: '600' },
  rule: { marginTop: space.xl, height: 1 },
  accent: { position: 'absolute', top: -0.5, start: 0, width: 28, height: 2, borderRadius: 1 },
  pair: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, marginTop: space.sm },
  either: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
    borderRadius: 8,
  },
  small: { fontSize: 15.5, lineHeight: 20 },
});
