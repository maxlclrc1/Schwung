import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import { dayQualifies, isFullDay, totalXp } from '../progression';
import { RESET_BY_ID } from '../reset/habits';
import {
  activeMinutes,
  activeMs,
  createTimer,
  hasTimer,
  localDayEnd,
  needsCheck,
  pause,
  progress,
  remainingInBlockMs,
  reset,
  resume,
  settle,
  start,
  TIMER_GRACE_MIN,
  timerBlocks,
  wallClockMs,
  type TimerRun,
} from '../reset/timer';
import { clearWeekly, recordWeekly, weeklyHistory, weeklyMeasure } from '../reset/measures';
import {
  confirmDone,
  confirmTimer,
  doneShare,
  observation,
  recordAmount,
  SKIP_RULES,
  tally,
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
import { sanitizePilotProgram } from '../reset/pilot';

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

  it('reaches the target as ready to confirm, never completed, and never counts past it', () => {
    let t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    t = settle(t, T0 + 26 * MIN, 1);
    expect([t.status, t.readyAt]).toEqual(['ready', T0 + 25 * MIN]);
    expect(activeMs(t, T0 + 90 * MIN)).toBe(25 * MIN);
    // A ready timer can't be started again (reset starts over).
    expect(start(t, T0 + 30 * MIN, 1).status).toBe('ready');
    expect(reset(t).status).toBe('idle');
  });

  it('keeps counting through backgrounding and a process restart; completion waits for the person', () => {
    let logs: Logs = {};
    const t = start(createTimer('mind_read', 1, RESET_BY_ID.mind_read.targets.standard.foundation)!, T0, 1); // 20 min
    logs = saveTimer(logs, at(1), t, T0 + MIN).logs;
    // The app is killed; it restarts 12 minutes later. The saved logs are all there is.
    const reloaded = JSON.parse(JSON.stringify(logs)) as Logs;
    const back = loadTimer(reloaded, MON, 1, 'mind_read', T0 + 12 * MIN, 1)!;
    expect([back.status, activeMinutes(back, T0 + 12 * MIN)]).toEqual(['running', 12]);
    // Reopened after the target: ready to confirm, with its minutes, and not completed.
    const ready = saveTimer(reloaded, at(1), back, T0 + 21 * MIN);
    expect(ready.event).toBeNull();
    expect(dayStatus(ready.logs, MON, 1, 'mind_read')).toBe('incomplete');
    expect(readTrack(ready.logs[dateForDay(MON, 1)], 'mind_read')).toMatchObject({ minutes: 20 });
    expect(readTrack(ready.logs[dateForDay(MON, 1)], 'mind_read').timer?.status).toBe('ready');
    // One tap (or the swipe) confirms it, once.
    const done = confirmTimer(ready.logs, at(1), 'mind_read');
    expect(done.event).toEqual({ kind: 'completed', first: true });
    expect(readTrack(done.logs[dateForDay(MON, 1)], 'mind_read')).toMatchObject({ by: 'timer', minutes: 20 });
    expect(confirmDone(done.logs, at(1), 'mind_read').event).toBeNull();
    expect(saveTimer(done.logs, at(1), back, T0 + 30 * MIN).event).toBeNull();
    expect(done.logs[dateForDay(MON, 1)].completed).toEqual(['mind_read']);
  });

  it('awards nothing for a Daily Movement timer that just ran: only a confirmation completes it', () => {
    const walk = RESET_BY_ID.move_walk.targets.standard.foundation; // 20 min
    const t = start(createTimer('move_walk', 1, walk)!, T0, 1);
    const r = saveTimer({}, at(1), t, T0 + 3 * 60 * MIN);
    expect([r.event, dayStatus(r.logs, MON, 1, 'move_walk')]).toEqual([null, 'incomplete']);
    expect(totalXp(r.logs)).toBe(0);
  });

  it('treats a clock moved backwards as no time, never negative', () => {
    const t = start(createTimer('move_walk', 1, RESET_BY_ID.move_walk.targets.standard.foundation)!, T0, 1);
    expect(activeMs(t, T0 - 5 * MIN)).toBe(0);
  });

  it('never makes a duplicate completion when a swipe and the timer both happen', () => {
    let r = confirmDone({}, at(1), 'skill_practice');
    const t = start(createTimer('skill_practice', 1, RESET_BY_ID.skill_practice.targets.standard.foundation)!, T0, 1);
    r = saveTimer(r.logs, at(1), t, T0 + 25 * MIN);
    expect(r.event).toBeNull();
    expect(confirmTimer(r.logs, at(1), 'skill_practice').event).toBeNull();
    expect(r.logs[dateForDay(MON, 1)].completed).toEqual(['skill_practice']);
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'skill_practice')).toMatchObject({ by: 'manual', minutes: 20 });
  });

  it('keeps partial timer progress apart from completion, and lets the person confirm anyway (manual override)', () => {
    const t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    const r = saveTimer({}, at(1), pause(t, T0 + 10 * MIN, 1), T0 + 10 * MIN);
    expect(r.event).toBeNull();
    expect(dayStatus(r.logs, MON, 1, 'focus_deepwork')).toBe('incomplete');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'focus_deepwork').minutes).toBe(10);
    const done = confirmDone(r.logs, at(1), 'focus_deepwork');
    expect(readTrack(done.logs[dateForDay(MON, 1)], 'focus_deepwork')).toMatchObject({ by: 'manual', minutes: 10 });
  });

  it('splits 90 minutes into 2 × 45 for 16–17, and for adults only if they choose', () => {
    const ninety = RESET_BY_ID.focus_deepwork.targets.challenge.mastery;
    expect(timerBlocks(ninety, { teen: true })).toEqual([45, 45]);
    expect(timerBlocks(ninety)).toEqual([90]);
    expect(timerBlocks(ninety, { split: true })).toEqual([45, 45]);
    expect(timerBlocks(focus25, { teen: true })).toEqual([25]);
    // Between blocks the timer waits for the person; the whole target is ready after the last block.
    let t = start(createTimer('focus_deepwork', 1, ninety, { teen: true })!, T0, 1);
    t = settle(t, T0 + 46 * MIN, 1);
    expect([t.status, t.block, activeMinutes(t, T0 + 60 * MIN)]).toEqual(['between-blocks', 1, 45]);
    t = start(t, T0 + 60 * MIN, 1);
    expect(settle(t, T0 + 105 * MIN, 1).status).toBe('ready');
  });

  it('pauses and resumes across a restart without losing or adding time', () => {
    let t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    t = pause(t, T0 + 7 * MIN, 1);
    const saved = JSON.parse(JSON.stringify(t)) as TimerRun;
    t = resume(saved, T0 + 60 * MIN, 1); // an hour paused: none of it counts
    expect(activeMinutes(t, T0 + 63 * MIN)).toBe(10);
  });

  it('completes manually with no timer at all, and takes an optional amount later', () => {
    let r = confirmDone({}, at(1), 'move_walk');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'move_walk')).toMatchObject({ by: 'manual' });
    r = recordAmount(r.logs, at(1), 'move_walk', { value: 35, unit: 'minutes' });
    expect([r.event, readTrack(r.logs[dateForDay(MON, 1)], 'move_walk').amount]).toEqual([
      null,
      { value: 35, unit: 'minutes' },
    ]);
  });
});

