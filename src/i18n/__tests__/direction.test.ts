import { describe, expect, it, jest } from '@jest/globals';
import { I18nManager } from 'react-native';
import { applyDirection, DIR, IS_RTL, isRTLLanguage } from '../direction';
import { LANGUAGES } from '../languages';

describe('layout direction', () => {
  it('marks only Arabic and Urdu right-to-left', () => {
    expect(LANGUAGES.filter((l) => isRTLLanguage(l.code)).map((l) => l.code)).toEqual(['ar', 'ur']);
  });

  it('asks native for the language’s direction and reports when a restart is needed', () => {
    const force = jest.spyOn(I18nManager, 'forceRTL').mockImplementation(() => {});
    const allow = jest.spyOn(I18nManager, 'allowRTL').mockImplementation(() => {});
    expect(IS_RTL).toBe(false);
    expect(DIR).toBe(1);
    expect(applyDirection('ar')).toBe(true);
    expect(force).toHaveBeenLastCalledWith(true);
    expect(allow).toHaveBeenLastCalledWith(true);
    expect(applyDirection('de')).toBe(false);
    expect(force).toHaveBeenLastCalledWith(false);
  });
});
