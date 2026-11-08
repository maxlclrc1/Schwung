import { describe, expect, it, jest } from '@jest/globals';
import { themePair, transparentOf } from '../fade';
import { palettes } from '../index';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('selection colours', () => {
  it('makes a colour transparent without changing its hue', () => {
    expect(transparentOf('#7451C8')).toBe('#7451C800');
    expect(transparentOf('#abc')).toBe('#aabbcc00');
    expect(transparentOf('#7451C8FF')).toBe('#7451C800');
    expect(transparentOf('rgba(116,81,200,0.10)')).toBe('rgba(116,81,200, 0)');
    expect(transparentOf('rgb(1, 2, 3)')).toBe('rgba(1, 2, 3, 0)');
  });

  it('keeps palette colours following the theme', () => {
    expect(themePair(palettes.light.accent, null, palettes.light)).toEqual([palettes.dark.accent, palettes.light.accent]);
    expect(themePair(palettes.dark.surface, null, palettes.dark)).toEqual([palettes.dark.surface, palettes.light.surface]);
  });

  it('uses any other colour as it is', () => {
    expect(themePair('#E2A988', null, palettes.light)).toEqual(['#E2A988', '#E2A988']);
  });

  it('draws nothing as the transparent form of the other end', () => {
    expect(themePair(null, palettes.light.accentSoft, palettes.light)).toEqual([
      transparentOf(palettes.dark.accentSoft),
      transparentOf(palettes.light.accentSoft),
    ]);
    expect(themePair(null, null, palettes.light)).toEqual(['transparent', 'transparent']);
  });
});
