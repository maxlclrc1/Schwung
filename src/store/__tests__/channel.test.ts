import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay, toDateKey } from '../../core/dates';
import { buildPlan, toPlan } from '../../core/plan';
import { totalXp } from '../../core/progression';
import type { Answers, PlanHabit } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { EXERCISE_IDS } from '../../core/v2/exercise';
import { previewPlan } from '../../core/v2/program';
import type { Channel } from '../../lib/flags';
import { resolveChannel, storageKey } from '../../lib/flags';
import { currentDay, useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The build channel, switchable per test (a build has one; these tests play every build).
const mockChannel: { value: Channel } = { value: 'development' };
jest.mock('../../lib/flags', () => {
  const actual = jest.requireActual('../../lib/flags') as object;
  return {
    ...actual,
    channel: () => mockChannel.value,
    v2ForNewPrograms: () => mockChannel.value !== 'production',
    devTools: () => mockChannel.value === 'development',
  };
});

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };
const SRC = `${process.cwd()}/src`;

const KEY = 'schwung-state';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const s = () => useApp.getState();
const ANSWERS: Answers = {
  goal: 'calm',
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '0.5-1L',
  mind: 'rarely',
};
const C = FIXTURES['C · 28, energy'];

function startV2(p = C): boolean {
  s().setProfile(p);
  const r = previewPlan(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  return s().startProgramV2(r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id));
}

/** The program as saved, for before/after comparisons. */
const snapshot = () => {
  const { startedAt, answers, plan, logs, seenCeremonies, appliedPhase, notices, programVersion, profile } = s();
  return JSON.parse(
    JSON.stringify({ startedAt, answers, plan, logs, seenCeremonies, appliedPhase, notices, programVersion, profile }),
  );
};

/** An app update or force-quit: the next launch, possibly a build on another channel, loads what is on disk. */
async function relaunch(ch: Channel) {
  await wait(400); // coalesced writes land
  const disk = await AsyncStorage.getItem(KEY);
  mockChannel.value = ch;
  useApp.setState({ plan: [], logs: {}, profile: null, programVersion: 1, startedAt: null, answers: null });
  await wait(400);
  if (disk) await AsyncStorage.setItem(KEY, disk);
  await useApp.persist.rehydrate();
}

/** A program with progress: every habit but the last done today. */
function runningProgram(version: 1 | 2) {
  if (version === 1) {
    s().setAnswers(ANSWERS);
    expect(s().startProgram()).toBe(true);
  } else expect(startV2()).toBe(true);
  for (const h of s().plan.slice(0, -1)) s().toggleHabit(1, h.habitId);
  s().markCeremonySeen(1);
}

beforeEach(async () => {
  mockChannel.value = 'development';
  s().setDevDayOffset(0);
  s().restart();
  s().setProfile(null);
  s().setAnswers(null as unknown as Answers);
  await wait(400);
});

describe('the build channel', () => {
  it('comes from EXPO_PUBLIC_SCHWUNG_CHANNEL; a release build without it is production, never development', () => {
    expect(resolveChannel(undefined, true)).toBe('development');
    expect(resolveChannel(undefined, false)).toBe('production');
    expect(resolveChannel('internal', false)).toBe('internal');
    expect(resolveChannel('internal', true)).toBe('internal');
    expect(resolveChannel('production', true)).toBe('production');
    expect(resolveChannel('development', false)).toBe('production');
    expect(resolveChannel('v2', false)).toBe('production');
  });

  it('release builds always save under the same key; Expo Go keeps the internal channel’s save apart', () => {
    for (const ch of ['development', 'internal', 'production'] as Channel[]) expect(storageKey(ch, false)).toBe(KEY);
    expect(storageKey('development', true)).toBe(KEY);
    expect(storageKey('production', true)).toBe(KEY);
    expect(storageKey('internal', true)).toBe('schwung-state-internal');
  });
});

