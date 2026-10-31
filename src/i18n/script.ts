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
/**
 * Languages whose capitals carry marks above (Turkish İ, German Ä, French É, Russian Й…). A line height tighter than
 * this (the display and title styles) leaves those marks above the line box, where iOS clips them; such styles get
 * at least this much. Looser styles are untouched.
 */
const ACCENT_MIN = 1.2;
const ACCENTED_CAPITALS = new Set<LanguageCode>(['tr', 'de', 'fr', 'es', 'pt-BR', 'it', 'nl', 'ru', 'vi']);

/** The overrides `style` needs in `lang`, or null when it needs none (most languages). */
export function scriptAdjust(lang: LanguageCode, style: StyleProp<TextStyle>): TextStyle | null {
  const line = LINE[lang];
  const unspaced = NO_SPACING.has(lang);
  const accents = ACCENTED_CAPITALS.has(lang);
  if (!line && !unspaced && !accents) return null;
  const f = StyleSheet.flatten(style) ?? {};
  let lineHeight = typeof f.lineHeight === 'number' ? f.lineHeight : undefined;
  if (lineHeight !== undefined && line) lineHeight = Math.ceil(lineHeight * line);
  if (lineHeight !== undefined && accents && typeof f.fontSize === 'number')
    lineHeight = Math.max(lineHeight, Math.ceil(f.fontSize * ACCENT_MIN));
  const out: TextStyle = {
    ...(lineHeight !== undefined && lineHeight !== f.lineHeight ? { lineHeight } : null),
    ...(unspaced && f.letterSpacing ? { letterSpacing: 0 } : null),
  };
  return Object.keys(out).length ? out : null;
}

/** `scriptAdjust` for the current language (re-renders when it changes). */
export function useScriptAdjust(style: StyleProp<TextStyle>): TextStyle | null {
  return scriptAdjust(useLanguage(), style);
}
