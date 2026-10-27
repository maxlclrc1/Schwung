import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import { dayQualifies, isFullDay, totalXp } from '../progression';
import { RESET_BY_ID } from '../reset/habits';
import {
  activeMinutes,
  activeMs,
  createTimer,
  hasTimer,
  pause,
  progress,
  remainingInBlockMs,
  reset,
  resume,
  settle,
  start,
  timerBlocks,
  wallClockMs,
  type TimerRun,
} from '../reset/timer';
import {
  confirmDone,
  countProgress,
  dayStatus,
  decrement,
  editSession,
  increment,
  loadTimer,
  logSession,
  readTrack,
  recoveryNote,
  saveTimer,
  setCount,
  skip,
  undoDone,
  undoSession,
  unskip,
  type At,
} from '../reset/tracking';
import { erasFor, weekSummary } from '../reset/weekly';
import type { DayLog } from '../types';
import { sanitize } from '../../store/migrate';

// Node's file APIs, typed locally like the channel tests do (the project has no Node type definitions).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync(dir: string): string[];
  statSync(p: string): { isDirectory(): boolean };
  readFileSync(file: string, encoding: 'utf8'): string;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };
declare const __dirname: string;

const MON = '2026-11-02'; // Day 1 is a Monday
const at = (day: number, planned: string[] = []): At => ({ startKey: MON, day, planned });
const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 2, 9, 0); // 09:00 UTC on Day 1
type Logs = Record<string, DayLog>;
const focus25 = RESET_BY_ID.focus_deepwork.targets.standard.foundation; // 25 min

describe('quick completion (a swipe)', () => {
  it('completes once on the person’s word; doing it again changes nothing', () => {
    let r = confirmDone({}, at(1, ['mind_read']), 'mind_read');
    expect(r.event).toEqual({ kind: 'completed', first: true });
    expect(dayStatus(r.logs, MON, 1, 'mind_read')).toBe('completed');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'mind_read').by).toBe('manual');
    const again = confirmDone(r.logs, at(1), 'mind_read');
    expect(again.event).toBeNull();
    expect(again.logs[dateForDay(MON, 1)].completed).toEqual(['mind_read']);
    r = undoDone(r.logs, at(1), 'mind_read');
    expect(r.event).toEqual({ kind: 'uncompleted' });
    expect(dayStatus(r.logs, MON, 1, 'mind_read')).toBe('incomplete');
    // Completing again after an undo isn't the day's first completion (no second celebration).
    expect(confirmDone(r.logs, at(1), 'mind_read').event).toEqual({ kind: 'completed', first: false });
  });

  it('keeps an existing day’s planned list and other habits as they are', () => {
    const date = dateForDay(MON, 1);
    const logs: Logs = {
      [date]: { day: 1, date, completed: ['discipline_bed'], planned: ['discipline_bed', 'mind_read'] },
    };
    const r = confirmDone(logs, at(1, ['ignored']), 'mind_read');
    expect(r.logs[date]).toMatchObject({
      planned: ['discipline_bed', 'mind_read'],
      completed: ['discipline_bed', 'mind_read'],
    });
  });

  it('tells unrecorded, incomplete, skipped and completed apart', () => {
    expect(dayStatus({}, MON, 1, 'mind_read')).toBe('unrecorded');
    // An undo or unskip of nothing doesn't invent a record.
    expect(undoDone({}, at(1), 'mind_read').logs).toEqual({});
    expect(unskip({}, at(1), 'mind_read').logs).toEqual({});
    let r = skip({}, at(1), 'mind_read');
    expect(dayStatus(r.logs, MON, 1, 'mind_read')).toBe('skipped');
    r = unskip(r.logs, at(1), 'mind_read');
    expect(dayStatus(r.logs, MON, 1, 'mind_read')).toBe('incomplete');
    // Completing clears a skip; a completed habit can't be skipped.
    r = confirmDone(skip({}, at(1), 'mind_read').logs, at(1), 'mind_read');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'mind_read').skipped).toBeUndefined();
    expect(dayStatus(skip(r.logs, at(1), 'mind_read').logs, MON, 1, 'mind_read')).toBe('completed');
  });
});

