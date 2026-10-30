/*
 * Schwung's languages: the 20 it's planned for, each named in its own language (the language picker never
 * translates a language's name), with its direction. `ready` languages ship a complete catalog (locales/); the rest
 * arrive in later phases (docs/LOCALIZATION.md). Codes are BCP-47 tags, also used for dates and numbers.
 */

export type LanguageCode =
  | 'en'
  | 'tr'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt-BR'
  | 'it'
  | 'nl'
  | 'pl'
  | 'sv'
  | 'ru'
  | 'uk'
  | 'ar'
  | 'he'
  | 'hi'
  | 'id'
  | 'ja'
  | 'ko'
  | 'zh-Hans'
  | 'zh-Hant';

export type Language = { code: LanguageCode; native: string; rtl: boolean; ready: boolean };

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', rtl: false, ready: true },
  { code: 'tr', native: 'Türkçe', rtl: false, ready: true },
  { code: 'es', native: 'Español', rtl: false, ready: true },
  { code: 'fr', native: 'Français', rtl: false, ready: true },
  { code: 'de', native: 'Deutsch', rtl: false, ready: true },
  { code: 'pt-BR', native: 'Português (Brasil)', rtl: false, ready: true },
  { code: 'it', native: 'Italiano', rtl: false, ready: true },
  { code: 'nl', native: 'Nederlands', rtl: false, ready: true },
  { code: 'pl', native: 'Polski', rtl: false, ready: false },
  { code: 'sv', native: 'Svenska', rtl: false, ready: false },
  { code: 'ru', native: 'Русский', rtl: false, ready: false },
  { code: 'uk', native: 'Українська', rtl: false, ready: false },
  { code: 'ar', native: 'العربية', rtl: true, ready: false },
  { code: 'he', native: 'עברית', rtl: true, ready: false },
  { code: 'hi', native: 'हिन्दी', rtl: false, ready: false },
  { code: 'id', native: 'Bahasa Indonesia', rtl: false, ready: true },
  { code: 'ja', native: '日本語', rtl: false, ready: true },
  { code: 'ko', native: '한국어', rtl: false, ready: true },
  { code: 'zh-Hans', native: '简体中文', rtl: false, ready: true },
  { code: 'zh-Hant', native: '繁體中文', rtl: false, ready: false },
];

export const READY_LANGUAGES = LANGUAGES.filter((l) => l.ready);
export const FALLBACK_LANGUAGE: LanguageCode = 'en';

const byCode = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));

/**
 * The ready language for a device locale (a BCP-47 tag such as "pt-BR", "de-AT" or "zh-Hant-TW"), or null: an exact
 * match first, then the script, then the language alone ("pt-PT" → Português (Brasil) while it's the only
 * Portuguese, "es-MX" → Español).
 */
export function matchLanguage(tag: string | null | undefined): LanguageCode | null {
  if (!tag) return null;
  const parts = tag.replace('_', '-').split('-');
  const lang = parts[0].toLowerCase() === 'in' ? 'id' : parts[0].toLowerCase(); // older Android reports Indonesian as "in"
  const candidates = [tag.toLowerCase(), parts.length > 1 ? `${lang}-${parts[1].toLowerCase()}` : '', lang];
  for (const c of candidates) {
    const l = c ? byCode.get(c) : undefined;
    if (l?.ready) return l.code;
  }
  // Traditional Chinese (Hant, or Taiwan / Hong Kong / Macau) never falls back to Simplified.
  if (lang === 'zh' && parts.slice(1).some((p) => /^(hant|tw|hk|mo)$/i.test(p))) return null;
  const sameLanguage = READY_LANGUAGES.find((l) => l.code.toLowerCase().split('-')[0] === lang);
  return sameLanguage?.code ?? null;
}

export const isLanguageCode = (x: unknown): x is LanguageCode =>
  typeof x === 'string' && LANGUAGES.some((l) => l.code === x);
