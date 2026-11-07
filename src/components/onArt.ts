import type { TextStyle } from 'react-native';
import { useTheme } from '../theme';

/*
 * Small text that sits straight on a painting (a section label, a phase, a day range). In light mode the misty
 * mid-tones of the paintings (trees, rocks) are close to the dim text greys, so these labels take the main text ink
 * and a soft halo of the page's own light around the letters: readable everywhere, with no panel or darker veil
 * over the art. Dark mode keeps its colours exactly as they were (`ink` is undefined there: use the usual colour).
 */
const HALO: TextStyle = {
  textShadowColor: 'rgba(247, 246, 251, 0.95)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 6,
};

export function useOnArt(): { style: TextStyle | undefined; ink: string | undefined; pill: string | undefined } {
  const { c, isDark } = useTheme();
  if (isDark) return { style: undefined, ink: undefined, pill: undefined };
  // `pill`: a tinted label's background made solid, as it looks on the plain page (indigoSoft over the page).
  return { style: HALO, ink: c.text, pill: '#E9E8F2' };
}
