import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import type { PilotAnswers, PilotChoice } from '../../core/reset/pilot';
import { readTrack } from '../../core/reset/tracking';
import type { Channel } from '../../lib/flags';
import { pilotToday, resetPilotKey, sanitizeResetPilot, useResetPilot } from '../resetPilot';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The build channel, switchable per test (a build has one; these tests play every build).
const mockChannel: { value: Channel } = { value: 'development' };
// (The store reads the channel as it loads, before this file's constants exist: development then.)
const ch = (): Channel => mockChannel?.value ?? 'development';
jest.mock('../../lib/flags', () => {
  const actual = jest.requireActual('../../lib/flags') as object;
  return { ...actual, channel: () => ch(), devTools: () => ch() === 'development' };
});

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };
const SRC = `${process.cwd()}/src`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r = () => useResetPilot.getState();
const ADULT: PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 90, strengthStart: 'sometimes' };
const ALL: PilotChoice[] = [
  { habitId: 'mind_read', intensity: 'standard' },
  { habitId: 'focus_deepwork', intensity: 'standard' },
  { habitId: 'strength_log', intensity: 'standard' },
];
const at = (day: number) => r().setDevDayOffset(day - 1);
const todayLog = () => r().program!.logs[dateForDay(r().program!.startedAt, pilotToday())];

beforeEach(async () => {
  mockChannel.value = 'development';
  r().end();
  await wait(400);
});

describe('the program', () => {
  it('has its own save key ("-internal" in Expo Go’s internal channel)', () => {
    expect(resetPilotKey('development', true)).toBe('schwung-reset-pilot');
    expect(resetPilotKey('internal', true)).toBe('schwung-reset-pilot-internal');
    expect(resetPilotKey('internal', false)).toBe('schwung-reset-pilot');
  });

  it('starts, runs and ends, saved on its key', async () => {
    expect(r().start(ADULT, ALL)).toBe(true);
    r().complete('mind_read');
    r().complete('focus_deepwork');
    r().setSession({ type: 'upper', minutes: 30 });
    at(8);
    r().complete('mind_read');
    r().harder('mind_read');
    await wait(400);
    expect(await AsyncStorage.getItem('schwung-reset-pilot')).toContain('"mind_read"');
    r().end();
    await wait(400);
    expect(r().program).toBeNull();
    expect(JSON.parse((await AsyncStorage.getItem('schwung-reset-pilot'))!).state.program).toBeNull();
  });

  it('never creates a second program, however often set-up finishes', () => {
    expect(r().start(ADULT, ALL)).toBe(true);
    const first = r().program;
    for (let i = 0; i < 3; i++) expect(r().start(ADULT, ALL.slice(0, 1))).toBe(false);
    expect(r().program).toBe(first);
  });

  it('refuses a setup the eligibility or time rules don’t allow', () => {
    expect(r().start({ ...ADULT, precautions: ['heart'] }, ALL)).toBe(false);
    expect(r().start({ ...ADULT, age: '16_17' }, [{ habitId: 'strength_log', intensity: 'challenge' }])).toBe(false);
    expect(r().start({ ...ADULT, minutesPerDay: 60 }, ALL)).toBe(false);
    expect(r().start({ ...ADULT, age: 'u16' }, ALL.slice(0, 1))).toBe(false);
    expect(r().program).toBeNull();
  });

  it('starts only with the 11 Life Reset habits: retired ones (Phone-Free Wind-Down…) are refused', () => {
    for (const id of ['sleep_no_phone_bed', 'sleep_bedtime', 'water', 'mind_meditate', 'move_strength_session'])
      expect([id, r().start(ADULT, [{ habitId: id, intensity: 'starter' }])]).toEqual([id, false]);
    expect(r().program).toBeNull();
  });

  it('loads an older pilot save unchanged, with its tracking data (its old "active" choice ignored)', () => {
    const date = dateForDay('2026-01-05', 1);
    const saved = {
      active: false,
      inviteHidden: true,
      program: {
        v: 1,
        startedAt: '2026-01-05',
        answers: { age: '30_49', precautions: [], minutesPerDay: 90 },
        habits: ['mind_read'],
        progression: {
          mind_read: {
            v: 1,
            habitId: 'mind_read',
            eras: [{ intensity: 'standard', phase: 'foundation', fromDay: 1, reason: 'start' }],
          },
        },
        logs: {
          [date]: {
            day: 1,
            date,
            completed: ['mind_read'],
            planned: ['mind_read'],
            track: { mind_read: { v: 1, by: 'timer', minutes: 20, everCompleted: true } },
          },
        },
      },
      devDayOffset: 0,
    };
    const loaded = sanitizeResetPilot(saved);
    expect(Object.keys(loaded).sort()).toEqual(['devDayOffset', 'program']);
    expect(loaded.program?.logs[date].track?.mind_read).toEqual(saved.program.logs[date].track.mind_read);
  });
});

