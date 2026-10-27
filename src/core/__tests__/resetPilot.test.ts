import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import { reconcile, totalXp } from '../progression';
import * as P from '../reset/pilot';
import { readTrack } from '../reset/tracking';
import { habitScene, placeholderCrop } from '../../components/habitArt';
import type { PlanHabit } from '../types';

// 2026-11-02 is a Monday: weeks are Days 1–7, 8–14, 15–21, 22–28…
const MON = '2026-11-02';
const ADULT: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 90, strengthStart: 'sometimes' };
const ALL: P.PilotChoice[] = [
  { habitId: 'mind_read', intensity: 'standard' },
  { habitId: 'focus_deepwork', intensity: 'standard' },
  { habitId: 'strength_log', intensity: 'standard' },
];
const pilot = (a: P.PilotAnswers = ADULT, c: P.PilotChoice[] = ALL, start = MON) => {
  const p = P.createPilot(a, c, start);
  if (!p) throw new Error(P.setupProblems(a, c).join('; '));
  return p;
};
const doneOn = (p: P.PilotProgram, id: string, days: number[]) =>
  days.reduce((x, d) => P.complete(x, id, d).program, p);
const log = (p: P.PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)];
const offerOf = (p: P.PilotProgram, id: string, today: number) =>
  P.offersNow(p, today, false).find((o) => o.habitId === id)?.offer ?? null;
const MIN = 60_000;
const T0 = new Date(2026, 10, 2, 9, 0).getTime(); // Day 1, 09:00 local