describe('new users', () => {
  it.each(['development', 'internal'] as Channel[])('%s: get V2, with no switch to turn on', (ch) => {
    mockChannel.value = ch;
    expect(startV2()).toBe(true);
    expect(s().programVersion).toBe(2);
    expect(s().answers).toBeNull();
    expect(s().plan.some((h) => (EXERCISE_IDS as readonly string[]).includes(h.habitId))).toBe(false);
  });

  it('internal: no developer tools — no time travel, no synthetic habits', () => {
    mockChannel.value = 'internal';
    startV2();
    s().setDevDayOffset(30);
    expect(s().devDayOffset).toBe(0);
    expect(currentDay()).toBe(1);
    expect(s().addDevScheduledHabit([1, 3])).toBeNull();
  });

  it('production: unchanged — V1 for new programs, a V2 start is refused, no developer tools', () => {
    mockChannel.value = 'production';
    s().setProfile(C);
    expect(s().startProgramV2([])).toBe(false);
    expect(s().startedAt).toBeNull();
    s().setAnswers(ANSWERS);
    expect(s().startProgram()).toBe(true);
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(toPlan(buildPlan(ANSWERS)));
    s().setDevDayOffset(5);
    expect(s().devDayOffset).toBe(0);
    expect(s().addDevScheduledHabit([1, 3])).toBeNull();
  });

  it('no held exercise habit is ever planned, in any channel, for any reference profile', () => {
    for (const ch of ['development', 'internal'] as Channel[]) {
      mockChannel.value = ch;
      for (const p of Object.values(FIXTURES)) {
        s().restart();
        const r = previewPlan(p);
        if (r.status !== 'ok') continue;
        const offered = [...r.picks.map((x) => x.id), ...r.options.map((o) => o.id)];
        expect(offered.filter((id) => (EXERCISE_IDS as readonly string[]).includes(id))).toEqual([]);
      }
    }
  });
});

describe('existing users keep their program across updates and channels', () => {
  const channels: Channel[] = ['development', 'internal', 'production'];

  it.each(channels)('a running V1 program stays V1, untouched, after a launch on %s', async (ch) => {
    mockChannel.value = 'production';
    runningProgram(1);
    const before = snapshot();
    const xp = totalXp(s().logs);
    await relaunch(ch);
    expect(snapshot()).toEqual(before);
    expect(totalXp(s().logs)).toBe(xp);
    // Not sent through onboarding again, and no way to start over it: neither V2 nor V1.
    expect(s().startedAt).not.toBeNull();
    s().setProfile(C);
    expect(s().startProgramV2([])).toBe(false);
    expect(s().startProgram()).toBe(false);
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(before.plan);
    // It keeps running: the next check-off lands in the same V1 program and earns XP.
    const last = s().plan[s().plan.length - 1].habitId;
    s().toggleHabit(currentDay(), last);
    expect(s().logs[dateForDay(s().startedAt!, currentDay())].completed).toContain(last);
    expect(totalXp(s().logs)).toBeGreaterThan(xp);
    expect(s().programVersion).toBe(1);
  });

  it.each(channels)('a running V2 program stays V2, untouched, after a launch on %s', async (ch) => {
    mockChannel.value = 'internal';
    runningProgram(2);
    const before = snapshot();
    await relaunch(ch);
    expect(snapshot()).toEqual(before);
    s().setAnswers(ANSWERS);
    expect(s().startProgram()).toBe(false);
    expect(startV2(FIXTURES['A · 16, focus'])).toBe(false);
    expect(s().programVersion).toBe(2);
    expect(s().plan).toEqual(before.plan);
  });

  it('a V1 save from before V2 existed (version 1, no program version) stays V1 on the internal channel', async () => {
    const start = toDateKey(new Date());
    const legacy = {
      state: {
        startedAt: start,
        answers: ANSWERS,
        plan: [{ habitId: 'water', level: 'medium', addedOnDay: 1, levelSince: 21 }],
        logs: { [start]: { day: 1, date: start, completed: ['water'], planned: ['water'] } },
        seenCeremonies: [1],
        appliedPhase: 1,
        notices: [],
        devV2Preview: true,
      },
      version: 1,
    };
    mockChannel.value = 'internal';
    await wait(400);
    await AsyncStorage.setItem(KEY, JSON.stringify(legacy));
    await useApp.persist.rehydrate();
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(legacy.state.plan);
    expect(s().logs).toEqual(legacy.state.logs);
    expect('devV2Preview' in s()).toBe(false);
    expect(startV2()).toBe(false);
  });

  it('a damaged program version never turns a running program into V2', async () => {
    mockChannel.value = 'production';
    runningProgram(1);
    await wait(400);
    const disk = JSON.parse((await AsyncStorage.getItem(KEY))!);
    disk.state.programVersion = 'two';
    await AsyncStorage.setItem(KEY, JSON.stringify(disk));
    mockChannel.value = 'internal';
    await useApp.persist.rehydrate();
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(disk.state.plan);
  });

  it('synthetic test habits from a development session leave the plan on internal, keeping every past day', async () => {
    runningProgram(2);
    expect(s().addDevScheduledHabit([1, 3])).not.toBeNull();
    const logs = JSON.parse(JSON.stringify(s().logs));
    await relaunch('internal');
    expect(s().plan.some((h: PlanHabit) => h.habitId.startsWith('devsched_'))).toBe(false);
    expect(s().logs).toEqual(logs);
    expect(s().programVersion).toBe(2);
  });
});

