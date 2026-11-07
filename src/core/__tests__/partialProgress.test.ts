import { describe, expect, it } from '@jest/globals';
import { buildExport } from '../dataExport';
import { readBackup, type SaveFormat } from '../dataImport';
import { dateForDay } from '../dates';
import { DEFAULT_REMINDERS } from '../reminders';
import * as P from '../reset/pilot';
import { readTrack } from '../reset/tracking';
import type { DayLog } from '../types';

// 2026-11-02 is a Monday.
const MON = '2026-11-02';
const ADULT: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 180,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
  strengthStart: 'sometimes',
};
const pilot = (choices: P.PilotChoice[]) => {
  const p = P.createPilot(ADULT, choices, MON);
  if (!p) throw new Error(P.setupProblems(ADULT, choices).join('; '));
  return p;
};
const one = (habitId: string) => pilot([{ habitId, intensity: 'starter' }]);
const log = (p: P.PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)];
const xp = P.pilotXp;

describe('Partial progress: XP', () => {
  it('is worth 5 XP, and a completion 10 in all, never more', () => {
    let p = one('sleep_wake');
    expect(P.progressKind(p, 'sleep_wake', 1).kind).toBe('effort');
    p = P.setProgress(p, 'sleep_wake', 1, 1).program;
    expect([xp(p), P.isDone(p, 'sleep_wake', 1)]).toEqual([5, false]);
    // Logging again changes nothing.
    expect(xp(P.setProgress(p, 'sleep_wake', 1, 1).program)).toBe(5);
    // Swiping completes it: 10 for the habit (+20 for the full day), not 15.
    const done = P.complete(p, 'sleep_wake', 1).program;
    expect(xp(done)).toBe(10 + 20);
    // Undo goes back to the logged progress; removing it goes back to nothing.
    const undone = P.undo(done, 'sleep_wake', 1).program;
    expect(xp(undone)).toBe(5);
    expect(xp(P.setProgress(undone, 'sleep_wake', 1, null).program)).toBe(0);
  });

  it('timed habits log minutes as a detail: always 5 XP, never a completion by themselves', () => {
    let p = one('mind_read');
    const { kind, target } = P.progressKind(p, 'mind_read', 1);
    expect(kind).toBe('minutes');
    expect(target).toBeGreaterThan(1);
    p = P.setProgress(p, 'mind_read', 1, 5).program;
    expect([xp(p), P.isDone(p, 'mind_read', 1)]).toEqual([5, false]);
    // Reaching (or passing) the target's minutes is still partial: completing is the person's swipe.
    const more = P.setProgress(p, 'mind_read', 1, target! + 30);
    expect([more.event, xp(more.program), P.isDone(more.program, 'mind_read', 1)]).toEqual([null, 5, false]);
    const swiped = P.complete(more.program, 'mind_read', 1).program;
    expect(xp(swiped)).toBe(10 + 20);
    // Minutes noted on a swiped completion never undo it or add XP.
    const noted = P.setProgress(swiped, 'mind_read', 1, 5).program;
    expect([xp(noted), P.isDone(noted, 'mind_read', 1)]).toEqual([30, true]);
    expect(P.isDone(P.setProgress(noted, 'mind_read', 1, null).program, 'mind_read', 1)).toBe(true);
  });

  it('Mark as partially completed works on every kind of habit, for 5 XP, and can be removed', () => {
    for (const id of ['sleep_wake', 'mind_read', 'eat_well', 'strength_log']) {
      const p = one(id);
      const on = P.setPartial(p, id, 1, true).program;
      expect([id, xp(on), P.isDone(on, id, 1)]).toEqual([id, 5, false]);
      // Twice is still once.
      expect(xp(P.setPartial(on, id, 1, true).program)).toBe(5);
      expect(xp(P.setPartial(on, id, 1, false).program)).toBe(0);
      // A completed habit isn't marked partial.
      const done = P.complete(p, id, 1).program;
      expect(P.setPartial(done, id, 1, true).program).toBe(done);
    }
  });

  it('counter habits log the amount on the counter itself', () => {
    let p = pilot([{ habitId: 'focus_top3', intensity: 'standard' }]);
    const { kind, target } = P.progressKind(p, 'focus_top3', 1);
    expect(kind).toBe('count');
    expect(target).toBeGreaterThan(1);
    p = P.count(p, 'focus_top3', 1, 1).program;
    expect([xp(p), P.isDone(p, 'focus_top3', 1)]).toEqual([5, false]);
    p = P.setProgress(p, 'focus_top3', 1, target!).program;
    expect([xp(p), P.isDone(p, 'focus_top3', 1)]).toEqual([30, true]);
    // Undo goes back to one below the target: partial again.
    p = P.undo(p, 'focus_top3', 1).program;
    expect([xp(p), readTrack(log(p, 1), 'focus_top3').count]).toEqual([5, target! - 1]);
    p = P.setProgress(p, 'focus_top3', 1, null).program;
    expect([xp(p), readTrack(log(p, 1), 'focus_top3').count]).toEqual([0, 0]);
  });

  it('a skip and logged progress replace each other', () => {
    let p = P.setProgress(one('sleep_wake'), 'sleep_wake', 1, 1).program;
    p = P.setSkipped(p, 'sleep_wake', 1, true).program;
    expect([xp(p), readTrack(log(p, 1), 'sleep_wake').progress]).toEqual([0, undefined]);
    p = P.setProgress(p, 'sleep_wake', 1, 1).program;
    expect([xp(p), readTrack(log(p, 1), 'sleep_wake').skipped]).toEqual([5, undefined]);
  });
});

