import { useEffect, useId, useState } from 'react';
import { Image, type ImageResizeMode, type ImageSourcePropType, type ImageStyle } from 'react-native';
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
 * phone (up to the gate's timeout). Keeping both costs memory instead: about 65 MB for the six panorama tiles at
 * screen resolution, and about 6 MB per card scene (SCHWUNG_LIFE_RESET_PROGRAM.md, "Performance").
 * Paintings must be opaque. `style` places the image (it needs an explicit size on the web).
 */

export function ThemedImage({
  sources,
  style,
  resizeMode,
}: {
  sources: Record<Scheme, ImageSourcePropType>;
  style: ImageStyle;
  resizeMode?: ImageResizeMode;
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
        source={sources.dark}
        resizeMode={resizeMode}
        onLoad={onLoad('dark')}
        // A broken image never holds a switch up.
        onError={onLoad('dark')}
        style={style}
      />
      <Animated.Image
        source={sources.light}
        resizeMode={resizeMode}
        onLoad={onLoad('light')}
        onError={onLoad('light')}
        style={[style, lightStyle]}
      />
    </>
  );
}
