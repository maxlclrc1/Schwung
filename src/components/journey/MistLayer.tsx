import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, G, Image as SvgImage, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';
import type { Trail } from '../../core/expeditionTrail';
import { DISCOVERIES, discoveryRevealed, type Discovery } from '../../core/journeyDiscoveries';
import { space } from '../../theme';
import { ART_IMAGE } from '../ThemedImage';
import { DISCOVERY_ART } from './discoveryArt';

/*
 * Journey's atmosphere (ChapterTrail): mist over the terrain still ahead, and the weekly discoveries beside the trail.
 * Both sit between the contour map and the trail, so the trail, its markers, numbers and touch targets are always on
 * top, whatever the mist. Everything follows the calendar (the program's day), never completed habits: a missed day
 * never brings mist back.
 *
 * Cheap by design: the mist is one static texture (assets/world/mist-*.webp, fractal noise baked once), shown through
 * one luminance mask. The mask clears the walked route as a few wide, overlapping strokes of the trail's own path, so
 * the clear ground has a broad, soft edge, broken up further by the texture's own density. No runtime filters; the
 * layer only changes when the day (or the theme) does, and is memoised on that.
 */

const MIST = {
  light: require('../../../assets/world/mist-light.webp'),
  dark: require('../../../assets/world/mist-dark.webp'),
};
/** The cleared band: from a narrow, fully clear core to a wide, faint outer edge (trail units). */
const BANDS = [80, 112, 144, 176, 208, 240, 272];
/** How far beyond today's marker the ground is already clear (today's own stretch is never misty). */
const AHEAD = 46;

export const MistLayer = memo(function MistLayer({
  trail,
  n,
  today,
  dark,
  scale,
  width,
  overTop,
  overBottom,
}: {
  trail: Trail;
  /** The chapter's number, for ids (on the web every chapter shares one document). */
  n: number;
  today: number;
  dark: boolean;
  scale: number;
  /** The map's width on screen (as the contour layer). */
  width: number;
  overTop: number;
  overBottom: number;
}) {
  // A chapter left behind is clear.
  if (today >= trail.last) return null;
  const x0 = -space.lg / scale;
  const w = width / scale;
  const top = -overTop;
  const h = trail.h + overTop + overBottom;
  const id = (k: string) => `${k}${n}`;
  const started = today >= trail.first;
  const reveal = started ? trail.days[today - trail.first].at + AHEAD : 0;
  const start = trail.days[0];
  return (
    <Svg
      width={width}
      height={h * scale}
      viewBox={`${x0} ${top} ${w} ${h}`}
      style={{ position: 'absolute', left: -space.lg, top: top * scale }}
      pointerEvents="none"
    >
      <Defs>
        {/* Only over the chapter's own map: it fades out just past the trail's ends, never over its heading or the
            day's entry under it. */}
        <LinearGradient id={id('mistEdges')} x1="0" y1={top} x2="0" y2={top + h} gradientUnits="userSpaceOnUse">
          <Stop offset={(overTop - 30) / h} stopColor="#fff" stopOpacity={0} />
          <Stop offset={(overTop + 40) / h} stopColor="#fff" stopOpacity={1} />
          <Stop offset={(overTop + trail.h - 50) / h} stopColor="#fff" stopOpacity={1} />
          <Stop offset={(overTop + trail.h + 20) / h} stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id={id('ahead')} maskUnits="userSpaceOnUse" x={x0} y={top} width={w} height={h}>
          <Rect x={x0} y={top} width={w} height={h} fill={`url(#${id('mistEdges')})`} />
          {started
            ? BANDS.map((b) => (
                <G key={b} opacity={0.36}>
                  {/* Where the chapter begins, the ground above its first day is open too. */}
                  <Path
                    d={`M${start.x} ${start.y} L${start.x} ${top}`}
                    stroke="#000"
                    strokeWidth={b}
                    strokeLinecap="round"
                  />
                  <Path
                    d={trail.path}
                    fill="none"
                    stroke="#000"
                    strokeWidth={b}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    // Each band ends a little before the last, so the front of the clearing is soft as well.
                    strokeDasharray={[Math.max(0.1, reveal + 40 - b / 2), trail.length + 1000]}
                  />
                </G>
              ))
            : null}
        </Mask>
      </Defs>
      <G mask={`url(#${id('ahead')})`}>
        <SvgImage href={dark ? MIST.dark : MIST.light} x={x0} y={top} width={w} height={h} preserveAspectRatio="none" />
      </G>
    </Svg>
  );
});

/** Revealed: clearly there, still quiet. Ahead: barely there, inside the mist. */
const SHOWN = 1;
const HIDDEN = 0.32;

/** The chapter's weekly discoveries, under the mist (so an unrevealed one is only a hint of a shape). */
export const Discoveries = memo(function Discoveries({
  n,
  today,
  dark,
  scale,
}: {
  n: number;
  today: number;
  dark: boolean;
  scale: number;
}) {
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {DISCOVERIES.filter((d) => d.chapter === n).map((d) => (
        <Scene key={d.id} d={d} revealed={discoveryRevealed(d, today)} dark={dark} scale={scale} />
      ))}
    </View>
  );
});

function Scene({ d, revealed, dark, scale }: { d: Discovery; revealed: boolean; dark: boolean; scale: number }) {
  const target = revealed ? (dark ? 0.9 : SHOWN) : HIDDEN;
  // Starts where it is (no fade on every launch); a new day's discovery comes out of the mist, slowly.
  const opacity = useSharedValue(target);
  useEffect(() => {
    opacity.value = withTiming(target, { duration: 1400, reduceMotion: ReduceMotion.System });
  }, [target, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const w = d.width * scale;
  const h = w * d.aspect;
  return (
    <Animated.View
      style={[styles.scene, { left: d.x * scale - w / 2, top: d.y * scale - h, width: w, height: h }, fade]}
    >
      <Image {...ART_IMAGE} source={DISCOVERY_ART[d.id]} style={styles.fill} contentFit="contain" accessible={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
});