describe('Partial progress: undo restores the partially completed state', () => {
  it('keeps the partial label’s data (progress, not done, not skipped) through complete and undo', () => {
    for (const [id, value] of [
      ['mind_read', 10],
      ['sleep_wake', null],
    ] as const) {
      let p = one(id);
      p = value === null ? P.setPartial(p, id, 1, true).program : P.setProgress(p, id, 1, value).program;
      const before = P.trackOf(p, id, 1).progress;
      p = P.complete(p, id, 1).program;
      p = P.undo(p, id, 1).program;
      const t = P.trackOf(p, id, 1);
      expect([P.isDone(p, id, 1), t.progress, t.skipped, xp(p)]).toEqual([false, before, undefined, 5]);
    }
  });
});

describe('Partial progress: streaks, full days and rest days', () => {
  it('never counts toward the streak, a full day or the daily bonus', () => {
    let p = pilot([
      { habitId: 'sleep_wake', intensity: 'starter' },
      { habitId: 'mind_read', intensity: 'starter' },
    ]);
    for (const day of [1, 2]) {
      p = P.setProgress(p, 'sleep_wake', day, 1).program;
      p = P.setProgress(p, 'mind_read', day, 1).program;
    }
    expect(P.dayFull(p, 1)).toBe(false);
    expect(P.dayResult(p, 1)).toBe('missed');
    expect(P.pilotStreak(p, 3)).toBe(0);
    expect(xp(p)).toBe(4 * 5);
    // The same days completed: the streak and bonus come from completion alone.
    for (const day of [1, 2]) {
      p = P.complete(p, 'sleep_wake', day).program;
      p = P.complete(p, 'mind_read', day).program;
    }
    expect(P.pilotStreak(p, 3)).toBe(2);
    expect(xp(p)).toBe(2 * (2 * 10 + 20));
  });

  it('is not logged on a resting day (a weekly goal already met)', () => {
    let p = one('skill_practice');
    let day = 1;
    while (P.stateOn(p, 'skill_practice', day) !== 'goal-met' && day < 7) {
      p = P.complete(p, 'skill_practice', day).program;
      day++;
    }
    expect(P.stateOn(p, 'skill_practice', day)).toBe('goal-met');
    const r = P.setProgress(p, 'skill_practice', day, 10);
    expect(r.program).toBe(p);
    // An open weekly day takes it, and it doesn't credit the week.
    const fresh = one('skill_practice');
    const logged = P.setProgress(fresh, 'skill_practice', 1, 5).program;
    expect(xp(logged)).toBe(5);
    expect(P.weekProgress(logged, 'skill_practice', 1)?.credited).toBe(0);
  });
});

describe('Partial progress: persistence', () => {
  const FORMAT: SaveFormat = { version: 1, migrate: (s) => s };

  it('survives a save and a backup restore with the same XP', () => {
    let p = P.setProgress(one('mind_read'), 'mind_read', 1, 5).program;
    p = P.setProgress(p, 'mind_read', 2, 1).program;
    const saved = JSON.parse(JSON.stringify(p)) as P.PilotProgram;
    expect(xp(saved)).toBe(xp(p));
    const file = JSON.stringify(
      buildExport({
        program: p,
        saveVersion: 1,
        journeys: [],
        today: 3,
        themePreference: 'system',
        reminders: DEFAULT_REMINDERS,
        comebacks: true,
        recoveryCopies: [],
        now: new Date('2026-11-04T09:00:00Z'),
      }),
    );
    const r = readBackup(file, FORMAT);
    expect(r.ok).toBe(true);
    if (r.ok) expect([r.backup.program, xp(r.backup.program)]).toEqual([p, 10]);
  });

  it('older saves keep their XP, and damaged progress is ignored', () => {
    const p = one('eat_well');
    const key = dateForDay(p.startedAt, 1);
    // A counter tapped before partial progress existed: no progress recorded, so no new XP.
    const old: DayLog = {
      day: 1,
      date: key,
      completed: [],
      planned: ['eat_well'],
      track: { eat_well: { v: 1, count: 1 } },
    };
    expect(xp({ ...p, logs: { [key]: old } })).toBe(0);
    const damaged: DayLog = { ...old, track: { eat_well: { v: 1, progress: { value: -3 } } } };
    expect(readTrack(damaged, 'eat_well').progress).toEqual({});
    expect(
      readTrack({ ...old, track: { eat_well: { v: 1, progress: 'x' as never } } }, 'eat_well').progress,
    ).toBeUndefined();
  });
});
