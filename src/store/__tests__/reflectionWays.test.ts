import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as P from '../../core/reset/pilot';
import { waysForward } from '../../core/reset/waysForward';
import { pilotToday, useResetPilot } from '../resetPilot';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * The weekly reflection's ways forward through the real store (phase R1A): answering, leaving and coming back only
 * ever saves the answer; the plan changes only through the confirmed actions the screen calls.
 */

const r = () => useResetPilot.getState();
const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 60,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
};
const plan = () => {
  const p = r().program!;
  return { habits: p.habits, progression: p.progression, logs: p.logs, custom: p.custom };
};

beforeEach(async () => {
  r().end();
  await wait(50);
  expect(
    r().start(ANSWERS, [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'mind_meditation', intensity: 'starter' },
      { habitId: 'move_walk', intensity: 'starter' },
    ]),
  ).toBe(true);
  for (let d = 1; d <= 14; d++) {
    r().setDevDayOffset(d - 1);
    r().complete('mind_read');
    if (d <= 7) r().complete('move_walk');
  }
  r().setDevDayOffset(14); // Day 15
});

describe('the reflection’s ways forward, through the store', () => {
  it('answering "harder", leaving and coming back saves the answer and nothing else', () => {
    expect(pilotToday()).toBe(15);
    const before = plan();
    r().reflect(2, 'harder');
    // Navigating away from the sheet (Close) and opening it again from Journey: nothing is written but the answer.
    r().reflect(2);
    expect(r().program!.reflections?.[2]).toMatchObject({ week: 2, answer: 'harder' });
    expect(plan()).toEqual(before);
    expect(waysForward(r().program!, 15)).toEqual({ easier: [], fewer: ['mind_read', 'mind_meditation', 'move_walk'] });
  });

  it('stopping a habit is the confirmed removal: its past stays, and it isn’t recorded as a target change', () => {
    r().reflect(2, 'harder');
    const logs = r().program!.logs;
    const xp = P.pilotXp(r().program!);
    expect(r().removeHabit('mind_meditation')).toBeNull();
    const p = r().program!;
    expect(p.habits).toEqual(['mind_read', 'move_walk']);
    expect(p.logs).toBe(logs);
    expect(P.pilotXp(p)).toBe(xp);
    expect(p.reflections?.[2]?.changed).toBeUndefined();
  });

  it('the last habit can never be stopped', () => {
    r().removeHabit('mind_meditation');
    r().removeHabit('move_walk');
    expect(r().removeHabit('mind_read')).not.toBeNull();
    expect(r().program!.habits).toEqual(['mind_read']);
  });
});
