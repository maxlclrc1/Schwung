import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, G, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import { togglePrecaution, type HealthAnswer } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { space, useTheme } from '../../theme';
import { T } from '../ui';
import { HEALTH } from '../pilot/SetupParts';
import { useT } from '../../i18n/react';
import { flipX, physical } from '../../i18n/direction';
import { smoothPath } from './ageTrail';

/*
 * Set-up's health question as an expedition-journal page (docs/design-exploration/HEALTH_SCREEN_REDESIGN.md, Option
 * A): the Age page's rows carried on. A slim band of contour lines under the hint (the Age trail without its
 * waypoints), six precautions as full-width rows on hairlines with square tick boxes (any that apply), then, after a
 * hairline with a short warm rule, "None of these" and "Rather not say" side by side with round marks (one or the
 * other). One violet accent for everything chosen.
 *
 * The answer is the same as ever: precautions, [] for "None of these", 'unknown' for "Rather not say"; null while
 * unanswered. Unticking the last precaution leaves it unanswered (togglePrecaution).
 */

const HAIR = StyleSheet.hairlineWidth * 2;

/** Contour lines in a 340 × 22 box: uneven, some breaking off, fading out at both ends. */
const CONTOURS: [number, number][][] = [
  [
    [-10, 6],
    [40, 4],
    [96, 8],
    [150, 5],
    [206, 9],
    [262, 4],
    [312, 7],
    [350, 5],
  ],
  [
    [-10, 13],
    [52, 11],
    [104, 15],
    [160, 12],
    [214, 15],
    [270, 11],
    [350, 14],
  ],
  [
    [30, 19],
    [84, 17],
    [130, 20],
    [176, 18],
  ],
  [
    [220, 20],
    [262, 17],
    [306, 20],
    [340, 18],
  ],
];
const CH = 22;

function ContourRule() {
  const { isDark } = useTheme();
  const [w, setW] = useState(0);
  const k = w / 340;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[styles.contours, physical]}
    >
      {w > 0 ? (
        <Svg width={w} height={CH} style={flipX}>
          <Defs>
            <LinearGradient id="healthContourFade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#fff" stopOpacity={0} />
              <Stop offset="0.12" stopColor="#fff" stopOpacity={1} />
              <Stop offset="0.88" stopColor="#fff" stopOpacity={1} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </LinearGradient>
            <Mask id="healthContourMask" x="0" y="0" width={w} height={CH} maskUnits="userSpaceOnUse">
              <Rect x="0" y="0" width={w} height={CH} fill="url(#healthContourFade)" />
            </Mask>
          </Defs>
          <G
            mask="url(#healthContourMask)"
            fill="none"
            stroke={isDark ? 'rgba(220,214,255,0.14)' : 'rgba(60,52,90,0.18)'}
            strokeLinejoin="round"
          >
            {CONTOURS.map((p, i) => (
              <Path key={i} d={smoothPath(p, k, 1)} strokeWidth={i === 1 ? 1.05 : 0.7} />
            ))}
          </G>
        </Svg>
      ) : null}
    </View>
  );
}

/** A tick box (any that apply): an outline, or violet with a tick. */
function TickBox({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.box, on ? { backgroundColor: c.accent, borderWidth: 0 } : { borderColor: c.textFaint }]}>
      {on ? <Ionicons name="checkmark" size={15} color={c.onAccent} /> : null}
    </View>
  );
}

/** A round mark (one or the other): an outline, or a violet ring with a dot. */
function RoundMark({ on }: { on: boolean }) {
  const { c } = useTheme();
  return (
    <View style={[styles.round, on ? { borderColor: c.accent, borderWidth: 2 } : { borderColor: c.textFaint }]}>
      {on ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}
    </View>
  );
}

function Choice({
  on,
  role,
  label,
  onPress,
  style,
  children,
}: {
  on: boolean;
  role: 'checkbox' | 'radio';
  label: string;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole={role}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={label}
    >
      {({ pressed }) => (
        <View
          style={[style, on ? { backgroundColor: c.accentSoft } : pressed ? { backgroundColor: `${c.text}0A` } : null]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

export function HealthList({ value, onChange }: { value: HealthAnswer; onChange: (h: HealthAnswer) => void }) {
  const { c } = useTheme();
  const t = useT();
  const hair = `${c.text}1F`;
  const none = Array.isArray(value) && value.length === 0;
  const unknown = value === 'unknown';
  const either = [
    { key: 'none', label: t('setup.q.none'), on: none, pick: () => onChange([]) },
    { key: 'unknown', label: t('setup.q.ratherNot'), on: unknown, pick: () => onChange('unknown') },
  ];
  return (
    <View>
      <ContourRule />
      <View style={styles.list}>
        {HEALTH.map((h, i) => {
          const on = Array.isArray(value) && value.includes(h.id);
          return (
            <Choice
              key={h.id}
              on={on}
              role="checkbox"
              label={h.label}
              onPress={() => onChange(togglePrecaution(value, h.id))}
              style={[
                styles.row,
                { borderBottomColor: hair },
                i === 0 && { borderTopWidth: HAIR, borderTopColor: hair },
              ]}
            >
              <TickBox on={on} />
              <T color={c.text} style={[styles.label, on && styles.on]}>
                {h.label}
              </T>
            </Choice>
          );
        })}
      </View>
      <View style={[styles.pair, { borderColor: hair }]}>
        {/* The journal break: a short warm rule at the start of the strip's top hairline. */}
        <View pointerEvents="none" style={[styles.accent, { backgroundColor: c.peach }]} />
        {either.map((x, i) => (
          <View key={x.key} style={[styles.half, i === 1 && { borderStartWidth: HAIR, borderStartColor: hair }]}>
            <Choice on={x.on} role="radio" label={x.label} onPress={x.pick} style={styles.halfIn}>
              <RoundMark on={x.on} />
              <T color={x.on ? c.text : c.textDim} style={[styles.small, x.on && styles.on]}>
                {x.label}
              </T>
            </Choice>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contours: { height: CH, marginHorizontal: -space.sm },
  list: { marginTop: space.sm },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 11,
    borderBottomWidth: HAIR,
  },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  round: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { flex: 1, fontSize: 17, lineHeight: 22 },
  on: { fontWeight: '600' },
  pair: { flexDirection: 'row', marginTop: space.lg, borderTopWidth: HAIR, borderBottomWidth: HAIR },
  // Very quiet: short, thin and a little softened, sitting on the strip's top hairline.
  accent: { position: 'absolute', top: -1.5, start: 0, width: 24, height: 2, borderRadius: 1, opacity: 0.75 },
  half: { flex: 1 },
  halfIn: {
    flexGrow: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    paddingHorizontal: space.sm,
    paddingVertical: 10,
  },
  small: { flex: 1, fontSize: 15.5, lineHeight: 20 },
});