describe('persistence and recovery', () => {
  async function relaunch() {
    await wait(400);
    const disk = await AsyncStorage.getItem('schwung-reset-pilot');
    useResetPilot.setState({ program: null });
    await wait(400);
    if (disk) await AsyncStorage.setItem('schwung-reset-pilot', disk);
    await useResetPilot.persist.rehydrate();
  }

  it('keeps progress, counters, details, pending changes and the Screen Time check across a restart', async () => {
    r().start({ ...ADULT, phone: '4_6', pullMinutes: 120 }, [
      ...ALL,
      { habitId: 'focus_top3', intensity: 'standard' },
      { habitId: 'screen_app_limit', intensity: 'starter' },
    ]);
    r().complete('mind_read');
    r().count('focus_top3', 1);
    r().setSession({ minutes: 25 });
    r().easier('strength_log');
    r().setScreenTime(95);
    const before = JSON.parse(JSON.stringify(r().program));
    await relaunch();
    expect(r().program).toEqual(before);
    expect(readTrack(todayLog(), 'focus_top3').count).toBe(1);
    expect(r().program!.progression.strength_log.eras).toHaveLength(2);
    expect(r().program!.measures?.screen_app_limit).toBeDefined();
  });

  it('corrects yesterday only while it can still be edited (until noon), never older days', () => {
    r().start(ADULT, ALL);
    at(3);
    const noon = new Date();
    const clock = jest.spyOn(Date, 'now');
    // Morning: yesterday can be corrected; afternoon: it can't.
    jest.useFakeTimers({ now: new Date(noon.getFullYear(), noon.getMonth(), noon.getDate(), 9, 0) });
    r().toggle('mind_read', 2);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 2)]?.completed).toEqual(['mind_read']);
    r().toggle('mind_read', 1);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 1)]).toBeUndefined();
    jest.setSystemTime(new Date(noon.getFullYear(), noon.getMonth(), noon.getDate(), 15, 0));
    r().toggle('mind_read', 2);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 2)]?.completed).toEqual(['mind_read']);
    jest.useRealTimers();
    clock.mockRestore();
  });

  it('never trusts a damaged save, and says what it couldn’t read', () => {
    expect(sanitizeResetPilot({ program: { v: 1, startedAt: 'x' } })).toEqual({
      program: null,
      lost: ['The Life Reset itself (its start date or format)'],
    });
    expect(sanitizeResetPilot('nope')).toEqual({});
    expect(sanitizeResetPilot({ program: null, devDayOffset: 3 })).toEqual({ program: null, devDayOffset: 3 });
  });
});

describe('builds', () => {
  it('internal and production builds have no developer tools (no time travel)', () => {
    for (const c of ['internal', 'production'] as Channel[]) {
      mockChannel.value = c;
      r().end();
      expect(r().start(ADULT, ALL)).toBe(true);
      r().setDevDayOffset(10);
      expect([c, r().devDayOffset, pilotToday()]).toEqual([c, 0, 1]);
    }
  });

  it('keeps the card interactions: the same HabitCard, the page holding its scroll while a card is swiped', () => {
    const src = fs.readFileSync(`${SRC}/components/pilot/PilotToday.tsx`, 'utf8');
    expect(src).toContain('<HabitCard');
    expect(src).toContain('onSwipe={onSwipe}');
    expect(src).toContain('scrollEnabled={!swiping}');
    expect(src).toContain('directionalLockEnabled');
    // The card's own gesture code is shared, unchanged: a sideways drag on a card is the card's, never the pager's.
    const card = fs.readFileSync(`${SRC}/components/HabitCard.tsx`, 'utf8');
    expect(card).toContain('const block = useCardBlock();');
    expect(card).toContain('<GestureDetector gesture={block}>{card}</GestureDetector>');
  });
});
