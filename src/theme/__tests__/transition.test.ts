import { describe, expect, it, jest } from '@jest/globals';
import { palettes } from '../index';
import { findToken, themedPairs, THEME_FADE_MS } from '../fade';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('theme fade mapping', () => {
  it('maps every palette color back to a token whose counterpart is unambiguous', () => {
    for (const [name, mine, other] of [
      ['dark', palettes.dark, palettes.light],
      ['light', palettes.light, palettes.dark],
    ] as const) {
      for (const key of Object.keys(mine) as (keyof typeof mine)[]) {
        const token = findToken(mine, mine[key]);
        expect(token).not.toBeNull();
        // Shared values are fine only if they fade to the same color in the other theme.
        expect([name, key, other[token!]]).toEqual([name, key, other[key]]);
      }
    }
  });

  it('pairs each palette color in a style with its dark and light values', () => {
    expect(
      themedPairs({ backgroundColor: palettes.dark.surface, color: palettes.dark.textDim }, palettes.dark),
    ).toEqual([
      ['backgroundColor', palettes.dark.surface, palettes.light.surface],
      ['color', palettes.dark.textDim, palettes.light.textDim],
    ]);
  });

  it('leaves non-palette colors static (overlays, ceremony colors in light mode)', () => {
    expect(themedPairs({ backgroundColor: 'rgba(17,17,22,0.62)', borderColor: 'transparent' }, palettes.dark)).toEqual(
      [],
    );
    // Ceremonies always use the dark palette; under the light theme those colors aren't light tokens.
    expect(themedPairs({ color: palettes.dark.text }, palettes.light)).toEqual([]);
  });

  it('keeps the fade restrained', () => {
    expect(THEME_FADE_MS).toBeGreaterThanOrEqual(200);
    expect(THEME_FADE_MS).toBeLessThanOrEqual(250);
  });
});
