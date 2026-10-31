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
  | 'bn'
  | 'ur'
  | 'ru'
  | 'vi'
  | 'ar'
  | 'th'
  | 'hi'
  | 'id'
  | 'ja'
  | 'ko'
  | 'zh-Hans'
  | 'zh-Hant';

export type Language = {
  code: LanguageCode;
  native: string;
  rtl: boolean;
  ready: boolean;
  /** "Choose your language", in the language itself (the first-launch screen shows them all at once). */
  choose: string;
};

export const LANGUAGES: Language[] = [
  { code: 'en', native: 'English', rtl: false, ready: true, choose: 'Choose your language' },
  { code: 'tr', native: 'Türkçe', rtl: false, ready: true, choose: 'Dilini seç' },
  { code: 'es', native: 'Español', rtl: false, ready: true, choose: 'Elige tu idioma' },
  { code: 'fr', native: 'Français', rtl: false, ready: true, choose: 'Choisissez votre langue' },
  { code: 'de', native: 'Deutsch', rtl: false, ready: true, choose: 'Wähle deine Sprache' },
  { code: 'pt-BR', native: 'Português (Brasil)', rtl: false, ready: true, choose: 'Escolha seu idioma' },
  { code: 'it', native: 'Italiano', rtl: false, ready: true, choose: 'Scegli la tua lingua' },
  { code: 'nl', native: 'Nederlands', rtl: false, ready: true, choose: 'Kies je taal' },
  { code: 'ru', native: 'Русский', rtl: false, ready: true, choose: 'Выбери язык' },
  { code: 'ar', native: 'العربية', rtl: true, ready: true, choose: 'اختر لغتك' },
  { code: 'hi', native: 'हिन्दी', rtl: false, ready: true, choose: 'अपनी भाषा चुनें' },
  { code: 'bn', native: 'বাংলা', rtl: false, ready: true, choose: 'আপনার ভাষা বেছে নিন' },
  { code: 'ur', native: 'اردو', rtl: true, ready: true, choose: 'اپنی زبان منتخب کریں' },
  { code: 'id', native: 'Bahasa Indonesia', rtl: false, ready: true, choose: 'Pilih bahasamu' },
  { code: 'ja', native: '日本語', rtl: false, ready: true, choose: '言語を選んでください' },
  { code: 'ko', native: '한국어', rtl: false, ready: true, choose: '언어를 선택하세요' },
  { code: 'zh-Hans', native: '简体中文', rtl: false, ready: true, choose: '选择你的语言' },
  { code: 'zh-Hant', native: '繁體中文', rtl: false, ready: true, choose: '選擇你的語言' },
  { code: 'vi', native: 'Tiếng Việt', rtl: false, ready: true, choose: 'Chọn ngôn ngữ của bạn' },
  { code: 'th', native: 'ไทย', rtl: false, ready: true, choose: 'เลือกภาษาของคุณ' },
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
  if (lang === 'zh' && parts.slice(1).some((p) => /^(hant|tw|hk|mo)$/i.test(p)))
    return byCode.get('zh-hant')?.ready ? 'zh-Hant' : null;
  const sameLanguage = READY_LANGUAGES.find((l) => l.code.toLowerCase().split('-')[0] === lang);
  return sameLanguage?.code ?? null;
}

export const isLanguageCode = (x: unknown): x is LanguageCode =>
  typeof x === 'string' && LANGUAGES.some((l) => l.code === x);
