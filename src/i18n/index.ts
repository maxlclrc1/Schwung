import { FALLBACK_LANGUAGE, type LanguageCode } from './languages';
import { en } from './locales/en';
import { pluralCategory, type PluralCategory } from './plural';

/*
 * Schwung's translations: every user-facing string lives in a catalog (locales/<code>.ts), English the source. All
 * bundled, nothing fetched, nothing translated at run time. `t(key, params)` reads the current language:
 *   - `{name}` placeholders are filled from params (numbers formatted for the language);
 *   - a plural entry ({ one, few, many, other, … }) picks its form from `params.count`;
 *   - a key a language doesn't have yet falls back to English (and is reported once in development; the tests list
 *     every missing key).
 * The current language is plain module state, so the pure core (the habit engine's words) can use it too; React
 * screens follow changes through i18n/react.ts. Data the person typed (their own habits' names and notes) is never
 * passed through here: it's shown exactly as entered.
 */

export type Plural = Partial<Record<PluralCategory, string>> & { other: string };
type Leaf = string | Plural;
/** A catalog's shape, from English: every leaf a string or a plural entry. */
export type Shape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends { other: string } ? Plural : Shape<T[K]>;
};
export type Catalog = Shape<typeof en>;
type DeepPartial<T> = { [K in keyof T]?: T[K] extends Leaf ? T[K] : DeepPartial<T[K]> };
/** A translation: English's shape, possibly missing keys (reported, English shown meanwhile). */
export type Translation = DeepPartial<Catalog>;

type Key = string | number;
type Paths<T> = {
  [K in keyof T & Key]: T[K] extends string ? `${K}` : T[K] extends { other: string } ? `${K}` : `${K}.${Paths<T[K]>}`;
}[keyof T & Key];
export type TKey = Paths<Catalog>;
export type TParams = Record<string, string | number>;

// Each catalog is required only when its language is first used (Metro inlines and defers these).
/* eslint-disable @typescript-eslint/no-require-imports */
const LOADERS: Partial<Record<LanguageCode, () => Translation>> = {
  en: () => en,
  tr: () => require('./locales/tr').tr,
  es: () => require('./locales/es').es,
  fr: () => require('./locales/fr').fr,
  de: () => require('./locales/de').de,
  'pt-BR': () => require('./locales/pt-BR').ptBR,
  it: () => require('./locales/it').it,
  nl: () => require('./locales/nl').nl,
  id: () => require('./locales/id').id,
  ja: () => require('./locales/ja').ja,
  ko: () => require('./locales/ko').ko,
  'zh-Hans': () => require('./locales/zh-Hans').zhHans,
};
/* eslint-enable @typescript-eslint/no-require-imports */

let current: LanguageCode = FALLBACK_LANGUAGE;
let catalog: Translation = en;
const listeners = new Set<() => void>();
const reported = new Set<string>();

/** The language strings are shown in now. */
export const language = () => current;

/** Switches every string to `code` (a language without a catalog yet shows English). */
export function setLanguage(code: LanguageCode) {
  if (code === current) return;
  const load = LOADERS[code];
  current = load ? code : FALLBACK_LANGUAGE;
  catalog = load ? load() : en;
  listeners.forEach((f) => f());
}

export function subscribeLanguage(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** The catalog entry at a dotted key, or undefined. */
export function lookup(c: unknown, key: string): Leaf | undefined {
  let node: unknown = c;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || (node && typeof node === 'object' && 'other' in node) ? (node as Leaf) : undefined;
}

export function formatNumber(n: number, lang: LanguageCode = current): string {
  try {
    return new Intl.NumberFormat(lang).format(n);
  } catch {
    return String(n);
  }
}

/** A share (0–1) as a whole percentage, the language's way ("80 %" in French and German, "%80" in Turkish). */
export function formatPercent(share: number, lang: LanguageCode = current): string {
  try {
    return new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }).format(share);
  } catch {
    return `${Math.round(share * 100)}%`;
  }
}

/** A local date key (YYYY-MM-DD) in words: long ("4 November 2026"), short ("4 Nov") or a weekday. */
export function formatDate(key: string, style: 'long' | 'short' | 'weekday' = 'long', lang = current): string {
  const d = new Date(`${key}T12:00:00`);
  const options: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { day: 'numeric', month: 'long', year: 'numeric' }
      : style === 'short'
        ? { day: 'numeric', month: 'short' }
        : { weekday: 'long' };
  try {
    return d.toLocaleDateString(lang, options);
  } catch {
    return key;
  }
}

function fill(text: string, params?: TParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? formatNumber(v) : v;
  });
}

function resolve(leaf: Leaf, lang: LanguageCode, params?: TParams): string {
  if (typeof leaf === 'string') return fill(leaf, params);
  const n = typeof params?.count === 'number' ? params.count : 0;
  return fill(leaf[pluralCategory(lang, n)] ?? leaf.other, params);
}

/** The string for `key` in the current language, filled in. */
export function t(key: TKey, params?: TParams): string {
  const leaf = lookup(catalog, key);
  if (leaf !== undefined) return resolve(leaf, current, params);
  if (__DEV__ && current !== FALLBACK_LANGUAGE && !reported.has(`${current}:${key}`)) {
    reported.add(`${current}:${key}`);
    console.warn(`[i18n] Missing ${current} translation: ${key}`);
  }
  const english = lookup(en, key);
  return english === undefined ? key : resolve(english, FALLBACK_LANGUAGE, params);
}

/** A list in the language's own way ("A, B and C"). */
export function formatList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return t('common.list', { head: items.slice(0, -1).join(t('common.listSeparator')), last: items[items.length - 1] });
}
