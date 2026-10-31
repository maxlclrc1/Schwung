import { StyleSheet } from 'react-native';
import { useTheme } from './index';

/*
 * Depth: one quiet, consistent sense of material, like pressed paper and layered stone under the painted mountains.
 * Light falls from above, so every surface has a faint highlight on its upper edge and a soft shadow below.
 *
 * Kept cheap and legible:
 * - Shadows are plain `boxShadow` (no blur layers or gradients drawn per frame) and nothing here animates, apart
 *   from the button's drop, which only fades.
 * - Text gets depth only where it is big: hero numbers and the display and title styles. Body text stays flat.
 *   Text shadows fall straight down and never change layout, so they can't clip marks above letters or complex
 *   scripts (Arabic, Urdu, Thai).
 * - Light and dark each have their own values; dark mode lifts with darker shadows and a fainter rim of light.
 */

const light = StyleSheet.create({
  /** A card or panel lifted off the world. */
  card: { boxShadow: '0 1px 2px rgba(38, 30, 80, 0.06), 0 10px 26px -10px rgba(38, 30, 80, 0.22)' },
  /** A small raised piece: chips, badges, phase tags. */
  raised: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.75), 0 1px 2px rgba(38, 30, 80, 0.12)' },
  /** A groove: progress tracks. */
  inset: { boxShadow: 'inset 0 1px 2px rgba(38, 30, 80, 0.16)' },
  /** The sheen on a filled bar. */
  sheen: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.4)' },
  /** A button's face: a lit upper edge and a slightly darker foot, like a pressed tile. */
  face: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -2px 0 rgba(20, 10, 60, 0.12)' },
  faceQuiet: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(38, 30, 80, 0.08)' },
  /** The soft shadow a primary button casts (fades as it's pressed). */
  drop: { boxShadow: '0 6px 14px -6px rgba(76, 52, 170, 0.55)' },
  /** Hero numbers: softly embossed. */
  hero: { textShadowColor: 'rgba(38, 30, 80, 0.16)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 2 },
  /** Display and title headings: barely there. */
  title: {
    textShadowColor: 'rgba(38, 30, 80, 0.10)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
  },
});

const dark = StyleSheet.create({
  card: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 12px 28px -10px rgba(0, 0, 0, 0.65)' },
  raised: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 1px 2px rgba(0, 0, 0, 0.45)' },
  inset: { boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.5)' },
  sheen: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.25)' },
  face: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -2px 0 rgba(0, 0, 0, 0.25)' },
  faceQuiet: { boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.07), inset 0 -1px 0 rgba(0, 0, 0, 0.3)' },
  drop: { boxShadow: '0 6px 16px -6px rgba(0, 0, 0, 0.7)' },
  hero: { textShadowColor: 'rgba(0, 0, 0, 0.55)', textShadowOffset: { width: 0, height: 1.5 }, textShadowRadius: 3 },
  title: { textShadowColor: 'rgba(0, 0, 0, 0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});

export type Depth = typeof light;

/** The depth treatments for the theme on screen. */
export function useDepth(): Depth {
  return useTheme().isDark ? dark : light;
}