describe('pilot setup', () => {
  it('starts the chosen habits at Foundation of each chosen intensity, in card order, with nothing recorded', () => {
    const p = pilot(ADULT, [...ALL].reverse());
    expect(p.habits).toEqual(['mind_read', 'focus_deepwork', 'strength_log']);
    expect(p.logs).toEqual({});
    for (const id of p.habits) expect(P.levelFor(p, id, 1)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(P.targetText(p, 'mind_read', 1)).toBe('Read 20 min');
    expect(P.targetText(p, 'focus_deepwork', 1)).toBe('25 min, phone in another room');
    expect(P.targetText(p, 'strength_log', 1)).toBe('2 sessions a week, about 30 min');
    expect(P.frequencyText(p, 'mind_read', 1)).toBe('Every day');
    expect(P.frequencyText(p, 'focus_deepwork', 1)).toBe('Any 5 days a week');
  });

  it('needs only age, precautions, time, and Strength’s starting point', () => {
    expect(P.setupProblems(ADULT, ALL)).toEqual([]);
    expect(P.setupProblems({ ...ADULT, strengthStart: undefined }, ALL)).toEqual([
      'Strength Training: say where you’re starting from.',
    ]);
    // Without Strength, no strength question.
    expect(P.setupProblems({ ...ADULT, strengthStart: undefined }, ALL.slice(0, 2))).toEqual([]);
    expect(P.setupProblems(ADULT, [])).toContain('Choose at least one habit.');
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 50 }, ALL)).toContain(
      'Say how much time you have on a busy day.',
    );
  });

  it('refuses under-16s entirely', () => {
    expect(P.setupProblems({ ...ADULT, age: 'u16' }, ALL)).toEqual(['Schwung is made for people 16 and older.']);
    expect(P.createPilot({ ...ADULT, age: 'u16' }, ALL, MON)).toBeNull();
  });

  it('keeps the existing age and safety rules for Strength Training', () => {
    const teen = { ...ADULT, age: '16_17' as const };
    expect(P.intensityOptions('strength_log', teen).map((o) => !!o.reason)).toEqual([false, false, true]);
    expect(P.setupProblems(teen, [{ habitId: 'strength_log', intensity: 'challenge' }])[0]).toMatch(/16–17/);
    // Heart, pregnancy, walking difficulty, or an unanswered health question: no Strength at all.
    for (const precautions of [
      ['heart'],
      ['pregnancy'],
      ['walkingDifficult'],
      'unknown',
    ] as P.PilotAnswers['precautions'][])
      expect(P.intensityOptions('strength_log', { ...ADULT, precautions }).every((o) => o.reason)).toBe(true);
    // Joint pain: not Starter (a physiotherapist's routine first).
    const joint = { ...ADULT, precautions: ['joint'] as P.PilotAnswers['precautions'] };
    expect(P.intensityOptions('strength_log', joint).map((o) => !!o.reason)).toEqual([true, false, false]);
    expect(P.habitNotes('strength_log', joint)).toContain(
      'Keep to what your physiotherapist or clinician has advised.',
    );
    // Read and Focus are open to everyone 16+.
    for (const id of ['mind_read', 'focus_deepwork'] as const)
      expect(P.intensityOptions(id, { ...teen, precautions: 'unknown' }).every((o) => !o.reason)).toBe(true);
  });

  it('suggests a starting intensity the person can take', () => {
    expect(P.suggestedIntensity('strength_log', { ...ADULT, strengthStart: 'new' })).toBe('starter');
    expect(P.suggestedIntensity('strength_log', { ...ADULT, strengthStart: 'regular' })).toBe('challenge');
    expect(P.suggestedIntensity('strength_log', { ...ADULT, age: '16_17', strengthStart: 'regular' })).toBe('standard');
    expect(P.suggestedIntensity('strength_log', { ...ADULT, precautions: ['joint'], strengthStart: 'new' })).toBe(
      'standard',
    );
    expect(P.suggestedIntensity('strength_log', { ...ADULT, precautions: ['heart'] })).toBeNull();
    expect(P.suggestedIntensity('mind_read', ADULT)).toBe('standard');
  });

  it('checks the time the person has, on a day all the habits fall on', () => {
    // Standard: Read 20 + Focus 25 + Strength ~30 = 75 min.
    expect(
      P.busiestDayMinutes(
        ALL.map((c) => ({ habitId: c.habitId, level: { intensity: c.intensity, phase: 'foundation' } })),
      ),
    ).toBe(75);
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 60 }, ALL)[0]).toMatch(/75 min .* 60 min/);
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 90 }, ALL)).toEqual([]);
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 45 }, ALL.slice(0, 2))).toEqual([]);
  });

  it('asks Strength at Challenge for the sessions the person already does (2–7), and keeps that number', () => {
    const c: P.PilotChoice[] = [{ habitId: 'strength_log', intensity: 'challenge' }];
    const a = { ...ADULT, strengthStart: 'regular' as const };
    expect(P.setupProblems(a, c)[0]).toMatch(/sessions a week you already do/);
    expect(P.setupProblems({ ...a, ownSessions: 8 }, c)).toHaveLength(1);
    const p = pilot({ ...a, ownSessions: 4 }, c);
    expect(P.targetText(p, 'strength_log', 1)).toBe('4 sessions a week');
    expect(P.weekProgress(p, 'strength_log', 1)?.goal).toBe(4);
  });

  it('shows what each habit would start at, for the review', () => {
    expect(P.previewTarget('focus_deepwork', 'starter', ADULT)).toEqual({
      target: '15 min, phone in another room',
      frequency: 'Any 4 days a week',
    });
  });
});