describe('unfinished onboarding and restarts', () => {
  it('an unfinished V1 onboarding never leads into V1 on internal: the next start is V2', async () => {
    mockChannel.value = 'production';
    s().setAnswers(ANSWERS);
    await relaunch('internal');
    expect(s().startedAt).toBeNull();
    expect(startV2()).toBe(true);
    expect(s().programVersion).toBe(2);
    expect(s().answers).toBeNull();
  });

  it('an unfinished V2 onboarding is kept on internal, and never starts V2 on production', async () => {
    mockChannel.value = 'internal';
    s().setProfile(C);
    await relaunch('internal');
    expect(s().profile).toEqual(C);
    await relaunch('production');
    expect(s().startProgramV2([])).toBe(false);
    expect(s().startedAt).toBeNull();
  });

  it('Restart is the only way to start over, and the new program follows the channel', () => {
    mockChannel.value = 'production';
    runningProgram(1);
    mockChannel.value = 'internal';
    expect(startV2()).toBe(false);
    s().restart();
    expect(s().startedAt).toBeNull();
    expect(s().plan).toEqual([]);
    expect(startV2()).toBe(true);
    expect(s().programVersion).toBe(2);
  });
});

describe('routes', () => {
  const read = (f: string) => fs.readFileSync(`${SRC}/app/${f}`, 'utf8');

  it('every V1 onboarding screen sends a new user to V2 on a V2 channel, after the running-program check', () => {
    for (const f of ['quiz.tsx', 'start.tsx', 'reveal.tsx']) {
      const src = read(f);
      const running = src.indexOf('if (started) return <Redirect href="/today" />;');
      const v2 = src.indexOf('if (v2ForNewPrograms()) return <Redirect href="/v2/quiz" />;');
      expect([f, running >= 0, v2 > running]).toEqual([f, true, true]);
    }
  });

  it('Welcome sends a running program to Today', () => {
    expect(read('welcome.tsx')).toMatch(/if \(started\) return <Redirect href="\/today" \/>;/);
  });

  it('every V2 onboarding screen sends a running program to Today and is closed on production', () => {
    for (const f of ['v2/quiz.tsx', 'v2/plan.tsx', 'v2/time.tsx']) {
      const src = read(f);
      expect([f, /const enabled = v2ForNewPrograms\(\);/.test(src)]).toEqual([f, true]);
      expect([f, src.includes('if (started) return <Redirect href="/today" />;')]).toEqual([f, true]);
    }
  });

  it('three tabs (Habits, Journey, Field Notes) only in testing builds; the public release keeps Today on its own', () => {
    const { tabs } = jest.requireActual<typeof import('../../lib/flags')>('../../lib/flags');
    expect([tabs('production'), tabs('internal'), tabs('development')]).toEqual([false, true, true]);
    const layout = read('(tabs)/_layout.tsx');
    expect(layout).toContain('tabBar={on ? undefined : () => null}');
    const order = [...layout.matchAll(/name="(\w+)"\s+options=\{\{\s*title: '([^']+)'/g)].map((m) => [m[1], m[2]]);
    expect(order).toEqual([
      ['today', 'Habits'],
      ['progress', 'Journey'],
      ['fieldnotes', 'Field Notes'],
    ]);
    // The release opens the journey as the same sheet as before; the Journey tab sends it there too.
    expect(read('(tabs)/today.tsx')).toContain("else router.push(day ? `/journey?day=${day}` : '/journey');");
    expect(read('(tabs)/progress.tsx')).toContain('if (!tabs()) return <Redirect href="/journey" />;');
    // Day 1 opens from Today once it's inside the navigator, never pushed during onboarding's last replace.
    expect(read('reminder.tsx')).not.toMatch(/push\('\/ceremony|markCeremonySeen/);
    expect(read('(tabs)/today.tsx')).toContain('const delay = m === 1 ? 0 : m === today ? 900 : 350;');
  });

  it('Welcome has no developer switch and no V2 or preview wording on any normal screen', () => {
    expect(read('welcome.tsx')).not.toMatch(/setDevV2Preview|Developer/);
    for (const f of [
      'welcome.tsx',
      'v2/quiz.tsx',
      'v2/plan.tsx',
      'v2/time.tsx',
      '(tabs)/today.tsx',
      '(tabs)/progress.tsx',
      '(tabs)/_layout.tsx',
    ]) {
      const visible = read(f)
        .split('\n')
        .filter((l) => !/^\s*(\/\/|\*|\/\*|import)/.test(l))
        .join('\n');
      expect([f, /Development preview|Habit Science V2|V2 preview|[Ee]xperiment/.test(visible)]).toEqual([f, false]);
    }
  });
});