describe('counters', () => {
  const ID = 'focus_top3';

  it('count up and down, never below zero, and show progress apart from completion', () => {
    let r = increment({}, at(1), ID, 3);
    r = increment(r.logs, at(1), ID, 3);
    expect(dayStatus(r.logs, MON, 1, ID)).toBe('incomplete');
    expect(countProgress(r.logs, MON, 1, ID, 3)).toBeCloseTo(2 / 3);
    r = decrement(decrement(decrement(r.logs, at(1), ID, 3).logs, at(1), ID, 3).logs, at(1), ID, 3);
    expect(readTrack(r.logs[dateForDay(MON, 1)], ID).count).toBe(0);
    expect(setCount({}, at(1), ID, -4, 3).logs[dateForDay(MON, 1)].track?.[ID].count).toBe(0);
  });

  it('completes at the target once; crossing it again is never a second event', () => {
    let logs: Logs = {};
    const events: unknown[] = [];
    for (const step of [+1, +1, +1, +1, -1, -1, +1, +1]) {
      const r = step > 0 ? increment(logs, at(1), ID, 3) : decrement(logs, at(1), ID, 3);
      logs = r.logs;
      if (r.event) events.push(r.event);
    }
    // 1, 2, 3 (completed), 4, 3, 2 (un-completed: a correction), 3 (completed again, not first), 4.
    expect(events).toEqual([
      { kind: 'completed', first: true },
      { kind: 'uncompleted' },
      { kind: 'completed', first: false },
    ]);
    expect(logs[dateForDay(MON, 1)].completed.filter((x) => x === ID)).toHaveLength(1);
  });

  it('never undoes a completion the person confirmed themselves', () => {
    let r = confirmDone({}, at(1), 'social_reach_out');
    r = increment(r.logs, at(1), 'social_reach_out', 2);
    r = decrement(r.logs, at(1), 'social_reach_out', 2);
    expect(dayStatus(r.logs, MON, 1, 'social_reach_out')).toBe('completed');
  });

  it('needs no task names or contact names', () => {
    expect(Object.keys(readTrack(increment({}, at(1), ID, 3).logs[dateForDay(MON, 1)], ID)).sort()).toEqual([
      'count',
      'v',
    ]);
  });
});

