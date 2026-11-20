import { describe, expect, it } from '@jest/globals';
import { LANGUAGES } from '../languages';

/*
 * A release check for critical translation errors (not a review of quality, which is still a person's job):
 * every language is written in its own script, nothing is left in English by mistake, and the app's name is
 * always a placeholder in new copy, so a rename never needs a translation pass for it.
 */
type Tree = Record<string, unknown>;
const catalog = (code: string): Tree =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Object.values(require(`../locales/${code}`) as Record<string, Tree>)[0];
const flat = (o: unknown, at = '', out: Record<string, string> = {}) => {
  for (const [k, v] of Object.entries((o ?? {}) as Tree)) {
    const key = at ? `${at}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object') flat(v, key, out);
  }
  return out;
};
const en = flat(catalog('en'));
const words = (s: string) =>
  s.replace(/\{[^}]+\}/g, '').replace(/Schwung|Life Reset|App Store|Apple|iPhone|Screen Time|XP/g, '');

/** Each non-Latin language's script; a long string without a single character of it is untranslated. */
const SCRIPT: Record<string, RegExp> = {
  ru: /[Ѐ-ӿ]/,
  ar: /[؀-ۿ]/,
  ur: /[؀-ۿ]/,
  hi: /[ऀ-ॿ]/,
  bn: /[ঀ-৿]/,
  th: /[฀-๿]/,
  ja: /[぀-ヿ一-鿿]/,
  ko: /[가-힯]/,
  'zh-Hans': /[一-鿿]/,
  'zh-Hant': /[一-鿿]/,
};
/** Strings that are rightly the same as English in some languages (loanwords, units). */
const SAME_OK = new Set(['story.brand', 'engine.minutes.one', 'engine.minutes.other', 'insights.strengthTarget']);

describe('translations: critical errors', () => {
  for (const { code } of LANGUAGES.filter((l) => l.code !== 'en')) {
    const tr = flat(catalog(code));
    it(`${code}: nothing left in English by mistake`, () => {
      const same = Object.keys(en).filter(
        (k) => tr[k] === en[k] && !SAME_OK.has(k) && /[a-z]{4,}/i.test(words(en[k])) && en[k].length > 12,
      );
      expect(same).toEqual([]);
    });
    if (SCRIPT[code])
      it(`${code}: written in its own script`, () => {
        const wrong = Object.keys(tr).filter(
          (k) =>
            k in en && !SAME_OK.has(k) && words(en[k]).replace(/[^a-z]/gi, '').length > 12 && !SCRIPT[code].test(tr[k]),
        );
        expect(wrong).toEqual([]);
      });
  }

  it('new copy names the app only through {app} (so a rename needs no translation pass)', () => {
    for (const k of Object.keys(en).filter((k) => k.startsWith('settings.tips.') || k.startsWith('common.crash.')))
      expect(en[k]).not.toContain('Schwung');
  });
});
