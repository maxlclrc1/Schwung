import { afterEach, describe, expect, it } from '@jest/globals';
import * as P from '../../core/reset/pilot';
import { RESET_HABITS, SOCIAL_ACTIONS } from '../../core/reset/habits';
import { formatNumber, formatPercent, language, lookup, setLanguage, t, type Translation } from '../index';
import { LANGUAGES, matchLanguage, READY_LANGUAGES, type LanguageCode } from '../languages';
import { en } from '../locales/en';
import { PLURAL_CATEGORIES, pluralCategory, REQUIRED_PLURALS } from '../plural';

/*
 * The localization checks: every Phase 1 language complete (every missing key listed by name), no stray keys,
 * placeholders identical to English, plural forms valid for each language, and English in step with the habit
 * catalog's own data.
 */

const CATALOGS: Record<string, Translation> = {
  /* eslint-disable @typescript-eslint/no-require-imports */
  tr: require('../locales/tr').tr,
  es: require('../locales/es').es,
  fr: require('../locales/fr').fr,
  de: require('../locales/de').de,
  'pt-BR': require('../locales/pt-BR').ptBR,
  it: require('../locales/it').it,
  nl: require('../locales/nl').nl,
  id: require('../locales/id').id,
  ja: require('../locales/ja').ja,
  ko: require('../locales/ko').ko,
  'zh-Hans': require('../locales/zh-Hans').zhHans,
  hi: require('../locales/hi').hi,
  bn: require('../locales/bn').bn,
  ur: require('../locales/ur').ur,
  ar: require('../locales/ar').ar,
  ru: require('../locales/ru').ru,
  vi: require('../locales/vi').vi,
  'zh-Hant': require('../locales/zh-Hant').zhHant,
  th: require('../locales/th').th,
  /* eslint-enable @typescript-eslint/no-require-imports */
};

type Leaf = string | Record<string, string>;
const isPlural = (x: unknown): x is Record<string, string> =>
  !!x && typeof x === 'object' && 'other' in (x as object) && typeof (x as { other: unknown }).other === 'string';

function flatten(o: unknown, prefix = '', out: Record<string, Leaf> = {}): Record<string, Leaf> {
  if (typeof o === 'string' || isPlural(o)) out[prefix] = o as Leaf;
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const placeholders = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const union = (leaf: Leaf) =>
  typeof leaf === 'string' ? placeholders(leaf) : new Set(Object.values(leaf).flatMap((s) => [...placeholders(s)]));
const sorted = (s: Set<string>) => [...s].sort();

const EN = flatten(en);

afterEach(() => setLanguage('en'));

describe('the catalogs', () => {
  it('English has no ambiguous entries (an object with an "other" key is always a plural)', () => {
    for (const [key, leaf] of Object.entries(EN))
      if (typeof leaf !== 'string')
        expect({
          key,
          extra: Object.keys(leaf).filter((k) => !['zero', 'one', 'two', 'few', 'many', 'other'].includes(k)),
        }).toEqual({
          key,
          extra: [],
        });
  });

  for (const lang of READY_LANGUAGES.filter((l) => l.code !== 'en')) {
    describe(lang.native, () => {
      const T = flatten(CATALOGS[lang.code]);

      it('has every English key (missing keys listed)', () => {
        expect(Object.keys(EN).filter((k) => !(k in T))).toEqual([]);
      });

      it('has no keys English doesn’t', () => {
        expect(Object.keys(T).filter((k) => !(k in EN))).toEqual([]);
      });

      it('keeps every placeholder exactly', () => {
        const wrong: string[] = [];
        for (const [key, leaf] of Object.entries(T)) {
          const source = EN[key];
          if (source === undefined) continue;
          if (typeof source === 'string') {
            if (typeof leaf !== 'string' || sorted(placeholders(leaf)).join() !== sorted(placeholders(source)).join())
              wrong.push(key);
          } else {
            if (typeof leaf === 'string') {
              wrong.push(key);
              continue;
            }
            // Every form uses only English's placeholders; together they use all of them ({count} may be implied).
            const allowed = union(source);
            const used = union(leaf);
            const needed = [...allowed].filter((p) => p !== 'count');
            if ([...used].some((p) => !allowed.has(p)) || needed.some((p) => !used.has(p))) wrong.push(key);
          }
        }
        expect(wrong).toEqual([]);
      });

      it('gives plural forms the language needs, and only those', () => {
        const wrong: string[] = [];
        for (const [key, leaf] of Object.entries(T)) {
          if (typeof leaf === 'string') continue;
          const have = Object.keys(leaf);
          if (have.some((c) => !PLURAL_CATEGORIES[lang.code].includes(c as never))) wrong.push(`${key}: extra`);
          if (REQUIRED_PLURALS[lang.code].some((c) => !have.includes(c))) wrong.push(`${key}: missing form`);
        }
        expect(wrong).toEqual([]);
      });

      it('never leaves a string empty', () => {
        expect(Object.entries(T).filter(([, v]) => (typeof v === 'string' ? !v.trim() : !v.other.trim()))).toEqual([]);
      });
    });
  }

  it('has no English change waiting for translation (npm run i18n:status)', () => {
    const state = require('../../../scripts/i18n/state.json') as { en: Record<string, Leaf>; stale?: object };
    const canon = (l: Leaf) => (typeof l === 'string' ? l : JSON.stringify(Object.entries(l).sort()));
    const changed = Object.keys({ ...EN, ...state.en }).filter(
      (k) => !(k in EN) || !(k in state.en) || canon(EN[k]) !== canon(state.en[k]),
    );
    expect(changed).toEqual([]);
    expect(state.stale ?? {}).toEqual({});
  });

  it('English matches the habit catalog’s own words', () => {
    for (const h of RESET_HABITS) {
      expect(P.habitName(h.id)).toBe(h.name);
      expect(P.habitDescription(h.id)).toBe(h.description);
    }
    for (const a of SOCIAL_ACTIONS) expect(P.socialText(a)).toBe(a.text);
    const adult: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 120 };
    for (const h of RESET_HABITS)
      if (h.id !== 'strength_log') expect(P.habitNotes(h.id as P.PilotHabitId, adult)).toEqual(h.notes);
  });
});