describe('timers', () => {
  it('exist only for the five timed habits', () => {
    expect(Object.keys(RESET_BY_ID).filter(hasTimer).sort()).toEqual([
      'focus_deepwork',
      'home_tidy',
      'mind_read',
      'move_walk',
      'skill_practice',
    ]);
    expect(createTimer('focus_top3', 1, RESET_BY_ID.focus_top3.targets.standard.foundation)).toBeNull();
    expect(createTimer('strength_log', 1, RESET_BY_ID.strength_log.targets.standard.foundation)).toBeNull();
  });

  it('start, pause, resume and reset, counting active time apart from wall-clock time', () => {
    let t = createTimer('focus_deepwork', 1, focus25)!;
    t = start(t, T0, 1);
    t = pause(t, T0 + 10 * MIN, 1);
    expect(activeMs(t, T0 + 30 * MIN)).toBe(10 * MIN); // paused: no time added
    expect(wallClockMs(t, T0 + 30 * MIN)).toBe(30 * MIN);
    t = resume(t, T0 + 30 * MIN, 1);
    expect(activeMinutes(t, T0 + 40 * MIN)).toBe(20);
    expect(progress(t, T0 + 40 * MIN)).toBeCloseTo(20 / 25);
    expect(remainingInBlockMs(t, T0 + 40 * MIN)).toBe(5 * MIN);
    t = reset(t);
    expect([t.status, activeMs(t, T0 + 50 * MIN), wallClockMs(t, T0 + 50 * MIN)]).toEqual(['idle', 0, 0]);
  });

  it('finishes at the target and never counts past it', () => {
    let t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    t = settle(t, T0 + 26 * MIN, 1);
    expect(t.status).toBe('finished');
    expect(activeMs(t, T0 + 90 * MIN)).toBe(25 * MIN);
  });

  it('keeps counting through backgrounding, and survives a process restart (saved and reloaded)', () => {
    let logs: Logs = {};
    const t = start(createTimer('mind_read', 1, RESET_BY_ID.mind_read.targets.standard.foundation)!, T0, 1); // 20 min
    logs = saveTimer(logs, at(1), t, T0 + MIN).logs;
    // The app is killed; it restarts 12 minutes later. The saved logs are all there is.
    const reloaded = JSON.parse(JSON.stringify(logs)) as Logs;
    const back = loadTimer(reloaded, MON, 1, 'mind_read', T0 + 12 * MIN, 1)!;
    expect([back.status, activeMinutes(back, T0 + 12 * MIN)]).toEqual(['running', 12]);
    expect(dayStatus(reloaded, MON, 1, 'mind_read')).toBe('incomplete');
    // Reopened after the target: it completes once, with its minutes.
    const done = saveTimer(reloaded, at(1), back, T0 + 21 * MIN);
    expect(done.event).toEqual({ kind: 'completed', first: true });
    expect(readTrack(done.logs[dateForDay(MON, 1)], 'mind_read')).toMatchObject({ by: 'timer', minutes: 20 });
    // Saving the finished timer again (another tab, another reopen) adds nothing.
    expect(saveTimer(done.logs, at(1), back, T0 + 30 * MIN).event).toBeNull();
  });

  it('expires on a later day without completing, and without counting the unknown stretch', () => {
    let t = start(createTimer('home_tidy', 1, RESET_BY_ID.home_tidy.targets.standard.foundation)!, T0, 1); // 10 min
    t = pause(t, T0 + 4 * MIN, 1);
    t = resume(t, T0 + 5 * MIN, 1);
    const r = saveTimer({}, at(2), t, T0 + 24 * 60 * MIN); // reopened the next day
    const track = readTrack(r.logs[dateForDay(MON, 1)], 'home_tidy');
    expect(r.event).toBeNull();
    expect(track.timer?.status).toBe('expired');
    expect(track.minutes).toBe(4); // only what was banked before the open stretch
    expect(dayStatus(r.logs, MON, 1, 'home_tidy')).toBe('incomplete');
  });

  it('treats a clock moved backwards as no time, never negative', () => {
    const t = start(createTimer('move_walk', 1, RESET_BY_ID.move_walk.targets.standard.foundation)!, T0, 1);
    expect(activeMs(t, T0 - 5 * MIN)).toBe(0);
  });

  it('never makes a duplicate completion when a swipe and the timer both complete', () => {
    let r = confirmDone({}, at(1), 'skill_practice');
    const t = start(createTimer('skill_practice', 1, RESET_BY_ID.skill_practice.targets.standard.foundation)!, T0, 1);
    r = saveTimer(r.logs, at(1), t, T0 + 25 * MIN);
    expect(r.event).toBeNull();
    expect(r.logs[dateForDay(MON, 1)].completed).toEqual(['skill_practice']);
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'skill_practice')).toMatchObject({ by: 'manual', minutes: 20 });
  });

  it('keeps partial timer progress apart from completion', () => {
    const t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    const r = saveTimer({}, at(1), pause(t, T0 + 10 * MIN, 1), T0 + 10 * MIN);
    expect(r.event).toBeNull();
    expect(dayStatus(r.logs, MON, 1, 'focus_deepwork')).toBe('incomplete');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'focus_deepwork').minutes).toBe(10);
  });

  it('splits 90 minutes into 2 × 45 for 16–17, and for adults only if they choose', () => {
    const ninety = RESET_BY_ID.focus_deepwork.targets.challenge.mastery;
    expect(timerBlocks(ninety, { teen: true })).toEqual([45, 45]);
    expect(timerBlocks(ninety)).toEqual([90]);
    expect(timerBlocks(ninety, { split: true })).toEqual([45, 45]);
    expect(timerBlocks(focus25, { teen: true })).toEqual([25]);
    // Between blocks the timer waits for the person; the whole target completes after the last block.
    let t = start(createTimer('focus_deepwork', 1, ninety, { teen: true })!, T0, 1);
    t = settle(t, T0 + 46 * MIN, 1);
    expect([t.status, t.block, activeMinutes(t, T0 + 60 * MIN)]).toEqual(['between-blocks', 1, 45]);
    t = start(t, T0 + 60 * MIN, 1);
    expect(settle(t, T0 + 105 * MIN, 1).status).toBe('finished');
  });

  it('completes manually with no timer at all', () => {
    expect(confirmDone({}, at(1), 'move_walk', 30).logs[dateForDay(MON, 1)].track?.move_walk).toMatchObject({
      by: 'manual',
      minutes: 30,
    });
  });
});

describe('Strength Training sessions', () => {
  const ID = 'strength_log';

  it('credits one session a day; logging again only updates the details', () => {
    let r = logSession({}, at(1), ID, { type: 'upper' });
    expect(r.event).toEqual({ kind: 'completed', first: true });
    r = logSession(r.logs, at(1), ID, { minutes: 45 });
    expect(r.event).toBeNull();
    expect(r.logs[dateForDay(MON, 1)].completed).toEqual([ID]);
    expect(readTrack(r.logs[dateForDay(MON, 1)], ID).session).toEqual({ type: 'upper', minutes: 45 });
  });

  it('corrects and undoes sessions; invalid details are ignored', () => {
    let r = logSession({}, at(1), ID);
    r = editSession(r.logs, at(1), ID, { type: 'lower', minutes: 9999 });
    expect(readTrack(r.logs[dateForDay(MON, 1)], ID).session).toEqual({ type: 'lower' });
    expect(editSession({}, at(2), ID, { type: 'upper' }).logs).toEqual({});
    r = undoSession(r.logs, at(1), ID);
    expect(dayStatus(r.logs, MON, 1, ID)).toBe('incomplete');
    expect(readTrack(r.logs[dateForDay(MON, 1)], ID).session).toBeUndefined();
  });

  it('allows consecutive days, with an informational note only', () => {
    let logs = logSession({}, at(1), ID).logs;
    expect(recoveryNote(logs, MON, 2, ID)).toBe(true);
    logs = logSession(logs, at(2), ID).logs;
    expect(dayStatus(logs, MON, 2, ID)).toBe('completed');
    expect(recoveryNote(logs, MON, 4, ID)).toBe(false);
  });

  it('counts toward the right flexible weekly quota, with rest days never missed', () => {
    const eras = erasFor(ID, [{ fromDay: 1, intensity: 'standard', phase: 'momentum' }]); // 3 a week
    let logs: Logs = {};
    for (const d of [1, 1, 3, 5]) logs = logSession(logs, at(d), ID).logs; // a duplicate on Monday
    const week = weekSummary(ID, eras, logs, { startKey: MON }, 1, 8);
    expect(week).toMatchObject({ goal: 3, credited: 3, extra: 0, status: 'achieved' });
    for (const d of [2, 4, 6, 7]) expect(dayStatus(logs, MON, d, ID)).toBe('unrecorded');
  });
});

