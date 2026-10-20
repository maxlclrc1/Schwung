import { useColorScheme } from 'react-native';
import type { TextStyle } from 'react-native';

const dark = {
  bg: '#141417', // charcoal
  surface: '#1E1E23', // cards
  surfaceHigh: '#2A2A31',
  border: '#33333B',
  text: '#F3F1F8', // soft white
  textDim: '#ABA8B8',
  textFaint: '#706D7C',
  accent: '#B8A4FF', // lavender — fills: buttons, checks, progress
  onAccent: '#17122E',
  accentInk: '#B8A4FF', // accent used as text/icons on the background
  accentSoft: 'rgba(184,164,255,0.14)',
  warm: '#FFB547', // streak flame only
};

const light: typeof dark = {
  bg: '#F6F5F9', // soft off-white
  surface: '#FFFFFF',
  surfaceHigh: '#ECEAF2',
  border: '#E0DDE8',
  text: '#1B1926', // dark, readable
  textDim: '#5A5769',
  textFaint: '#8F8C9D',
  accent: '#6B4BDE', // deeper violet for contrast on light surfaces
  onAccent: '#FFFFFF',
  accentInk: '#5A3CCB',
  accentSoft: 'rgba(107,75,222,0.10)',
  warm: '#D97A00',
};

export type Colors = typeof dark;

/** Ceremonies are always dark and cinematic, regardless of system appearance. */
export const ceremonyColors = dark;

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

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  return { c: isDark ? dark : light, isDark };
}
