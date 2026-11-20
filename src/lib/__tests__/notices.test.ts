import { describe, expect, it } from '@jest/globals';
import pkg from '../../../package.json';
import notices from '../../legal/notices.json';

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
};

/*
 * Settings → About → Open Source Licences shows src/legal/notices.json, generated from the production build by
 * scripts/licenses/notices.mjs (whose --check, run by npm run release:check, compares it with a fresh build).
 * These checks are the fast part: every runtime dependency and both icon fonts have their notice, every notice is a
 * real licence text, and nothing brings back the 17 icon fonts the app doesn't use.
 */
const SRC = `${process.cwd()}/src`;
const entries = notices.entries as { name: string; license: string; text: number }[];
const textOf = (name: string) => {
  const e = entries.find((x) => x.name === name);
  return e ? notices.texts[e.text] : undefined;
};
function files(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? e.name === '__tests__'
          ? []
          : files(`${dir}/${e.name}`)
        : /\.tsx?$/.test(e.name)
          ? [`${dir}/${e.name}`]
          : [],
    );
}

describe('open-source notices', () => {
  it('covers every runtime dependency', () => {
    const missing = Object.keys(pkg.dependencies).filter((d) => !textOf(d));
    expect(missing).toEqual([]);
  });

  it('covers the native libraries and the two icon fonts the app ships', () => {
    for (const name of [
      'RevenueCat (purchases-ios)',
      'SDWebImage',
      'Hermes',
      'Folly',
      'Ionicons (icon font)',
      'Material Design Icons (icon font)',
    ])
      expect(textOf(name)).toBeTruthy();
    expect(textOf('Material Design Icons (icon font)')).toContain('Apache License');
  });

  it('gives every component its licence text, with its copyright or licence notice', () => {
    for (const e of entries) {
      const text = notices.texts[e.text];
      expect(text.length).toBeGreaterThan(200);
      expect(text).toMatch(/copyright|licen[cs]e/i);
    }
  });

  it('imports icon sets one by one, so only the two icon fonts used are bundled', () => {
    const whole = files(SRC).filter((f) => /from '@expo\/vector-icons'/.test(fs.readFileSync(f, 'utf8')));
    expect(whole).toEqual([]);
  });

  it('is reachable from Settings → About, offline', () => {
    expect(fs.readFileSync(`${SRC}/app/settings.tsx`, 'utf8')).toContain("pushOnce('/licenses')");
    expect(fs.readFileSync(`${SRC}/app/_layout.tsx`, 'utf8')).toContain('<Stack.Screen name="licenses"');
    expect(fs.readFileSync(`${SRC}/app/licenses.tsx`, 'utf8')).toContain("from '../legal/notices.json'");
  });
});
