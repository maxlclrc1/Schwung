import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle } from 'react-native-reanimated';
import { isMinor, SETUP_AGE_BANDS, type AgeBand } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { space, useTheme } from '../../theme';
import { useSelectColors, useSelected, useSelectedOpacity } from '../../theme/select';
import { T } from '../ui';
import { t as tr } from '../../i18n';
import { ageBandLabel, CONTOURS, H, smoothPath, STOPS, TRAIL, W } from './ageTrail';
import { useT } from '../../i18n/react';
import { flipX, physical } from '../../i18n/direction';

/*
 * Set-up's age question (docs/design-exploration/AGE_SCREEN_REDESIGN.md): five equal age bands as journal rows on
 * hairlines, under a quiet trail with one waypoint for each. The trail is only a drawing: it can't be touched, screen
 * readers skip it, and it never climbs (its ends sit at the same height), so no band reads as higher or further. 18+
 * is said before anything is chosen; Under 18 adds a calm note and set-up can't go on (PilotSetup: ageAllowsSetup).
 * Only the band is kept.
 */

const sys = ReduceMotion.System;

/** Short screens (iPhone SE) get a shallower drawing; it shallows again while the under-18 note shows. */
const SHORT = 700;

function Trail({ chosen, low }: { chosen: number; low: boolean }) {
  const { c, isDark } = useTheme();
  const { height } = useWindowDimensions();
  const [w, setW] = useState(0);
  const ky = (height < SHORT ? 0.42 : 0.8) * (low ? 0.7 : 1);
  const h = Math.round(H * ky);
  const k = w / W;
  // The waypoints' paper: the painting's own tone, so they sit in it rather than punch through it.
  const paper = isDark ? '#1F1C2B' : '#F4F1FA';
  const contour = isDark ? 'rgba(220,214,255,0.12)' : 'rgba(60,52,90,0.16)';
  const ahead = isDark ? 'rgba(245,243,255,0.34)' : 'rgba(25,22,33,0.32)';
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[styles.trail, physical, { minHeight: h }, height < SHORT && { marginBottom: space.sm }]}
    >
      {w > 0 ? (
        // Mirrored in a right-to-left launch, so the first band's waypoint is where reading starts.
        <Svg width={w} height={h} style={flipX}>
          <Defs>
            <LinearGradient id="ageTrailFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#fff" stopOpacity={0} />
              <Stop offset="0.1" stopColor="#fff" stopOpacity={1} />
              <Stop offset="0.9" stopColor="#fff" stopOpacity={1} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
            <Mask id="ageTrailMask" x="0" y="0" width={w} height={h} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={h} fill="url(#ageTrailFade)" />
            </Mask>
          </Defs>
          <G mask="url(#ageTrailMask)">
            <G fill="none" stroke={contour} strokeLinejoin="round">
              {CONTOURS.map((p, i) => (
                <Path key={i} d={smoothPath(p, k, ky)} strokeWidth={i === 1 || i === 3 ? 1.05 : 0.7} />
              ))}
            </G>
            <Path d={smoothPath(TRAIL, k, ky)} fill="none" stroke={ahead} strokeWidth={1.3} strokeLinecap="round" />
          </G>
          {STOPS.map(([x0, y0], i) =>
            i === chosen ? (
              <G key={i}>
                <Circle cx={x0 * k} cy={y0 * ky} r={7.5} fill={paper} stroke={c.accent} strokeWidth={1.4} />
                <Circle cx={x0 * k} cy={y0 * ky} r={4} fill={c.accent} />
              </G>
            ) : (
              <Circle
                key={i}
                cx={x0 * k}
                cy={y0 * ky}
                r={4.2}
                fill={paper}
                stroke={isDark ? c.textDim : c.textFaint}
                strokeWidth={1.3}
              />
            ),
          )}
        </Svg>
      ) : null}
    </View>
  );
}

function Row({ label, on, first, onPress }: { label: string; on: boolean; first: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const hair = `${c.text}1F`;
  const [pressed, setPressed] = useState(false);
  // The wash, the ring and its dot ease on the shared selection timing; the label's weight changes at once.
  const v = useSelected(on);
  const wash = useSelectColors(v, { backgroundColor: [pressed ? `${c.text}0A` : null, c.accentSoft] });
  const ring = useSelectColors(v, { borderColor: [c.textFaint, c.accent] });
  const ringWidth = useAnimatedStyle(() => ({ borderWidth: 1.5 + 0.5 * v.value }));
  const dot = useSelectedOpacity(v);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      // Spoken without the invisible direction marks.
      accessibilityLabel={label.replace(/[\u2066\u2069]/g, '')}
    >
      <Animated.View
        style={[styles.row, { borderBottomColor: hair }, first && { borderTopColor: hair, borderTopWidth: HAIR }, wash]}
      >
        <Animated.View style={[styles.radio, ring, ringWidth]}>
          <Animated.View style={[styles.dot, { backgroundColor: c.accent }, dot]} />
        </Animated.View>
        <T style={[styles.label, on && styles.labelOn]} color={c.text}>
          {label}
        </T>
      </Animated.View>
    </Pressable>
  );
}

export function AgeBands({
  value,
  onChange,
  label,
  onNote,
}: {
  value: AgeBand | null;
  onChange: (b: AgeBand) => void;
  /** The question, naming the group for screen readers. */
  label: string;
  /** The under-18 note has been laid out: bring it fully into view. */
  onNote?: () => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const short = useWindowDimensions().height < SHORT;
  const minor = value !== null && isMinor(value);
  const chosen = value === null ? -1 : SETUP_AGE_BANDS.indexOf(value as (typeof SETUP_AGE_BANDS)[number]);

  // iOS reads the note out when it appears (Android: the live region below).
  useEffect(() => {
    if (minor && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(tr('setup.ageBands.under18Note'));
  }, [minor]);

  return (
    <View style={styles.root}>
      <Trail chosen={chosen} low={minor} />
      <T color={c.textDim} style={[styles.adults, short && { marginBottom: space.sm }]}>
        {t('setup.ageDial.under18')}
      </T>
      <View accessibilityRole="radiogroup" accessibilityLabel={label}>
        {SETUP_AGE_BANDS.map((b, i) => (
          <Row
            key={b}
            first={i === 0}
            label={ageBandLabel(b)}
            on={value === b}
            onPress={() => {
              if (value !== b) haptic.select();
              onChange(b);
            }}
          />
        ))}
      </View>
      {minor ? (
        <Animated.View
          entering={FadeIn.duration(260).reduceMotion(sys)}
          style={[styles.note, { borderStartColor: c.peach }]}
          accessibilityLiveRegion="polite"
          onLayout={onNote}
        >
          <T color={c.textDim} style={styles.noteText}>
            {t('setup.ageBands.under18Note')}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}

const HAIR = StyleSheet.hairlineWidth * 2;

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  // Takes the room the screen has to spare (centred in it), never less than the drawing.
  trail: { flexGrow: 1, maxHeight: 150, justifyContent: 'center', marginBottom: space.md, marginHorizontal: -space.sm },
  adults: { fontSize: 15, lineHeight: 21, marginBottom: space.md },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 10,
    borderBottomWidth: HAIR,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { flex: 1, fontSize: 17, lineHeight: 22 },
  labelOn: { fontWeight: '600' },
  note: { marginTop: space.md, borderStartWidth: 2, paddingStart: space.md, paddingVertical: 2 },
  noteText: { fontSize: 15, lineHeight: 21 },
});