describe('switching language', () => {
  it('changes the words and keeps what the person typed exactly', () => {
    const own = P.addCustomHabit(
      P.createPilot(
        { age: '30_49', precautions: [], minutesPerDay: 90 },
        [{ habitId: 'mind_read', intensity: 'starter' }],
        '2026-01-05',
      )!,
      { name: 'Gitarre üben ✨', note: 'nach dem Abendessen', perWeek: 3 },
      1,
      7,
    )!;
    setLanguage('de');
    expect(language()).toBe('de');
    expect(t('nav.tabs.habits')).toBe('Gewohnheiten');
    expect(P.nameOf(own.program, own.id)).toBe('Gitarre üben ✨');
    expect(P.targetText(own.program, own.id, 1)).toBe('nach dem Abendessen');
    expect(P.habitName('mind_read')).not.toBe('Read Daily');
    setLanguage('tr');
    expect(P.nameOf(own.program, own.id)).toBe('Gitarre üben ✨');
    setLanguage('en');
    expect(P.habitName('mind_read')).toBe('Read Daily');
  });

  it('fills placeholders and plurals in each language', () => {
    for (const lang of ['en', 'tr', 'es', 'fr', 'de', 'pt-BR'] as LanguageCode[]) {
      setLanguage(lang);
      const one = t('common.days', { count: 1 });
      const many = t('common.days', { count: 5 });
      expect(one).toMatch(/1/);
      expect(many).toMatch(/5/);
      expect(t('engine.target.mind_read', { time: 'X' })).toContain('X');
    }
  });

  it('a language without a catalog shows English', () => {
    setLanguage('xx' as LanguageCode);
    expect(language()).toBe('en');
    expect(t('nav.tabs.journey')).toBe('Journey');
  });
});

describe('languages and formats', () => {
  it('names every language in its own language', () => {
    expect(LANGUAGES.map((l) => l.native)).toEqual(
      expect.arrayContaining([
        'Deutsch',
        'Français',
        'Türkçe',
        'Español',
        'Português (Brasil)',
        '日本語',
        'العربية',
        'اردو',
        'ไทย',
      ]),
    );
    expect(LANGUAGES).toHaveLength(20);
  });

  it('matches device locales to a ready language, or none', () => {
    expect(matchLanguage('de-AT')).toBe('de');
    expect(matchLanguage('pt-PT')).toBe('pt-BR');
    expect(matchLanguage('pt-BR')).toBe('pt-BR');
    expect(matchLanguage('es-MX')).toBe('es');
    expect(matchLanguage('tr_TR')).toBe('tr');
    expect(matchLanguage('ja-JP')).toBe('ja');
    expect(matchLanguage('zh-Hans-CN')).toBe('zh-Hans');
    expect(matchLanguage('zh-CN')).toBe('zh-Hans');
    expect(matchLanguage('zh-Hant-TW')).toBe('zh-Hant');
    expect(matchLanguage('zh-HK')).toBe('zh-Hant');
    expect(matchLanguage('zh-TW')).toBe('zh-Hant');
    expect(matchLanguage('in-ID')).toBe('id');
    expect(matchLanguage('ar-EG')).toBe('ar');
    expect(matchLanguage('ur-PK')).toBe('ur');
    expect(matchLanguage('sv-SE')).toBeNull();
    expect(matchLanguage(undefined)).toBeNull();
  });

  it('chooses CLDR plural forms', () => {
    expect([0, 1, 2].map((n) => pluralCategory('fr', n))).toEqual(['one', 'one', 'other']);
    expect([0, 1, 2].map((n) => pluralCategory('de', n))).toEqual(['other', 'one', 'other']);
    expect([1, 2, 5, 22].map((n) => pluralCategory('ru', n))).toEqual(['one', 'few', 'many', 'few']);
    expect([0, 1, 2].map((n) => pluralCategory('bn', n))).toEqual(['one', 'one', 'other']);
    expect([0, 1, 2].map((n) => pluralCategory('ur', n))).toEqual(['other', 'one', 'other']);
    expect(pluralCategory('th', 1)).toBe('other');
    expect([0, 1, 2, 5, 11, 100].map((n) => pluralCategory('ar', n))).toEqual([
      'zero',
      'one',
      'two',
      'few',
      'many',
      'other',
    ]);
  });

  it('formats numbers and percentages for the language', () => {
    expect(formatNumber(2300, 'en')).toBe('2,300');
    expect(formatNumber(2300, 'de')).toBe('2.300');
    expect(formatPercent(0.8, 'en')).toBe('80%');
    expect(formatPercent(0.8, 'tr')).toMatch(/%\s?80/);
  });

  it('lookup reads nested keys and plurals', () => {
    expect(lookup(en, 'nav.tabs.habits')).toBe('Habits');
    expect(lookup(en, 'common.days')).toEqual(en.common.days);
    expect(lookup(en, 'nav.nothing')).toBeUndefined();
  });
});
