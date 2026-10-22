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
