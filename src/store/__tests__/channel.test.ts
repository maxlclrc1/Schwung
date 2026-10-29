import { describe, expect, it, jest } from '@jest/globals';
import { resolveChannel } from '../../lib/flags';
import { resetPilotKey } from '../resetPilot';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string): string[];
  statSync(p: string): { isDirectory(): boolean };
};
const SRC = `${process.cwd()}/src`;
const read = (f: string) => fs.readFileSync(`${SRC}/app/${f}`, 'utf8');
function walk(dir: string, base = dir): string[] {
  return fs.readdirSync(dir).flatMap((n) => {
    const p = `${dir}/${n}`;
    return fs.statSync(p).isDirectory() ? walk(p, base) : [p.slice(base.length + 1)];
  });
}

describe('the build channel', () => {
  it('comes from EXPO_PUBLIC_SCHWUNG_CHANNEL; a release build without it is production, never development', () => {
    expect(resolveChannel(undefined, true)).toBe('development');
    expect(resolveChannel(undefined, false)).toBe('production');
    expect(resolveChannel('internal', false)).toBe('internal');
    expect(resolveChannel('internal', true)).toBe('internal');
    expect(resolveChannel('production', true)).toBe('production');
    expect(resolveChannel('development', false)).toBe('production');
  });

  it('release builds always save under the same key; Expo Go keeps the internal channel’s save apart', () => {
    for (const ch of ['development', 'internal', 'production'] as const)
      expect(resetPilotKey(ch, false)).toBe('schwung-reset-pilot');
    expect(resetPilotKey('internal', true)).toBe('schwung-reset-pilot-internal');
  });
});

describe('one app: the Life Reset', () => {
  it('has only the Life Reset’s screens', () => {
    expect(walk(`${SRC}/app`).sort()).toEqual([
      '(tabs)/_layout.tsx',
      '(tabs)/insights.tsx',
      '(tabs)/progress.tsx',
      '(tabs)/today.tsx',
      '_layout.tsx',
      'index.tsx',
      'life-reset/[id].tsx',
      'life-reset/add.tsx',
      'life-reset/collection.tsx',
      'life-reset/reflect.tsx',
      'life-reset/setup.tsx',
      'life-reset/story.tsx',
      'privacy.tsx',
      'settings.tsx',
      'welcome.tsx',
    ]);
  });

  it('opens on the program, or on the start screen, which leads into set-up', () => {
    expect(read('index.tsx')).toContain("<Redirect href={started ? '/today' : '/welcome'} />");
    const welcome = read('welcome.tsx');
    expect(welcome).toContain('if (started) return <Redirect href="/today" />;');
    expect(welcome).toContain("router.push('/life-reset/setup')");
    expect(read('(tabs)/today.tsx')).toContain('if (!started) return <Redirect href="/welcome" />;');
  });

  it('has three tabs, Habits, Journey and Insights, as one pager over the world', () => {
    const layout = read('(tabs)/_layout.tsx');
    expect(layout).toContain('<WorldLayer />');
    const order = [...layout.matchAll(/name="(\w+)" options=\{(\w+)\}/g)].map((m) => [m[1], m[2]]);
    expect(order).toEqual([
      ['today', 'HABITS'],
      ['progress', 'JOURNEY'],
      ['insights', 'INSIGHTS'],
    ]);
    // The pager: a UI-thread pan (worklets), off under a modal or with the keyboard up, and blocked by habit cards.
    const pager = fs.readFileSync(`${SRC}/components/PagerTabs.tsx`, 'utf8');
    expect(pager).toContain('enabled: pagerOpen,');
    expect(pager.match(/'worklet';/g)?.length).toBeGreaterThanOrEqual(3);
    expect(pager).toContain('pageTarget(e.translationX, e.velocityX / 1000, w, at, pageCount.get())');
    expect(pager).toContain('<InPager value>');
    // Created once (never re-sent to the native handler on a render), activated only by its own checks, and never
    // waiting on another gesture: a card's gesture only stamps its touch and fails at once.
    expect(pager).toContain('const config = useMemo(');
    expect(pager).toContain('manualActivation: true,');
    expect(pager).toContain(
      'if (Math.abs(cardDownAt.get() - s.at) < 150) return GestureStateManager.fail(e.handlerTag);',
    );
    const owner = fs.readFileSync(`${SRC}/components/TabPager.tsx`, 'utf8');
    expect(owner).not.toMatch(/block:|requireToFail|simultaneousWith/);
    expect(owner).toContain('cardDownAt.set(Date.now());');
    // Only the cards' swipe ever holds the Habits page's scroll, and only while swiping.
    const habits = fs.readFileSync(`${SRC}/components/pilot/PilotToday.tsx`, 'utf8');
    expect(habits).toContain('scrollEnabled={!swiping}');
    expect(habits).toContain('onSwipe={setSwiping}');
    // The mountain is drawn once, on Journey, with the 66-day expedition calendar below it (never over it).
    const journey = read('(tabs)/progress.tsx');
    expect(journey.match(/<AscentScene/g)).toHaveLength(1);
    expect(journey.match(/<ExpeditionCalendar/g)).toHaveLength(1);
    expect(journey.indexOf('<ExpeditionCalendar')).toBeGreaterThan(journey.indexOf('<AscentScene'));
    expect(journey).not.toContain('<Modal');
  });

  it('has no earlier program, switching or test wording anywhere a person reads', () => {
    const files = walk(SRC).filter((f) => /\.tsx$/.test(f) && !f.includes('__tests__'));
    for (const f of files) {
      const visible = fs
        .readFileSync(`${SRC}/${f}`, 'utf8')
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*|import )/.test(l))
        .join('\n');
      expect([
        f,
        /previous program|Switch to my|\bpilot\b[^'"`]*['"`]|['"`>][^'"`<\n]*\b(pilot|testing|V1|V2)\b/i.test(visible),
      ]).toEqual([f, false]);
    }
  });

  it('Settings has no restart, reminder or V1 developer tools: ending the Life Reset is the one way to start over', () => {
    const settings = read('settings.tsx');
    expect(settings).not.toMatch(/Restart program|Daily reminder|Developer/);
    expect(settings).toContain('<PilotSettings Section={Section} Row={Row} />');
    expect(fs.readFileSync(`${SRC}/components/pilot/PilotSettings.tsx`, 'utf8')).toContain(
      'label="End the Life Reset"',
    );
  });
});