describe('Read Daily', () => {
  it('completes with a swipe, undoes, and never awards XP twice', () => {
    let p = pilot();
    p = P.complete(p, 'mind_read', 1).program;
    const once = totalXp(p.logs);
    expect(once).toBe(10 + 20); // the day's list is just Read Daily: a full day
    p = P.complete(p, 'mind_read', 1).program;
    expect(totalXp(p.logs)).toBe(once);
    const undone = P.undo(p, 'mind_read', 1);
    expect(undone.event).toEqual({ kind: 'uncompleted' });
    expect(totalXp(undone.program.logs)).toBe(0);
    const again = P.complete(undone.program, 'mind_read', 1);
    // One celebration a day, however often it's corrected.
    expect(again.event).toEqual({ kind: 'completed', first: false });
  });

  it('has an optional timer that is ready to confirm at its target, never completing by itself', () => {
    let p = P.startTimer(pilot(), 'mind_read', 1, T0).program;
    expect(P.timerOn(p, 'mind_read', 1, T0 + 5 * MIN, 1)?.status).toBe('running');
    p = P.pauseTimer(p, 'mind_read', 1, T0 + 5 * MIN).program;
    p = P.startTimer(p, 'mind_read', 1, T0 + 30 * MIN).program; // resume after a break
    const ready = P.settleTimer(p, 'mind_read', 1, T0 + 60 * MIN, 1).program;
    expect(P.timerOn(ready, 'mind_read', 1, T0 + 60 * MIN, 1)).toMatchObject({
      status: 'ready',
      readyAt: T0 + 45 * MIN,
    });
    expect(P.isDone(ready, 'mind_read', 1)).toBe(false);
    expect(totalXp(ready.logs)).toBe(0);
    // Confirming is the same one tap as a swipe, recorded as timer-assisted.
    const confirmed = P.complete(ready, 'mind_read', 1).program;
    expect(readTrack(log(confirmed, 1), 'mind_read')).toMatchObject({ by: 'timer', minutes: 20 });
    // A swipe afterwards changes nothing (no duplicate XP).
    expect(totalXp(P.complete(confirmed, 'mind_read', 1).program.logs)).toBe(totalXp(confirmed.logs));
  });

  it('keeps partial timer progress, and minutes added later never change completion', () => {
    let p = P.startTimer(pilot(), 'mind_read', 1, T0).program;
    p = P.pauseTimer(p, 'mind_read', 1, T0 + 7 * MIN).program;
    expect(readTrack(log(p, 1), 'mind_read').minutes).toBe(7);
    expect(P.isDone(p, 'mind_read', 1)).toBe(false);
    p = P.setMinutes(p, 'mind_read', 1, 25).program;
    expect(readTrack(log(p, 1), 'mind_read').amount).toEqual({ value: 25, unit: 'minutes' });
    expect(P.isDone(p, 'mind_read', 1)).toBe(false);
    p = P.complete(p, 'mind_read', 1).program;
    p = P.setMinutes(p, 'mind_read', 1, null).program;
    expect(P.isDone(p, 'mind_read', 1)).toBe(true);
    expect(readTrack(log(p, 1), 'mind_read').minutes).toBe(7);
    // A reset starts the timer over; the habit stays as it was.
    p = P.resetTimer(p, 'mind_read', 1, T0 + 8 * MIN).program;
    expect(P.timerOn(p, 'mind_read', 1, T0 + 8 * MIN, 1)?.status).toBe('idle');
    expect(P.isDone(p, 'mind_read', 1)).toBe(true);
  });
});

describe('Focus Time', () => {
  it('counts toward a flexible weekly goal; a day without it is never missed', () => {
    let p = pilot(ADULT, ALL.slice(1, 2)); // Focus only: 5 days a week
    expect(P.weekProgress(p, 'focus_deepwork', 1)).toMatchObject({ credited: 0, goal: 5 });
    expect(P.stateOn(p, 'focus_deepwork', 1)).toBe('open');
    p = doneOn(p, 'focus_deepwork', [1, 2, 4, 5, 6]);
    expect(P.weekProgress(p, 'focus_deepwork', 6)).toMatchObject({ credited: 5, goal: 5, status: 'achieved' });
    expect(P.stateOn(p, 'focus_deepwork', 7)).toBe('goal-met');
    // Day 3 (not done) has no record and no list: it's a rest day, not a missed one.
    expect(log(p, 3)).toBeUndefined();
    expect(P.plannedOn(p, 3, [])).toEqual([]);
  });

  it('allows quick completion without the timer, and keeps the 16–17 focus block limit', () => {
    const p = P.complete(pilot(ADULT, ALL.slice(1, 2)), 'focus_deepwork', 1).program;
    expect(readTrack(log(p, 1), 'focus_deepwork').by).toBe('manual');
    const teen: P.PilotProgram = {
      ...pilot({ ...ADULT, age: '16_17' }, [{ habitId: 'focus_deepwork', intensity: 'challenge' }]),
    };
    const mastery: P.PilotProgram = {
      ...teen,
      progression: {
        focus_deepwork: {
          ...teen.progression.focus_deepwork,
          eras: [{ intensity: 'challenge', phase: 'mastery', fromDay: 1, reason: 'start' }],
        },
      },
    };
    expect(P.timerBlocksFor(mastery, 'focus_deepwork', 1)).toEqual([45, 45]);
    expect(P.targetText(mastery, 'focus_deepwork', 1)).toBe('2 × 45 min, phone in another room');
    // An adult keeps one 90-minute block unless they chose to split it.
    const adult = { ...mastery, answers: { ...ADULT } };
    expect(P.timerBlocksFor(adult, 'focus_deepwork', 1)).toEqual([90]);
    expect(P.timerBlocksFor({ ...adult, answers: { ...ADULT, splitFocus: true } }, 'focus_deepwork', 1)).toEqual([
      45, 45,
    ]);
  });

  it('keeps counting in the background and picks up after a restart, from saved timestamps', () => {
    let p = P.startTimer(pilot(), 'focus_deepwork', 1, T0).program;
    // The app is closed; the saved program is all that's left (a restart reloads it from JSON).
    p = JSON.parse(JSON.stringify(p)) as P.PilotProgram;
    expect(Math.round((P.timerOn(p, 'focus_deepwork', 1, T0 + 12 * MIN, 1)!.bankedMs + 12 * MIN) / MIN)).toBe(12);
    const back = P.settleTimer(p, 'focus_deepwork', 1, T0 + 40 * MIN, 1).program;
    expect(P.timerOn(back, 'focus_deepwork', 1, T0 + 40 * MIN, 1)?.status).toBe('ready');
    expect(P.isDone(back, 'focus_deepwork', 1)).toBe(false);
  });

  it('stops a timer left running at local midnight, crediting that day only', () => {
    const late = new Date(2026, 10, 2, 23, 50).getTime();
    let p = P.startTimer(pilot(), 'focus_deepwork', 1, late).program;
    // Reopened the next morning (Day 2).
    p = P.settleTimer(p, 'focus_deepwork', 1, late + 9 * 60 * MIN, 2).program;
    const t = P.timerOn(p, 'focus_deepwork', 1, late + 9 * 60 * MIN, 2)!;
    expect(t.status).toBe('day-ended');
    expect(readTrack(log(p, 1), 'focus_deepwork').minutes).toBe(10);
    expect(P.isDone(p, 'focus_deepwork', 1)).toBe(false);
    expect(log(p, 2)).toBeUndefined();
  });
});

