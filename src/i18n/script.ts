import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { useLanguage } from './react';
import type { LanguageCode } from './languages';

/*
 * Complex scripts with the system fonts. Line heights tuned for Latin text clip tall scripts (Urdu's Nastaliq most of
 * all; Thai, Devanagari, Bengali, Arabic and Vietnamese stack marks above and below), and letter spacing breaks
 * joined letters (Arabic, Urdu, Devanagari, Bengali) and misplaces Thai marks. Text in these languages gets more
 * line height and no extra letter spacing; font sizes stay as designed.
 */
const LINE: Partial<Record<LanguageCode, number>> = { ur: 1.5, ar: 1.2, hi: 1.2, bn: 1.2, th: 1.25, vi: 1.15 };
const NO_SPACING = new Set<LanguageCode>(['ar', 'ur', 'hi', 'bn', 'th']);

/** The overrides `style` needs in `lang`, or null when it needs none (most languages). */
export function scriptAdjust(lang: LanguageCode, style: StyleProp<TextStyle>): TextStyle | null {
  const line = LINE[lang];
  const unspaced = NO_SPACING.has(lang);
  if (!line && !unspaced) return null;
  const f = StyleSheet.flatten(style) ?? {};
  return {
    ...(line && typeof f.lineHeight === 'number' ? { lineHeight: Math.ceil(f.lineHeight * line) } : null),
    ...(unspaced && f.letterSpacing ? { letterSpacing: 0 } : null),
  };
}

/** `scriptAdjust` for the current language (re-renders when it changes). */
export function useScriptAdjust(style: StyleProp<TextStyle>): TextStyle | null {
  return scriptAdjust(useLanguage(), style);
}
