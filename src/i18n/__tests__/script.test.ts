import { describe, expect, it } from '@jest/globals';
import { scriptAdjust } from '../script';

describe('script adjustments', () => {
  it('give tight styles room for marks on capitals (Turkish İ) without touching looser ones', () => {
    expect(scriptAdjust('tr', { fontSize: 44, lineHeight: 48 })).toEqual({ lineHeight: 53 });
    expect(scriptAdjust('de', { fontSize: 30, lineHeight: 36 })).toBeNull();
    expect(scriptAdjust('en', { fontSize: 44, lineHeight: 48 })).toBeNull();
  });

  it('keep raising line height and dropping letter spacing for tall and joined scripts', () => {
    expect(scriptAdjust('ur', { fontSize: 20, lineHeight: 24, letterSpacing: -0.5 })).toEqual({
      lineHeight: 36,
      letterSpacing: 0,
    });
    expect(scriptAdjust('vi', { fontSize: 44, lineHeight: 48 })).toEqual({ lineHeight: 56 });
  });
});