describe('Strength Training', () => {
  it('logs sessions (not exercises), at most one a day, toward the weekly target', () => {
    let p = pilot(ADULT, ALL.slice(2));
    p = P.complete(p, 'strength_log', 1).program;
    p = P.complete(p, 'strength_log', 1).program; // a second log the same day is the same session
    expect(P.weekProgress(p, 'strength_log', 1)).toMatchObject({ credited: 1, goal: 2 });
    expect(totalXp(p.logs)).toBe(30);
    p = P.setSession(p, 1, { type: 'upper', minutes: 35 }).program;
    p = P.setSession(p, 1, { minutes: 40 }).program; // an edit
    expect(readTrack(log(p, 1), 'strength_log').session).toEqual({ type: 'upper', minutes: 40 });
    expect(totalXp(p.logs)).toBe(30);
    // Choosing a detail on a day without a session logs it.
    p = P.setSession(p, 3, { type: 'lower' }).program;
    expect(P.weekProgress(p, 'strength_log', 3)).toMatchObject({ credited: 2, goal: 2, status: 'achieved' });
    // Undo removes the session with its details.
    p = P.undo(p, 'strength_log', 3).program;
    expect(readTrack(log(p, 3), 'strength_log').session).toBeUndefined();
    expect(P.weekProgress(p, 'strength_log', 3)?.credited).toBe(1);
  });

  it('never turns rest days into missed days, and keeps the held exercise programs out', () => {
    const p = P.complete(pilot(ADULT, ALL.slice(2)), 'strength_log', 1).program;
    for (const d of [2, 3, 4]) expect(P.stateOn(p, 'strength_log', d)).toBe('open');
    expect(P.pilotStreak(p, 4)).toBe(1);
    expect(P.PILOT_HABITS).toEqual(['mind_read', 'focus_deepwork', 'strength_log']);
    expect(
      (P.PILOT_HABITS as readonly string[]).some((id) => id.startsWith('move_strength_') || id === 'move_balance'),
    ).toBe(false);
  });
});