describe('persistence and compatibility', () => {
  it('reads damaged tracking details defensively', () => {
    const date = dateForDay(MON, 1);
    const log = {
      day: 1,
      date,
      completed: [],
      planned: [],
      track: {
        x: { v: 1, by: 'hacked', count: -3, minutes: 'ten', skipped: 'yes', session: { type: 'legs', minutes: 30 } },
      },
    } as unknown as DayLog;
    expect(readTrack(log, 'x')).toEqual({ v: 1, session: { minutes: 30 } });
    expect(readTrack(undefined, 'x')).toEqual({ v: 1 });
  });

  it('loads old saves exactly as before, and keeps tracking details through a reload', () => {
    const date = dateForDay(MON, 1);
    const old: Logs = {
      [date]: { day: 1, date, completed: ['discipline_bed'], planned: ['discipline_bed', 'mind_read'] },
    };
    const saved = {
      startedAt: MON,
      plan: [{ habitId: 'discipline_bed', level: 'easy', addedOnDay: 1, levelSince: 0 }],
      logs: old,
    };
    expect((sanitize(JSON.parse(JSON.stringify(saved))).logs as Logs)[date]).toEqual(old[date]);
    const tracked = increment(old, at(1), 'mind_read', 3).logs;
    const back = sanitize(JSON.parse(JSON.stringify({ ...saved, logs: tracked }))).logs as Logs;
    expect(readTrack(back[date], 'mind_read').count).toBe(1);
  });

  it('leaves XP, the 80% rule and full days exactly as the completed list says', () => {
    const date = dateForDay(MON, 1);
    const base: Logs = { [date]: { day: 1, date, completed: ['a', 'b'], planned: ['a', 'b', 'c'] } };
    let logs = setCount(base, at(1), 'c', 1, 3).logs; // partial progress on c
    logs = saveTimer(logs, at(1), start(createTimer('mind_read', 1, focus25)!, T0, 1), T0 + MIN).logs;
    expect(totalXp(logs)).toBe(totalXp(base));
    expect([isFullDay(logs[date]), dayQualifies(logs[date])]).toEqual([
      isFullDay(base[date]),
      dayQualifies(base[date]),
    ]);
  });

  it('records against the same local date keys as the weekly scheduling, across clock changes', () => {
    // A program over the EU clock change (Sunday 2026-10-25): days stay one date each.
    const start = '2026-10-19';
    const r = confirmDone({}, { startKey: start, day: 7, planned: [] }, 'mind_read');
    expect(Object.keys(r.logs)).toEqual(['2026-10-25']);
    expect(dayStatus(r.logs, start, 7, 'mind_read')).toBe('completed');
  });

  it('isn’t used by the app: nothing outside src/core imports the Life Reset modules', () => {
    const root = path.join(__dirname, '../..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) {
          if (f !== '__tests__' && f !== 'reset') walk(p);
        } else if (/\.tsx?$/.test(f)) files.push(p);
      }
    };
    walk(root);
    const users = files.filter((f) =>
      /from '[^']*reset\/(habits|weekly|timer|tracking)'/.test(fs.readFileSync(f, 'utf8')),
    );
    // Only the type-only reference in core/types.ts (an optional log field the app never reads).
    expect(users.map((f) => path.relative(root, f))).toEqual(['core/types.ts']);
    expect(fs.readFileSync(path.join(root, 'core/types.ts'), 'utf8')).toContain(
      "import type { HabitTrack } from './reset/tracking';",
    );
  });
});

// A timer type check, so a future change to TimerRun shows up here.
const _shape: TimerRun = {
  v: 1,
  habitId: 'x',
  day: 1,
  blocks: [1],
  block: 0,
  status: 'idle',
  bankedMs: 0,
  finishedMs: 0,
};
void _shape;
