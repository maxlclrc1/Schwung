import { useColorScheme } from 'react-native';
import type { TextStyle } from 'react-native';

const dark = {
  bg: '#09090A',
  surface: '#141416',
  surfaceHigh: '#1D1D20',
  border: '#27272B',
  text: '#F4F4F5',
  textDim: '#A3A3AB',
  textFaint: '#66666E',
  accent: '#C6FF3D', // fills: buttons, checks, progress
  onAccent: '#0B0F00',
  accentInk: '#C6FF3D', // accent used as text/icons on the background
  accentSoft: 'rgba(198,255,61,0.12)',
  warm: '#FFB547', // streak flame only
};

const light: typeof dark = {
  bg: '#F5F5F1',
  surface: '#FFFFFF',
  surfaceHigh: '#ECECE6',
  border: '#E2E2DB',
  text: '#0B0B0C',
  textDim: '#55555C',
  textFaint: '#8D8D94',
  accent: '#C6FF3D',
  onAccent: '#0B0F00',
  accentInk: '#3E7200',
  accentSoft: 'rgba(98,160,0,0.12)',
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
