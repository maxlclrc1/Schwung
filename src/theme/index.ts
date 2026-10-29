import { Appearance, useColorScheme } from 'react-native';
import type { TextStyle } from 'react-native';
import type { ThemePreference } from '../core/types';
import { usePreferences } from '../store/preferences';
import { useThemeGate } from './gate';

/*
 * Two intentional palettes, not an inversion of each other: dark leans on a deep violet-black with a
 * luminous lavender accent; light uses a soft violet-white with a deeper, higher-contrast violet.
 * All text pairs meet WCAG AA (4.5:1) on their backgrounds.
 */
const dark = {
  bg: '#111116',
  surface: '#1C1B25', // cards
  surfaceHigh: '#272533', // pressed/selected surfaces, tracks
  border: '#302E3D',
  text: '#F5F3FF',
  textDim: '#A5A3B5', // secondary text
  textFaint: '#75728A', // hints and metadata
  accent: '#A78BFA', // fills: buttons, checks, progress
  onAccent: '#16112B', // text and icons on accent fills
  accentInk: '#A78BFA', // accent used as text/icons on the background
  accentSoft: 'rgba(167,139,250,0.14)', // tinted surfaces
  accentLight: '#DDD3FE', // highlights in celebrations
  gold: '#F2B84B', // milestones only (ceremonies, finale): never an everyday accent
  danger: '#FF7A7A', // destructive actions
};

const light: typeof dark = {
  bg: '#F7F6FB',
  surface: '#FFFFFF',
  surfaceHigh: '#EEECF5',
  border: '#E3E0EC',
  text: '#191621',
  textDim: '#696575',
  textFaint: '#76728A',
  accent: '#7451C8',
  onAccent: '#FEFEFF', // not pure white: must differ from surface so theme fades map colors unambiguously
  accentInk: '#7451C8',
  accentSoft: 'rgba(116,81,200,0.10)',
  accentLight: '#C9B8F5',
  gold: '#A76A00',
  danger: '#C93B3B',
};

export type Colors = typeof dark;

/** Both palettes, for blending during theme transitions (see ./transition). */
export const palettes = { dark, light } as const;
export type { ThemePreference };
export type Scheme = 'light' | 'dark';

/** An explicit choice wins; "system" follows the phone. Unknown system values count as dark. */
export function resolveScheme(preference: ThemePreference, system: string | null | undefined): Scheme {
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const motion = { fast: 150, base: 200, slow: 250 } as const;

export const type = {
  display: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

const themeFor = (scheme: Scheme) => ({ c: scheme === 'dark' ? dark : light, isDark: scheme === 'dark', scheme });

/** The theme asked for: the preference, or the phone's under "System". */
export function useThemeTarget(): Scheme {
  const system = useColorScheme();
  const preference = usePreferences((st) => st.themePreference);
  return resolveScheme(preference, system);
}

/** The saved choice (System, Light or Dark), for the controls that show it. */
export function useThemePreference(): ThemePreference {
  return usePreferences((st) => st.themePreference);
}

/**
 * The theme on screen, which follows the one asked for once its paintings are ready (./gate). Only the gate is
 * watched here, so asking for a theme re-renders nothing until the switch itself.
 */
export function useTheme() {
  const shown = useThemeGate((g) => g.shown);
  // Before the first request (the very first render): the theme asked for.
  return themeFor(shown ?? resolveScheme(usePreferences.getState().themePreference, Appearance.getColorScheme()));
}
