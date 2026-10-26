import { useEffect, useId, useState } from 'react';
import { Image, type ImageResizeMode, type ImageSourcePropType, type ImageStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { type Scheme, useTheme } from '../theme';
import { THEME_FADE_MS } from '../theme/fade';
import { forgetPainting, reportLoaded, useThemeGate } from '../theme/gate';
import { useThemeProgress } from '../theme/transition';

/*
 * A painting with a light and a dark version (the world tiles, the habit cards' scenes) that switches theme without
 * a gap. Only the theme on screen is held, except around a switch:
 * - when a new theme is asked for, its version loads hidden under or over the current one, and the switch waits for
 *   it (../theme/gate), so it's decoded before anything fades;
 * - the light version sits on top and fades with the theme while the dark one stays opaque beneath, so mid-fade
 *   the two blend into each other, never into the background;
 * - the outgoing version is dropped once the fade has finished.
 * Paintings must be opaque. `style` places the image (it needs an explicit size on the web).
 */

const SCHEMES: Scheme[] = ['dark', 'light'];

export function ThemedImage({
  sources,
  style,
  resizeMode,
}: {
  sources: Record<Scheme, ImageSourcePropType>;
  style: ImageStyle;
  resizeMode?: ImageResizeMode;
}) {
  const { scheme: shown } = useTheme();
  const target = useThemeGate((g) => g.target) ?? shown;
  const progress = useThemeProgress();

  // The theme shown before the last switch, kept until its fade has finished and the new one has loaded (a switch
  // that timed out waiting for it shows the old painting meanwhile, never the background).
  const [previous, setPrevious] = useState<Scheme | null>(null);
  const [last, setLast] = useState(shown);
  // Read in this same render too (the state updates below land only on the next one), so what's mounted never
  // briefly leaves out the outgoing theme, which would forget that it had loaded.
  const lingering = last !== shown ? last : previous;
  if (last !== shown) {
    setLast(shown);
    setPrevious(last);
  }
  // Which mounted versions have loaded; a version that unmounts must load again when it comes back.
  const [loaded, setLoaded] = useState<Scheme[]>([]);
  const shownLoaded = loaded.includes(shown);
  useEffect(() => {
    if (!previous || !shownLoaded) return;
    const t = setTimeout(() => setPrevious(null), THEME_FADE_MS + 100);
    return () => clearTimeout(t);
  }, [previous, shownLoaded]);
  const mounted = SCHEMES.filter((t) => t === shown || t === target || t === lingering);
  if (loaded.some((t) => !mounted.includes(t))) setLoaded(loaded.filter((t) => mounted.includes(t)));
  const onLoad = (t: Scheme) => () => setLoaded((l) => (l.includes(t) ? l : [...l, t]));

  const key = useId();
  const report = loaded.join(',');
  useEffect(() => {
    reportLoaded(key, report ? (report.split(',') as Scheme[]) : []);
  }, [key, report]);
  useEffect(() => () => forgetPainting(key), [key]);

  // The light version fades with the theme, unless the dark one beneath hasn't loaded yet: then it stays.
  const darkPainted = loaded.includes('dark') || !mounted.includes('dark');
  const lightStyle = useAnimatedStyle(() => ({ opacity: darkPainted ? progress.get() : 1 }));

  return mounted.map((t) =>
    t === 'light' ? (
      <Animated.Image
        key={t}
        source={sources.light}
        resizeMode={resizeMode}
        onLoad={onLoad(t)}
        // A broken image never holds a switch up.
        onError={onLoad(t)}
        style={[style, lightStyle]}
      />
    ) : (
      <Image
        key={t}
        source={sources.dark}
        resizeMode={resizeMode}
        onLoad={onLoad(t)}
        onError={onLoad(t)}
        style={style}
      />
    ),
  );
}