describe('the pilot’s day rules (documented: SCHWUNG_LIFE_RESET_PILOT.md)', () => {
  it('lists daily habits every day, and weekly ones only on a day they’re done', () => {
    let p = pilot();
    p = P.complete(p, 'mind_read', 1).program;
    expect(log(p, 1).planned).toEqual(['mind_read']);
    expect(P.dayFull(p, 1)).toBe(true); // Focus and Strength resting don't stop a full day
    p = P.complete(p, 'focus_deepwork', 1).program;
    expect(log(p, 1).planned).toEqual(['mind_read', 'focus_deepwork']);
    expect(totalXp(p.logs)).toBe(20 + 20);
    // A weekly habit done without the daily one: half the day's list, no full-day bonus.
    p = P.complete(p, 'strength_log', 2).program;
    expect(log(p, 2).planned).toEqual(['mind_read', 'strength_log']);
    expect(P.dayFull(p, 2)).toBe(false);
    expect(totalXp(p.logs)).toBe(40 + 10);
  });

  it('keeps a streak through rest days of weekly-only plans, and breaks it on a missed daily habit', () => {
    const weeklyOnly = doneOn(pilot(ADULT, ALL.slice(1)), 'focus_deepwork', [1, 2, 5]);
    expect(P.pilotStreak(weeklyOnly, 5)).toBe(3); // Days 3 and 4 are rest days: neutral
    const withRead = doneOn(doneOn(pilot(), 'mind_read', [1, 2, 4, 5]), 'focus_deepwork', [3]);
    // Day 3: Read not done (Focus done): 1 of 2, under 80%. The streak restarts after it.
    expect(P.pilotStreak(withRead, 5)).toBe(2);
    // An unfinished today never breaks it.
    expect(P.pilotStreak(withRead, 6)).toBe(2);
  });

  it('leaves V1/V2 rules alone: XP is the existing rule; reconcile still raises existing plans', () => {
    const plan: PlanHabit[] = [{ habitId: 'mind_read', level: 'easy', addedOnDay: 1, levelSince: 0 }];
    const r = reconcile({ plan, appliedPhase: 1, startKey: MON, logs: {}, today: 22, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('medium');
    // The pilot itself never rises on Day 22.
    expect(P.levelFor(pilot(), 'mind_read', 22).phase).toBe('foundation');
  });
});

describe('progression in the pilot', () => {
  const readEveryDay = (to: number) =>
    doneOn(
      pilot(),
      'mind_read',
      Array.from({ length: to }, (_, i) => i + 1),
    );

  it('offers Momentum on Day 22 when ready, from tomorrow, and only when accepted', () => {
    const p = readEveryDay(21);
    expect(offerOf(p, 'mind_read', 21)).toBeNull(); // not open yet
    const o = offerOf(p, 'mind_read', 22)!;
    expect(o).toMatchObject({ kind: 'step-up', effectiveDay: 23 });
    const accepted = P.accept(p, 'mind_read', o, 22);
    expect(P.targetText(accepted, 'mind_read', 22)).toBe('Read 20 min');
    expect(P.targetText(accepted, 'mind_read', 23)).toBe('Read 25 min');
    expect(P.pendingText(accepted, 'mind_read', 22)).toBe('Standard Momentum from tomorrow: Read 25 min');
    expect(offerOf(accepted, 'mind_read', 22)).toBeNull(); // nothing while the change waits
    // Weeks the person used the app without doing Focus aren't achieved: Focus is offered a step easier (from next
    // Monday), as a suggestion only. One offer shows at a time, in card order.
    expect(offerOf(p, 'focus_deepwork', 22)).toMatchObject({ kind: 'step-down', effectiveDay: 29 });
    expect(P.currentOffer(p, 22, false)?.habitId).toBe('mind_read');
    // Survives a save and reload.
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(accepted)))).toEqual(accepted);
  });

  it('starts a weekly habit’s step-up next Monday, and respects a decline for 7 days', () => {
    let p = pilot(ADULT, ALL.slice(1, 2));
    p = doneOn(p, 'focus_deepwork', [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19]);
    const o = P.currentOffer(p, 24, false)!;
    expect(o.offer).toMatchObject({ kind: 'step-up', effectiveDay: 29 });
    const declined = P.decline(p, 'focus_deepwork', o.offer, 24);
    const still = doneOn(declined, 'focus_deepwork', [22, 23, 24, 25, 26]); // still consistent
    expect(P.currentOffer(still, 30, false)).toBeNull();
    expect(P.currentOffer(still, 31, false)?.offer).toMatchObject({ kind: 'step-up', effectiveDay: 36 });
  });

  it('never offers a step-up that wouldn’t fit the person’s time', () => {
    const tight = pilot({ ...ADULT, minutesPerDay: 90 });
    // Read Momentum (25) + Focus (25) + Strength (~30) = 80: fits. At 75 min available it wouldn't.
    const ready = doneOn(
      tight,
      'mind_read',
      Array.from({ length: 21 }, (_, i) => i + 1),
    );
    expect(offerOf(ready, 'mind_read', 22)?.kind).toBe('step-up');
    const short = { ...ready, answers: { ...ready.answers, minutesPerDay: 75 } };
    expect(offerOf(short, 'mind_read', 22)).toBeNull();
    expect(P.harder(short, 'mind_read', 22)).toEqual({ blocked: 'it doesn’t fit the time you have' });
  });

  it('lets the person make it easier or harder any time, from the next boundary', () => {
    const p = pilot();
    const e = P.easier(p, 'mind_read', 3);
    if ('blocked' in e) throw new Error(e.blocked);
    expect(P.targetText(e.program, 'mind_read', 3)).toBe('Read 20 min');
    expect(P.targetText(e.program, 'mind_read', 4)).toBe('Read 10 min');
    const h = P.harder(p, 'strength_log', 3);
    if ('blocked' in h) throw new Error(h.blocked);
    expect(P.levelFor(h.program, 'strength_log', 7).phase).toBe('foundation');
    expect(P.levelFor(h.program, 'strength_log', 8).phase).toBe('momentum');
    // Age limits hold for manual changes too.
    const teen = pilot({ ...ADULT, age: '16_17' }, [{ habitId: 'strength_log', intensity: 'standard' }]);
    const atMastery: P.PilotProgram = {
      ...teen,
      progression: {
        strength_log: {
          ...teen.progression.strength_log,
          eras: [{ intensity: 'standard', phase: 'mastery', fromDay: 1, reason: 'start' }],
        },
      },
    };
    expect(P.harder(atMastery, 'strength_log', 50)).toEqual({
      blocked: 'this intensity isn’t offered to 16–17-year-olds',
    });
  });

  it('holds back step-up offers after a recent “too hard”, without lowering anything', () => {
    const p = P.feedback(readEveryDay(21), 'mind_read', 'too-hard', 20);
    expect(offerOf(p, 'mind_read', 22)).toBeNull();
    expect(P.levelFor(p, 'mind_read', 30).phase).toBe('foundation');
  });
});

