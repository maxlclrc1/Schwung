import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, G, Image as SvgImage, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
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
 * Cheap by design: the mist is one static texture per theme (assets/world/mist-*.webp: drifting banks of fog baked
 * once, with the fade at a map's top and bottom), so a chapter not yet reached is just that image. Only the chapter
 * being walked has a mask (a luminance mask is a full-size bitmap pass on iOS): it clears the walked route as wide,
 * overlapping strokes of the trail's own path, from a clear core to a very wide, faint edge, so the clearing has no
 * boundary of its own. No runtime filters; the layer only changes when the day (or the theme) does, and is memoised.
 */

const MIST = {
  light: require('../../../assets/world/mist-light.webp'),
  dark: require('../../../assets/world/mist-dark.webp'),
};
/** The cleared band: from a narrow, fully clear core to a wide, faint outer edge (trail units). */
const BANDS = [90, 140, 190, 240, 290, 340, 390, 440];
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
      {started ? (
        <Defs>
          <Mask id={id('ahead')} maskUnits="userSpaceOnUse" x={x0} y={top} width={w} height={h}>
            <Rect x={x0} y={top} width={w} height={h} fill="#fff" />
            {BANDS.map((b) => (
              <G key={b} opacity={0.3}>
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
                  // The wider the band, the further back it ends: the front of the clearing thins out gradually.
                  strokeDasharray={[Math.max(0.1, reveal + 40 - b * 0.25), trail.length + 1000]}
                />
              </G>
            ))}
          </Mask>
        </Defs>
      ) : null}
      <G mask={started ? `url(#${id('ahead')})` : undefined}>
        <SvgImage href={dark ? MIST.dark : MIST.light} x={x0} y={top} width={w} height={h} preserveAspectRatio="none" />
      </G>
    </Svg>
  );
});

/** Revealed: clearly there, still quiet. Ahead: a hint of a shape, inside the mist. */
const SHOWN = 1;
const HIDDEN = 0.4;
/**
 * Settling each painting into the map: a soft contact shadow where it meets the ground, and a faint glaze of the
 * theme's own air over it (lavender haze by day, cool dusk by night), so it shares the map's light instead of sitting
 * on it. The glaze is the painting's own silhouette (tintColor), so edges stay crisp.
 */
const SETTLE = {
  light: { shadow: '#463F5C', shadowAlpha: 0.24, glaze: '#ECE9F6', glazeAlpha: 0.16, shown: SHOWN },
  dark: { shadow: '#000000', shadowAlpha: 0.5, glaze: '#1E1E36', glazeAlpha: 0.3, shown: 0.94 },
};

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
  const look = dark ? SETTLE.dark : SETTLE.light;
  const target = revealed ? look.shown : HIDDEN;
  // Starts where it is (no fade on every launch); a new day's discovery comes out of the mist, slowly.
  const opacity = useSharedValue(target);
  useEffect(() => {
    opacity.value = withTiming(target, { duration: 1400, reduceMotion: ReduceMotion.System });
  }, [target, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const w = d.width * scale;
  const h = w * d.aspect;
  // The shadow: a flat ellipse under the painting's base, a little into it (the art's ground is its own bottom edge).
  const sw = w * 0.9;
  const sh = Math.max(4, w * 0.17);
  const shadow = `shadow-${d.id}`;
  return (
    <Animated.View
      style={[styles.scene, { left: d.x * scale - w / 2, top: d.y * scale - h, width: w, height: h }, fade]}
    >
      <Svg width={sw} height={sh} style={{ position: 'absolute', left: (w - sw) / 2, top: h - sh * 0.7 }}>
        <Defs>
          <RadialGradient id={shadow} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={look.shadow} stopOpacity={look.shadowAlpha} />
            <Stop offset="0.55" stopColor={look.shadow} stopOpacity={look.shadowAlpha * 0.45} />
            <Stop offset="1" stopColor={look.shadow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={sw / 2} cy={sh / 2} rx={sw / 2} ry={sh / 2} fill={`url(#${shadow})`} />
      </Svg>
      <Image {...ART_IMAGE} source={DISCOVERY_ART[d.id]} style={styles.fill} contentFit="contain" accessible={false} />
      <Image
        {...ART_IMAGE}
        source={DISCOVERY_ART[d.id]}
        style={[StyleSheet.absoluteFill, { opacity: look.glazeAlpha }]}
        contentFit="contain"
        tintColor={look.glaze}
        accessible={false}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: { position: 'absolute' },
  fill: { width: '100%', height: '100%' },
});
