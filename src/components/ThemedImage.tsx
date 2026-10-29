import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useId, useState } from 'react';
import type { ImageRequireSource, ImageStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Scheme } from '../theme';
import { forgetPainting, reportLoaded } from '../theme/gate';
import { useThemeProgress } from '../theme/transition';

/*
 * A painting with a light and a dark version (the world tiles, the habit cards' scenes) that switches theme without
 * a gap or a wait. Both versions stay mounted, so both are loaded and decoded once (when the painting first
 * appears) and a theme switch never has to load or decode anything: the light version sits on top and fades with
 * the theme while the dark one stays opaque beneath, so mid-fade the two blend into each other, never into the
 * background.
 *
 * Why both: holding only the theme on screen meant every switch first loaded and decoded the other version of the
 * large panorama tiles (and each card's scene) before the fade could start, which is the delay people felt on a
 * phone (up to the gate's timeout).
 *
 * Drawn with expo-image (ART_IMAGE): each painting is decoded once into a shared memory cache and every view of it
 * (the six tiles behind the tabs, each card cropping a tile, a revisited screen) draws that same bitmap, at full
 * resolution, without decoding or resizing again. React Native's Image never caches a decoded image this large, so
 * it decoded each one again on every mount, which is the wait people saw (about two seconds in development, where
 * each mount also fetched the file from the dev server).
 * Paintings must be opaque. `style` places the image (it needs an explicit size on the web).
 */

/** How the app's bundled artwork is drawn: cached decoded, full resolution, shown the moment it's ready (no fade). */
export const ART_IMAGE = {
  cachePolicy: 'memory-disk',
  allowDownscaling: false,
  // No fade-in at all, so a cached painting is simply there and a first load never replays one
  // (transition.skipOnCacheHit only matters when there is a transition).
  transition: null,
} as const;

export function ThemedImage({
  sources,
  style,
  contentFit = 'cover',
}: {
  sources: Record<Scheme, ImageRequireSource>;
  style: ImageStyle;
  contentFit?: ImageContentFit;
}) {
  const progress = useThemeProgress();
  const [loaded, setLoaded] = useState<Scheme[]>([]);
  const onLoad = (t: Scheme) => () => setLoaded((l) => (l.includes(t) ? l : [...l, t]));

  // The theme gate still waits (briefly) for a painting that hasn't loaded yet, e.g. a card that just appeared.
  const key = useId();
  const report = loaded.join(',');
  useEffect(() => {
    reportLoaded(key, report ? (report.split(',') as Scheme[]) : []);
  }, [key, report]);
  useEffect(() => () => forgetPainting(key), [key]);

  // The light version fades with the theme, unless the dark one beneath hasn't loaded yet: then it stays.
  const darkPainted = loaded.includes('dark');
  const lightStyle = useAnimatedStyle(() => ({ opacity: darkPainted ? progress.get() : 1 }));

  return (
    <>
      <Image
        {...ART_IMAGE}
        source={sources.dark}
        contentFit={contentFit}
        priority="high"
        onLoad={onLoad('dark')}
        // A broken image never holds a switch up.
        onError={onLoad('dark')}
        style={style}
        accessible={false}
      />
      {/* The fade sits on a wrapper placed exactly like the image. */}
      <Animated.View pointerEvents="none" style={[style, lightStyle]}>
        <Image
          {...ART_IMAGE}
          source={sources.light}
          contentFit={contentFit}
          priority="high"
          onLoad={onLoad('light')}
          onError={onLoad('light')}
          style={styles.fill}
          accessible={false}
        />
      </Animated.View>
    </>
  );
}

const styles = { fill: { width: '100%', height: '100%' } } as const;
