import type { LanguageCode } from './languages';

/*
 * CLDR cardinal plural categories for Schwung's languages, written out (Intl.PluralRules isn't available on every
 * JavaScript engine the app runs on). Integers only: Schwung pluralises counts of days, habits, people and XP.
 */

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** The categories each language's translations must provide (and may use). */
export const PLURAL_CATEGORIES: Record<LanguageCode, PluralCategory[]> = {
  en: ['one', 'other'],
  tr: ['one', 'other'],
  es: ['one', 'many', 'other'],
  fr: ['one', 'many', 'other'],
  de: ['one', 'other'],
  'pt-BR': ['one', 'many', 'other'],
  it: ['one', 'many', 'other'],
  nl: ['one', 'other'],
  ru: ['one', 'few', 'many', 'other'],
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  hi: ['one', 'other'],
  bn: ['one', 'other'],
  ur: ['one', 'other'],
  vi: ['other'],
  th: ['other'],
  id: ['other'],
  ja: ['other'],
  ko: ['other'],
  'zh-Hans': ['other'],
  'zh-Hant': ['other'],
};

/** The categories a translation must always give: 'many' in es/fr/pt/it is only for millions, so it may fall back. */
export const REQUIRED_PLURALS: Record<LanguageCode, PluralCategory[]> = Object.fromEntries(
  Object.entries(PLURAL_CATEGORIES).map(([l, cats]) => [
    l,
    ['es', 'fr', 'pt-BR', 'it'].includes(l) ? cats.filter((c) => c !== 'many') : cats,
  ]),
) as Record<LanguageCode, PluralCategory[]>;

export function pluralCategory(lang: LanguageCode, value: number): PluralCategory {
  const n = Math.abs(Math.trunc(value));
  const m10 = n % 10;
  const m100 = n % 100;
  switch (lang) {
    case 'fr':
      return n === 0 || n === 1 ? 'one' : n !== 0 && n % 1_000_000 === 0 ? 'many' : 'other';
    case 'pt-BR':
      return n === 0 || n === 1 ? 'one' : n !== 0 && n % 1_000_000 === 0 ? 'many' : 'other';
    case 'es':
    case 'it':
      return n === 1 ? 'one' : n !== 0 && n % 1_000_000 === 0 ? 'many' : 'other';
    case 'ru':
      if (m10 === 1 && m100 !== 11) return 'one';
      return m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14) ? 'few' : 'many';
    case 'ar':
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (m100 >= 3 && m100 <= 10) return 'few';
      if (m100 >= 11) return 'many';
      return 'other';
    case 'hi':
    case 'bn':
      return n === 0 || n === 1 ? 'one' : 'other';
    case 'id':
    case 'ja':
    case 'ko':
    case 'zh-Hans':
    case 'zh-Hant':
    case 'vi':
    case 'th':
      return 'other';
    default:
      return n === 1 ? 'one' : 'other';
  }
}