describe('midnight', () => {
  // Day 1 ends at local midnight; the boundary is fixed when the timer is created.
  const MIDNIGHT = Date.UTC(2026, 10, 3, 0, 0);
  const late = MIDNIGHT - 10 * MIN; // 23:50

  it('credits time up to midnight to the starting day, stops there, and completes nothing', () => {
    const t = start(createTimer('focus_deepwork', 1, focus25, { dayEndsAt: MIDNIGHT })!, late, 1);
    // Reopened the next morning.
    const r = saveTimer({}, at(2), t, MIDNIGHT + 9 * 60 * MIN);
    const track = readTrack(r.logs[dateForDay(MON, 1)], 'focus_deepwork');
    expect([track.timer?.status, track.minutes, r.event]).toEqual(['day-ended', 10, null]);
    expect(dayStatus(r.logs, MON, 1, 'focus_deepwork')).toBe('incomplete');
    expect(r.logs[dateForDay(MON, 2)]).toBeUndefined(); // nothing carried into the next day
    // It stays on Day 1 for confirmation or correction.
    expect(dayStatus(confirmTimer(r.logs, at(1), 'focus_deepwork').logs, MON, 1, 'focus_deepwork')).toBe('completed');
  });

  it('keeps a target reached before midnight ready, however late the app reopens', () => {
    const t = start(createTimer('focus_deepwork', 1, focus25, { dayEndsAt: MIDNIGHT })!, MIDNIGHT - 30 * MIN, 1);
    const back = settle(t, MIDNIGHT + 30 * 60 * MIN, 3);
    expect([back.status, back.readyAt, activeMinutes(back, MIDNIGHT + 30 * 60 * MIN)]).toEqual([
      'ready',
      MIDNIGHT - 5 * MIN,
      25,
    ]);
  });

  it('keeps the boundary it was created with, whatever the time zone does later', () => {
    // A trip west after starting moves the phone's clock, not the stored midnight.
    const t = start(
      createTimer('mind_read', 1, RESET_BY_ID.mind_read.targets.standard.foundation, { dayEndsAt: MIDNIGHT })!,
      late,
      1,
    );
    const a = settle(t, MIDNIGHT + 3 * 60 * MIN, 1);
    expect([a.status, activeMinutes(a, MIDNIGHT + 3 * 60 * MIN)]).toEqual(['day-ended', 10]);
    // A paused timer also stops at midnight, keeping its time.
    const p = pause(t, late + 5 * MIN, 1);
    expect([settle(p, MIDNIGHT + MIN, 2).status, activeMinutes(settle(p, MIDNIGHT + MIN, 2), MIDNIGHT + MIN)]).toEqual([
      'day-ended',
      5,
    ]);
    // A day-ended timer can't be restarted; reset starts over on the same day.
    expect(start(a, MIDNIGHT + 4 * 60 * MIN, 2).status).toBe('day-ended');
  });

  it('computes the local midnight from the device’s time zone at that moment', () => {
    const end = localDayEnd(T0);
    const d = new Date(end);
    expect([d.getHours(), d.getMinutes(), end > T0, end - T0 <= 24 * 60 * MIN]).toEqual([0, 0, true, true]);
  });

  it('never credits an unplaceable stretch on a timer saved without a boundary', () => {
    let t = start(createTimer('home_tidy', 1, RESET_BY_ID.home_tidy.targets.standard.foundation)!, T0, 1); // 10 min
    t = pause(t, T0 + 4 * MIN, 1);
    t = resume(t, T0 + 5 * MIN, 1);
    const r = saveTimer({}, at(2), t, T0 + 24 * 60 * MIN); // reopened the next day
    const track = readTrack(r.logs[dateForDay(MON, 1)], 'home_tidy');
    expect([track.timer?.status, track.minutes, r.event]).toEqual(['day-ended', 4, null]);
  });
});

