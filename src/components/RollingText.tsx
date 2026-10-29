import { StyleSheet, View, type TextStyle } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';

const ROLL_IN = FadeInDown.duration(220)
  .easing(Easing.bezier(0.22, 1, 0.36, 1))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
  .reduceMotion(ReduceMotion.System);
const ROLL_OUT = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

/**
 * Text whose characters each roll softly into place when they change (a digit slides up a few points as the old
 * one leaves), so a changing number reads as one moving thing: the age being dialled, XP as it's earned.
 * Fixed-width slots: nothing around it shifts.
 */
export function RollingText({
  text,
  size,
  color,
  charWidth,
  weight = '800',
}: {
  text: string;
  size: number;
  color: string;
  /** The width of one character slot (narrow characters such as ":" take half). */
  charWidth: number;
  weight?: TextStyle['fontWeight'];
}) {
  return (
    <View style={styles.rolling} accessible accessibilityLabel={text}>
      {text.split('').map((ch, i) => {
        const narrow = ch === ':' || ch === '–' || ch === '+' || ch === ' ';
        const w = narrow ? charWidth * 0.5 : charWidth;
        return (
          <View key={i} style={{ width: w, height: size * 1.12, overflow: 'hidden' }}>
            <Animated.Text
              key={ch}
              entering={ROLL_IN}
              exiting={ROLL_OUT}
              allowFontScaling={false}
              style={[
                styles.rollChar,
                { fontSize: size, lineHeight: size * 1.12, color, width: w, fontWeight: weight },
                size >= 30 && styles.tight,
              ]}
            >
              {ch}
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rolling: { flexDirection: 'row', justifyContent: 'center' },
  rollChar: { position: 'absolute', left: 0, top: 0, textAlign: 'center', fontVariant: ['tabular-nums'] },
  tight: { letterSpacing: -1 },
});
