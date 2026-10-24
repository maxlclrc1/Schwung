import { describe, expect, it, jest } from '@jest/globals';
import { animatedColors, COLOR_PROPS } from '../fade';
import { palettes } from '../index';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };

/** The props an animated style writes for a style: an animated style keeps any prop it stops writing. */
const written = (style: Record<string, string>, c = palettes.light) => {
  const { fades, fixed } = animatedColors(style, c);
  return Object.fromEntries([...fades.map(([p, d, l]) => [p, c === palettes.dark ? d : l]), ...fixed]);
};

describe('deselecting a choice clears its selected look (theme fade layer)', () => {
  // How every choice in the app is styled (quiz options and chips, plan choices, level picker).
  const option = (selected: boolean, c = palettes.light) => ({
    backgroundColor: selected ? c.accentSoft : c.surface,
    borderColor: selected ? c.accentInk : 'transparent',
  });

  it.each(['light', 'dark'] as const)('%s: the deselected border is written, not left at the selected color', (s) => {
    const c = palettes[s];
    expect(written(option(true, c), c)).toEqual({ backgroundColor: c.accentSoft, borderColor: c.accentInk });
    // Before the fix only palette colors were written, so `borderColor` was missing here and kept the accent.
    expect(written(option(false, c), c)).toEqual({ backgroundColor: c.surface, borderColor: 'transparent' });
  });

  it('every color prop in a style is written, whatever its value', () => {
    const style = { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'transparent', color: palettes.light.text };
    expect(Object.keys(written(style)).sort()).toEqual(['backgroundColor', 'borderColor', 'color']);
    for (const prop of COLOR_PROPS) expect(Object.keys(written({ [prop]: '#123456' }))).toEqual([prop]);
  });

  it('the themed View and Text use it', () => {
    const src = fs.readFileSync(`${process.cwd()}/src/theme/transition.tsx`, 'utf8');
    expect(src).toMatch(/const \{ fades, fixed \} = animatedColors\(/);
    expect(src).toMatch(/for \(const \[prop, v\] of fixed\) out\[prop\] = v;/);
  });
});