describe('forgotten timers', () => {
  it('never complete on their own; a long-unconfirmed ready timer is flagged for a check', () => {
    const t = start(createTimer('focus_deepwork', 1, focus25)!, T0, 1);
    const ready = settle(t, T0 + 26 * MIN, 1);
    expect(needsCheck(ready, T0 + 26 * MIN)).toBe(false);
    expect(needsCheck(ready, T0 + 25 * MIN + 121 * MIN)).toBe(true); // Focus Time: 120 min grace
    // Valid time isn't thrown away: it's still 25 min, still waiting for the person.
    expect([ready.status, activeMinutes(ready, T0 + 10 * 60 * MIN)]).toEqual(['ready', 25]);
    expect(saveTimer({}, at(1), ready, T0 + 10 * 60 * MIN).event).toBeNull();
  });

  it('uses each habit’s configurable grace period (shortest for movement)', () => {
    const walk = settle(
      start(createTimer('move_walk', 1, RESET_BY_ID.move_walk.targets.standard.foundation)!, T0, 1),
      T0 + 21 * MIN,
      1,
    );
    expect(TIMER_GRACE_MIN.move_walk).toBeLessThan(TIMER_GRACE_MIN.focus_deepwork);
    expect(needsCheck(walk, T0 + 20 * MIN + 31 * MIN)).toBe(true);
    expect(needsCheck(walk, T0 + 20 * MIN + 31 * MIN, { move_walk: 60 })).toBe(false);
    expect(
      needsCheck(
        start(createTimer('move_walk', 1, RESET_BY_ID.move_walk.targets.standard.foundation)!, T0, 1),
        T0 + 9 * 60 * MIN,
      ),
    ).toBe(false);
  });
});