describe('dates and saves', () => {
  it('uses local date keys, so clock changes never move a pilot day', () => {
    // A program across the EU clock change (25 Oct 2026).
    let p = pilot(ADULT, ALL.slice(0, 1), '2026-10-20');
    p = doneOn(p, 'mind_read', [5, 6, 7]);
    expect(Object.keys(p.logs).sort()).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    expect(P.pilotStreak(p, 7)).toBe(3);
  });

  it('reads saves defensively: a damaged program is dropped, damaged days are repaired or left out', () => {
    const p = P.complete(pilot(), 'mind_read', 1).program;
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(P.sanitizePilotProgram({ ...p, v: 2 })).toBeNull();
    expect(P.sanitizePilotProgram({ ...p, startedAt: 'yesterday' })).toBeNull();
    expect(P.sanitizePilotProgram({ ...p, progression: { mind_read: { v: 1 } } })).toBeNull();
    expect(P.sanitizePilotProgram({ ...p, habits: ['move_strength_session'] })).toBeNull();
    const damaged = { ...p, logs: { ...p.logs, nope: { day: 1 }, '2026-11-03': { day: 2, completed: 'x' } } };
    expect(P.sanitizePilotProgram(damaged)?.logs['2026-11-03']).toMatchObject({ completed: [], planned: [] });
    expect(P.sanitizePilotProgram(damaged)?.logs.nope).toBeUndefined();
  });
});

describe('cards in light and dark', () => {
  it('uses the existing Reading and Focused Work scenes, and a world crop for Strength', () => {
    for (const theme of ['light', 'dark'] as const) {
      expect(habitScene('mind_read', theme)).toBeTruthy();
      expect(habitScene('focus_deepwork', theme)).toBeTruthy();
      expect(habitScene('strength_log', theme)).toBeUndefined();
    }
    expect(placeholderCrop('strength_log')).toBeDefined();
    expect(placeholderCrop('strength_log')).toEqual(placeholderCrop('strength_log'));
  });
});
