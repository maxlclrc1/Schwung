import { Colors, palettes } from './index';

/** Pure helpers for theme fades (no Reanimated here, so they're unit-testable). */

export const THEME_FADE_MS = 220;

/** The palette token a color belongs to in the given palette, or null if it isn't a palette color. */
export function findToken(palette: Colors, color: unknown): keyof Colors | null {
  if (typeof color !== 'string') return null;
  const key = (Object.keys(palette) as (keyof Colors)[]).find((k) => palette[k] === color);
  return key ?? null;
}

export const COLOR_PROPS = ['backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'color'] as const;
export type ColorProp = (typeof COLOR_PROPS)[number];

/**
 * The [prop, dark, light] pairs to animate for a style, for every color in it that is a palette
 * token of the current theme. Anything else (rgba overlays, ceremony colors) stays static.
 */
/**
 * Every color an animated style must write for `style`: palette tokens fade between their dark and light values;
 * any other color (e.g. 'transparent') is written as it is. An animated style keeps the last value it wrote for a
 * prop until it writes a new one, so a color that changes from a token to a non-token (an option losing its
 * selected border) must still be written, or the old color would stay on screen.
 */
export function animatedColors(
  style: Partial<Record<ColorProp, unknown>>,
  current: Colors,
): { fades: [ColorProp, string, string][]; fixed: [ColorProp, string][] } {
  const fades = themedPairs(style, current);
  const fixed: [ColorProp, string][] = [];
  for (const prop of COLOR_PROPS) {
    const v = style[prop];
    if (typeof v === 'string' && !fades.some(([p]) => p === prop)) fixed.push([prop, v]);
  }
  return { fades, fixed };
}

export function themedPairs(
  style: Partial<Record<ColorProp, unknown>>,
  current: Colors,
): [ColorProp, string, string][] {
  const out: [ColorProp, string, string][] = [];
  for (const prop of COLOR_PROPS) {
    const token = findToken(current, style[prop]);
    if (token) out.push([prop, palettes.dark[token], palettes.light[token]]);
  }
  return out;
}