describe('counter undo', () => {
  const ID = 'focus_top3';

  it('removes a counter completion, goes back to one below the target, and needs a new tap to complete', () => {
    let logs: Logs = {};
    for (let i = 0; i < 3; i++) logs = increment(logs, at(1), ID, 3).logs;
    expect(dayStatus(logs, MON, 1, ID)).toBe('completed');
    const undone = undoDone(logs, at(1), ID);
    expect(undone.event).toEqual({ kind: 'uncompleted' });
    expect([dayStatus(undone.logs, MON, 1, ID), readTrack(undone.logs[dateForDay(MON, 1)], ID).count]).toEqual([
      'incomplete',
      2,
    ]);
    const again = increment(undone.logs, at(1), ID, 3);
    expect(again.event).toEqual({ kind: 'completed', first: false }); // no second celebration
    expect(again.logs[dateForDay(MON, 1)].completed).toEqual([ID]);
    expect(totalXp(again.logs)).toBe(totalXp(logs));
  });

  it('leaves the count alone when undoing a swiped completion', () => {
    let r = increment({}, at(1), 'social_reach_out', 2);
    r = confirmDone(r.logs, at(1), 'social_reach_out');
    r = undoDone(r.logs, at(1), 'social_reach_out');
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'social_reach_out').count).toBe(1);
  });
});

describe('manual amounts', () => {
  it('are optional, recorded any time, and never change completion', () => {
    let r = recordAmount({}, at(1), 'mind_read', { value: 12, unit: 'pages' });
    expect([r.event, dayStatus(r.logs, MON, 1, 'mind_read')]).toEqual([null, 'incomplete']);
    r = confirmDone(r.logs, at(1), 'mind_read');
    r = recordAmount(r.logs, at(1), 'mind_read', { value: 25, unit: 'minutes' });
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'mind_read').amount).toEqual({ value: 25, unit: 'minutes' });
    // Invalid values are ignored; null clears it.
    expect(
      readTrack(
        recordAmount(r.logs, at(1), 'mind_read', { value: -3, unit: 'minutes' }).logs[dateForDay(MON, 1)],
        'mind_read',
      ).amount,
    ).toEqual({ value: 25, unit: 'minutes' });
    r = recordAmount(r.logs, at(1), 'mind_read', null);
    expect(readTrack(r.logs[dateForDay(MON, 1)], 'mind_read').amount).toBeUndefined();
    expect(dayStatus(r.logs, MON, 1, 'mind_read')).toBe('completed');
  });
});

describe('skips', () => {
  it('keep completed, skipped and unrecorded distinct, with no completion credit for a skip', () => {
    const logs = skip(confirmDone({}, at(1), 'a').logs, at(1), 'b').logs;
    const statuses = ['a', 'b', 'c'].map((id) => dayStatus(logs, MON, 1, id));
    expect(statuses).toEqual(['completed', 'skipped', 'incomplete']);
    expect(dayStatus(logs, MON, 2, 'a')).toBe('unrecorded');
    expect(SKIP_RULES).toEqual({ completionCredit: false, countsAsDoneForReadiness: false, separateFromMisses: true });
  });

  it('never inflate a readiness share, and are counted apart from misses', () => {
    const obs = (['completed', 'completed', 'skipped', 'incomplete', 'unrecorded'] as const).map(observation);
    expect(tally(obs)).toEqual({ done: 2, skipped: 1, missed: 1, unknown: 1 });
    expect(doneShare(obs)).toBe(0.5); // 2 of 4 known days: the skip counts as not done
    expect(doneShare([observation('completed'), observation('completed')])).toBe(1);
    expect(doneShare([observation('unrecorded')])).toBeNull();
  });

  it('leave XP, full days and the 80% rule exactly as before', () => {
    const date = dateForDay(MON, 1);
    const base: Logs = { [date]: { day: 1, date, completed: ['a'], planned: ['a', 'b'] } };
    const skipped = skip(base, at(1), 'b').logs;
    expect([totalXp(skipped), isFullDay(skipped[date]), dayQualifies(skipped[date])]).toEqual([
      totalXp(base),
      isFullDay(base[date]),
      dayQualifies(base[date]),
    ]);
  });
});

describe('weekly Less Scrolling measurement', () => {
  const ID = 'screen_app_limit';

  it('stores a self-reported average for the right program week, and allows edits', () => {
    let m = recordWeekly({}, MON, 3, ID, 150, 'social');
    m = recordWeekly(m, MON, 10, ID, 125);
    expect(weeklyMeasure(m, ID, 1)).toMatchObject({
      week: 1,
      minutesPerDay: 150,
      category: 'social',
      source: 'self-reported',
    });
    expect(weeklyMeasure(m, ID, 2)?.minutesPerDay).toBe(125);
    m = recordWeekly(m, MON, 12, ID, 118); // an edit of week 2
    expect(weeklyMeasure(m, ID, 2)).toMatchObject({ minutesPerDay: 118, edits: 1 });
    expect(weeklyHistory(m, ID).map((x) => x.week)).toEqual([1, 2]);
    expect(weeklyMeasure(clearWeekly(m, ID, 1), ID, 1)).toBeNull();
    // Invalid values change nothing.
    expect(recordWeekly(m, MON, 3, ID, -10)).toBe(m);
  });

  it('allows missing weeks, and never changes completed days', () => {
    let logs: Logs = {};
    for (const d of [1, 2, 3]) logs = confirmDone(logs, at(d), ID).logs;
    const before = JSON.stringify(logs);
    const m = recordWeekly({}, MON, 2, ID, 200);
    expect(JSON.stringify(logs)).toBe(before);
    expect(weeklyMeasure(m, ID, 4)).toBeNull();
    expect(weeklyMeasure(undefined, ID, 1)).toBeNull();
    // A week of completed days with no measure is still a week of completed days.
    const week = weekSummary(ID, [{ fromDay: 1, schedule: { kind: 'daily' } }], logs, { startKey: MON }, 1, 3);
    expect(week.credited).toBe(3);
  });

  it('reads damaged entries as missing', () => {
    expect(weeklyMeasure({ [ID]: { 1: { v: 1, minutesPerDay: 'lots' } as never } }, ID, 1)).toBeNull();
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

  it('keeps tracking details through a save and reload', () => {
    const date = dateForDay(MON, 1);
    const program = {
      v: 1,
      startedAt: MON,
      answers: { age: '30_49', precautions: [], minutesPerDay: 90 },
      habits: ['mind_read', 'focus_top3'],
      progression: Object.fromEntries(
        ['mind_read', 'focus_top3'].map((id) => [
          id,
          { v: 1, habitId: id, eras: [{ intensity: 'starter', phase: 'foundation', fromDay: 1, reason: 'start' }] },
        ]),
      ),
      logs: increment({}, at(1), 'focus_top3', 3).logs,
    };
    const back = sanitizePilotProgram(JSON.parse(JSON.stringify(program)))!;
    expect(readTrack(back.logs[date], 'focus_top3').count).toBe(1);
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
