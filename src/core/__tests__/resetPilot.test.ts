import { describe, expect, it } from '@jest/globals';
import { habitScene, placeholderCrop } from '../../components/habitArt';
import { dateForDay } from '../dates';
import { reconcile, totalXp } from '../progression';
import { HELD_EXERCISE_PROGRAMMES, RESET_HABITS } from '../reset/habits';
import * as P from '../reset/pilot';
import { readTrack } from '../reset/tracking';
import type { PlanHabit } from '../types';

// 2026-11-02 is a Monday: weeks are Days 1–7, 8–14, 15–21, 22–28… Day 6 is a Saturday.
const MON = '2026-11-02';
const ADULT: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 180,
  strengthStart: 'sometimes',
  phone: '4_6',
  pullMinutes: 120,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
};
const THREE: P.PilotChoice[] = [
  { habitId: 'mind_read', intensity: 'standard' },
  { habitId: 'focus_deepwork', intensity: 'standard' },
  { habitId: 'strength_log', intensity: 'standard' },
];
const pilot = (c: P.PilotChoice[] = THREE, a: P.PilotAnswers = ADULT, start = MON) => {
  const p = P.createPilot(a, c, start);
  if (!p) throw new Error(P.setupProblems(a, c).join('; '));
  return p;
};
const one = (habitId: string, intensity: P.PilotChoice['intensity'] = 'starter', a = ADULT) =>
  pilot([{ habitId, intensity }], a);
const doneOn = (p: P.PilotProgram, id: string, days: number[]) =>
  days.reduce((x, d) => P.complete(x, id, d).program, p);
const log = (p: P.PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)];
const offerOf = (p: P.PilotProgram, id: string, today: number) =>
  P.offersNow(p, today, false).find((o) => o.habitId === id)?.offer ?? null;

describe('all 11 habits', () => {
  it('are the approved catalog, in its order, with their ids unchanged', () => {
    expect(P.PILOT_HABITS).toEqual([
      'focus_deepwork',
      'screen_app_limit',
      'focus_top3',
      'mind_read',
      'confidence_talk',
      'move_walk',
      'sleep_wake',
      'home_tidy',
      'skill_practice',
      'social_reach_out',
      'strength_log',
    ]);
    expect(P.PILOT_HABITS).toEqual(RESET_HABITS.map((h) => h.id));
    // The held exercise programmes are never among them.
    for (const id of HELD_EXERCISE_PROGRAMMES) expect(P.isPilotHabit(id)).toBe(false);
  });

  it('say what to do and how much, at Starter Foundation (no timers, just the target)', () => {
    const say = (id: string) => P.targetText(one(id), id, 1);
    expect(say('focus_deepwork')).toBe('Focus for 15 minutes, phone in another room');
    expect(say('screen_app_limit')).toBe('Keep your main app under 1 h 45 today'); // 120 − 15, to 15 min
    expect(say('focus_top3')).toBe('Finish your #1 task');
    expect(say('mind_read')).toBe('Read for 10 minutes');
    expect(P.socialSteps(one('confidence_talk'), 1).map((s) => s.text)).toContain(say('confidence_talk'));
    expect(say('move_walk')).toBe('Move for 10 minutes, any way you like');
    expect(say('sleep_wake')).toBe('Up by 08:00'); // 07:00 + the 60-minute window
    expect(say('home_tidy')).toBe('Tidy up for 5 minutes');
    expect(say('skill_practice')).toBe('Practise language for 10 minutes');
    expect(say('social_reach_out')).toBe('Reach out to 1 person (more than a like)');
    expect(P.targetText(one('strength_log', 'standard'), 'strength_log', 1)).toBe('2 sessions a week, about 30 min');
  });

  it('show how often', () => {
    const often = (id: string, i: P.PilotChoice['intensity'] = 'starter') => P.frequencyText(one(id, i), id, 1);
    expect(often('mind_read')).toBe('Every day');
    expect(often('focus_deepwork')).toBe('Any 4 days a week');
    expect(often('focus_top3')).toBe('Any 3 workdays a week');
    expect(often('confidence_talk')).toBe('Any 3 days a week');
    expect(often('social_reach_out')).toBe('Any 4 days a week');
    expect(often('social_reach_out', 'standard')).toBe('Every day');
    expect(often('strength_log')).toBe('Any days you choose, one session a day at most');
  });

  it('keep the 16–17 focus block limit in what the card says', () => {
    const teen = one('focus_deepwork', 'challenge', { ...ADULT, age: '16_17' });
    const mastery: P.PilotProgram = {
      ...teen,
      progression: {
        focus_deepwork: {
          ...teen.progression.focus_deepwork,
          eras: [{ intensity: 'challenge', phase: 'mastery', fromDay: 1, reason: 'start' }],
        },
      },
    };
    expect(P.targetText(mastery, 'focus_deepwork', 1)).toBe('Focus for 2 × 45 minutes, phone in another room');
    expect(P.timerBlocksFor({ ...mastery, answers: ADULT }, 'focus_deepwork', 1)).toEqual([90]);
  });

  it('use their own artwork in both themes, and a world crop for Social Confidence until its light version exists', () => {
    const own = P.PILOT_HABITS.filter((id) => id !== 'confidence_talk');
    for (const theme of ['light', 'dark'] as const) {
      for (const id of own) expect(habitScene(id, theme)).toBeTruthy();
      for (const id of P.PILOT_HABITS.filter((x) => !own.includes(x))) expect(habitScene(id, theme)).toBeUndefined();
    }
    for (const id of P.PILOT_HABITS) expect(placeholderCrop(id)).toEqual(placeholderCrop(id));
  });
});

describe('setup', () => {
  it('asks only the baseline questions the chosen habits need', () => {
    expect(P.baselinesFor(['mind_read', 'focus_deepwork', 'home_tidy', 'focus_top3'])).toEqual([]);
    expect(P.baselinesFor(['screen_app_limit'])).toEqual(['phone', 'pullMinutes']);
    expect(P.baselinesFor(['sleep_wake', 'move_walk', 'skill_practice', 'strength_log'])).toEqual([
      'wake',
      'activeDays',
      'skill',
      'strengthStart',
    ]);
    const bare: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 60 };
    expect(P.setupProblems(bare, [{ habitId: 'mind_read', intensity: 'starter' }])).toEqual([]);
    expect(P.setupProblems(bare, [{ habitId: 'sleep_wake', intensity: 'starter' }])).toEqual([
      'Sleep Routine: say when you usually get up.',
    ]);
    expect(P.setupProblems(bare, [{ habitId: 'screen_app_limit', intensity: 'starter' }])).toEqual([
      'Less Scrolling: say how long you use your phone a day.',
      'Less Scrolling: say how long a day you spend on your main app.',
    ]);
  });

  it('keeps only the answers the chosen habits use', () => {
    expect(one('mind_read').answers).toEqual({ age: '30_49', precautions: [], minutesPerDay: 180 });
    expect(one('sleep_wake').answers).toEqual({
      age: '30_49',
      precautions: [],
      minutesPerDay: 180,
      wake: { kind: 'time', time: '07:00' },
    });
  });

  it('applies the existing exclusions', () => {
    // Less Scrolling: not under 2 h of overall phone use.
    expect(P.habitExclusion('screen_app_limit', { ...ADULT, phone: '1_2' })).toMatch(/less than 2 hours/);
    // Sleep Routine: not with a wake time that varies or shift work.
    expect(P.habitExclusion('sleep_wake', { ...ADULT, wake: { kind: 'shift' } })).toMatch(/shifts/);
    expect(P.habitExclusion('sleep_wake', ADULT)).toBeNull();
    // Daily Movement and Strength: walking difficulty, heart, pregnancy.
    for (const precautions of [['walkingDifficult'], ['heart'], ['pregnancy']] as P.PilotAnswers['precautions'][]) {
      expect(P.habitExclusion('move_walk', { ...ADULT, precautions })).not.toBeNull();
      expect(P.habitExclusion('strength_log', { ...ADULT, precautions })).not.toBeNull();
    }
    // Strength needs the health question answered; joint pain rules out Starter; 16–17 can't take Challenge.
    expect(P.habitExclusion('strength_log', { ...ADULT, precautions: 'unknown' })).toMatch(/health question/);
    const joint = P.intensityOptions('strength_log', { ...ADULT, precautions: ['joint'] });
    expect(joint.map((o) => !!o.reason)).toEqual([true, false, false]);
    const teen = P.intensityOptions('strength_log', { ...ADULT, age: '16_17' });
    expect(teen.map((o) => !!o.reason)).toEqual([false, false, true]);
    // Everything else is open to everyone 16+.
    for (const id of ['focus_deepwork', 'focus_top3', 'mind_read', 'confidence_talk', 'home_tidy', 'skill_practice'])
      expect(P.habitExclusion(id, { ...ADULT, age: '16_17', precautions: 'unknown' })).toBeNull();
    expect(P.setupProblems({ ...ADULT, age: 'u16' }, THREE)).toEqual(['Schwung is made for people 16 and older.']);
  });

  it('keeps the six-habit maximum', () => {
    const seven = ['focus_deepwork', 'focus_top3', 'mind_read', 'confidence_talk', 'home_tidy', 'social_reach_out']
      .concat('sleep_wake')
      .map((habitId) => ({ habitId, intensity: 'starter' as const }));
    expect(P.setupProblems(ADULT, seven)).toContain('Choose at most 6 habits for now.');
    expect(P.setupProblems(ADULT, seven.slice(0, 6))).toEqual([]);
  });

  it('suggests a manageable start without choosing for the person', () => {
    expect(P.SUGGESTED_START).toEqual(['mind_read', 'move_walk', 'sleep_wake']);
    expect(P.suggestedIntensity('mind_read', ADULT)).toBe('starter');
    expect(P.suggestedIntensity('move_walk', { ...ADULT, activeDays: '3_4' })).toBe('standard');
    expect(P.suggestedIntensity('move_walk', { ...ADULT, activeDays: '5p' })).toBe('challenge');
    expect(P.suggestedIntensity('strength_log', { ...ADULT, strengthStart: 'regular', age: '16_17' })).toBe('standard');
    expect(P.suggestedIntensity('strength_log', { ...ADULT, precautions: ['joint'], strengthStart: 'new' })).toBe(
      'standard',
    );
  });

  it('checks the time the person has', () => {
    // Read 20 + Focus 25 + Strength ~30 = 75 min at Standard.
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 60 }, THREE)[0]).toMatch(/75 min .* 60 min/);
    expect(P.setupProblems({ ...ADULT, minutesPerDay: 90 }, THREE)).toEqual([]);
    expect(P.previewTarget('focus_deepwork', 'starter', ADULT)).toEqual({
      target: 'Focus for 15 minutes, phone in another room',
      frequency: 'Any 4 days a week',
    });
  });
});

describe('completion, undo and counters', () => {
  it('completes with a swipe and undoes, never awarding XP twice', () => {
    let p = one('mind_read');
    p = P.complete(p, 'mind_read', 1).program;
    expect(totalXp(p.logs)).toBe(30);
    p = P.complete(p, 'mind_read', 1).program;
    expect(totalXp(p.logs)).toBe(30);
    const undone = P.undo(p, 'mind_read', 1);
    expect([undone.event, totalXp(undone.program.logs)]).toEqual([{ kind: 'uncompleted' }, 0]);
    expect(P.complete(undone.program, 'mind_read', 1).event).toEqual({ kind: 'completed', first: false });
  });

  it('counts Get It Done’s tasks: reaching the number completes it, once', () => {
    let p = one('focus_top3', 'standard'); // top 2 tasks, 5 workdays
    expect(P.counterTarget(p, 'focus_top3', 1)).toBe(2);
    p = P.count(p, 'focus_top3', 1, 1).program;
    expect(P.isDone(p, 'focus_top3', 1)).toBe(false);
    const done = P.count(p, 'focus_top3', 1, 1);
    expect(done.event).toEqual({ kind: 'completed', first: true });
    p = done.program;
    expect(totalXp(p.logs)).toBe(30);
    // More taps never add XP; a swipe on top changes nothing.
    p = P.complete(P.count(p, 'focus_top3', 1, 1).program, 'focus_top3', 1).program;
    expect(totalXp(p.logs)).toBe(30);
    // A correction below the number undoes what the counter did.
    p = P.count(P.count(p, 'focus_top3', 1, -1).program, 'focus_top3', 1, -1).program;
    expect(P.isDone(p, 'focus_top3', 1)).toBe(false);
  });

  it('counts Stay Connected’s people, and leaves other habits without a counter', () => {
    let p = one('social_reach_out', 'challenge'); // 2 people a day
    p = P.count(P.count(p, 'social_reach_out', 1, 1).program, 'social_reach_out', 1, 1).program;
    expect(P.isDone(p, 'social_reach_out', 1)).toBe(true);
    expect(P.counterTarget(one('mind_read'), 'mind_read', 1)).toBeNull();
    expect(P.count(one('mind_read'), 'mind_read', 1, 1).event).toBeNull();
  });

  it('lets Social Confidence’s step be skipped, which never completes it', () => {
    let p = P.setSkipped(one('confidence_talk'), 'confidence_talk', 1, true).program;
    expect(readTrack(log(p, 1), 'confidence_talk').skipped).toBe(true);
    expect(P.isDone(p, 'confidence_talk', 1)).toBe(false);
    expect(P.recentDays(p, 'confidence_talk', 2)[0].state).toBe('skipped');
    p = P.complete(p, 'confidence_talk', 1).program;
    expect(readTrack(log(p, 1), 'confidence_talk').skipped).toBeUndefined();
  });

  it('logs strength sessions (one a day), with optional details, edits and undo', () => {
    let p = one('strength_log', 'standard');
    p = P.complete(P.complete(p, 'strength_log', 1).program, 'strength_log', 1).program;
    p = P.setSession(p, 1, { type: 'upper', minutes: 35 }).program;
    p = P.setSession(p, 1, { minutes: 40 }).program;
    expect(readTrack(log(p, 1), 'strength_log').session).toEqual({ type: 'upper', minutes: 40 });
    expect(totalXp(p.logs)).toBe(30);
    p = P.setSession(p, 3, { type: 'lower' }).program;
    expect(P.weekProgress(p, 'strength_log', 3)).toMatchObject({ credited: 2, goal: 2, status: 'achieved' });
    p = P.undo(p, 'strength_log', 3).program;
    expect(readTrack(log(p, 3), 'strength_log').session).toBeUndefined();
  });

  it('takes optional minutes without ever changing completion', () => {
    let p = P.setMinutes(one('home_tidy'), 'home_tidy', 1, 12).program;
    expect(P.isDone(p, 'home_tidy', 1)).toBe(false);
    p = P.setMinutes(P.complete(p, 'home_tidy', 1).program, 'home_tidy', 1, null).program;
    expect(P.isDone(p, 'home_tidy', 1)).toBe(true);
  });
});

describe('daily and weekly adherence', () => {
  it('lists daily habits every day and weekly ones only on a day they’re done', () => {
    let p = P.complete(pilot(), 'mind_read', 1).program;
    expect([log(p, 1).planned, P.dayFull(p, 1)]).toEqual([['mind_read'], true]);
    p = P.complete(p, 'focus_deepwork', 1).program;
    expect(log(p, 1).planned).toEqual(['focus_deepwork', 'mind_read']);
    p = P.complete(p, 'strength_log', 2).program;
    expect(P.dayFull(p, 2)).toBe(false);
  });

  it('never makes a rest day a miss: weekly habits are open, workday habits rest at weekends', () => {
    const p = one('focus_top3', 'standard');
    expect(P.stateOn(p, 'focus_top3', 2)).toBe('open');
    expect(P.stateOn(p, 'focus_top3', 6)).toBe('not-eligible'); // Saturday
    const focus = doneOn(one('focus_deepwork'), 'focus_deepwork', [1, 2, 3, 4]);
    expect(P.stateOn(focus, 'focus_deepwork', 5)).toBe('goal-met');
    expect(P.dayResult(focus, 6)).toBe('rest');
  });

  it('keeps a streak through rest days, and breaks it on a missed daily habit', () => {
    const weekly = doneOn(pilot(THREE.slice(1)), 'focus_deepwork', [1, 2, 5]);
    expect(P.pilotStreak(weekly, 5)).toBe(3);
    const withRead = doneOn(doneOn(pilot(), 'mind_read', [1, 2, 4, 5]), 'focus_deepwork', [3]);
    expect(P.pilotStreak(withRead, 5)).toBe(2);
    expect(P.journeyStats(withRead, 5)).toEqual({ done: 4, streak: 2, best: 2 });
  });
});

describe('readiness progression', () => {
  const readEveryDay = (to: number) =>
    doneOn(
      pilot(),
      'mind_read',
      Array.from({ length: to }, (_, i) => i + 1),
    );

  it('offers Momentum on Day 22 when ready, from tomorrow, only when accepted', () => {
    const p = readEveryDay(21);
    expect(offerOf(p, 'mind_read', 21)).toBeNull();
    const o = offerOf(p, 'mind_read', 22)!;
    expect(o).toMatchObject({ kind: 'step-up', effectiveDay: 23 });
    const accepted = P.accept(p, 'mind_read', o, 22);
    expect(P.targetText(accepted, 'mind_read', 23)).toBe('Read for 25 minutes');
    expect(P.pendingText(accepted, 'mind_read', 22)).toBe('Standard Momentum from tomorrow: Read for 25 minutes');
    expect(offerOf(accepted, 'mind_read', 22)).toBeNull();
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(accepted)))).toEqual(accepted);
  });

  it('starts a weekly habit’s step-up next Monday, and respects a decline for 7 days', () => {
    let p = pilot(THREE.slice(1, 2));
    p = doneOn(p, 'focus_deepwork', [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19]);
    const o = offerOf(p, 'focus_deepwork', 24)!;
    expect(o).toMatchObject({ kind: 'step-up', effectiveDay: 29 });
    const declined = doneOn(P.decline(p, 'focus_deepwork', o, 24), 'focus_deepwork', [22, 23, 24, 25, 26]);
    expect(offerOf(declined, 'focus_deepwork', 30)).toBeNull();
    expect(offerOf(declined, 'focus_deepwork', 31)).toMatchObject({ kind: 'step-up', effectiveDay: 36 });
  });

  it('lets the person make it easier or harder any time, within their time and baseline', () => {
    const p = pilot();
    const e = P.easier(p, 'mind_read', 3);
    if ('blocked' in e) throw new Error(e.blocked);
    expect([P.targetText(e.program, 'mind_read', 3), P.targetText(e.program, 'mind_read', 4)]).toEqual([
      'Read for 20 minutes',
      'Read for 10 minutes',
    ]);
    const tight = { ...p, answers: { ...p.answers, minutesPerDay: 75 } };
    expect(P.harder(tight, 'mind_read', 3)).toEqual({ blocked: 'it doesn’t fit the time you have' });
    // Less Scrolling can't go below the floor: at 60 min a day, Starter Momentum is already at it.
    const scroll = one('screen_app_limit', 'starter', { ...ADULT, pullMinutes: 60 });
    const atMomentum: P.PilotProgram = {
      ...scroll,
      progression: {
        screen_app_limit: {
          ...scroll.progression.screen_app_limit,
          eras: [{ intensity: 'starter', phase: 'momentum', fromDay: 1, reason: 'start' }],
        },
      },
    };
    expect(P.harder(atMomentum, 'screen_app_limit', 3)).toEqual({
      blocked: 'your limit is already as low as it goes for you',
    });
  });

  it('holds back step-ups after a recent “too hard”, without lowering anything', () => {
    const p = P.feedback(readEveryDay(21), 'mind_read', 'too-hard', 20);
    expect(offerOf(p, 'mind_read', 22)).toBeNull();
    expect(P.levelFor(p, 'mind_read', 30).phase).toBe('foundation');
  });
});

describe('Insights numbers, from the saved days only', () => {
  // Read every day (Standard) and Focus Time (5 days a week). Today is Day 9 (Tuesday of Week 2).
  const p = doneOn(doneOn(pilot(THREE.slice(0, 2)), 'mind_read', [1, 2, 4, 5, 6, 7, 8]), 'focus_deepwork', [1, 2, 3]);

  it('count a daily habit’s past days, and today only once it’s done', () => {
    expect(P.habitTally(p, 'mind_read', 9)).toEqual({ done: 7, eligible: 8 }); // Day 3 missed
    expect(P.habitTally(P.complete(p, 'mind_read', 9).program, 'mind_read', 9)).toEqual({ done: 8, eligible: 9 });
  });

  it('count a weekly habit by its finished weeks’ goals, and the current week only as far as it’s done', () => {
    // Week 1: goal 5, 3 done. Week 2 so far: nothing yet, so nothing counted against it.
    expect(P.habitTally(p, 'focus_deepwork', 9)).toEqual({ done: 3, eligible: 5 });
    const more = P.complete(p, 'focus_deepwork', 9).program;
    expect(P.habitTally(more, 'focus_deepwork', 9)).toEqual({ done: 4, eligible: 6 });
  });

  it('add up overall, total and this week', () => {
    expect(P.overallTally(p, 9)).toEqual({ done: 10, eligible: 13 });
    expect(P.totalCompleted(p)).toBe(10);
    // This week (Days 8–9): Read 1 of 2 days (today still open), Focus 0 of its weekly goal of 5.
    expect(P.weekTally(p, 9)).toEqual({ done: 1, eligible: 7 });
  });

  it('show each habit’s recent days and weeks', () => {
    expect(P.recentDays(p, 'mind_read', 9).map((d) => d.state)).toEqual([
      'done',
      'done',
      'missed',
      'done',
      'done',
      'done',
      'done',
      'done',
      'today',
    ]);
    expect(P.recentDays(p, 'focus_deepwork', 9)[3].state).toBe('rest');
    expect(P.habitWeeks(p, 'focus_deepwork', 9).map((w) => [w.week, w.credited, w.goal])).toEqual([
      [1, 3, 5],
      [2, 0, 5],
    ]);
  });

  it('keep Less Scrolling’s weekly Screen Time check apart from the days', () => {
    const s = P.setScreenTime(one('screen_app_limit'), 3, 95);
    expect(P.screenTimeFor(s, 5)).toMatchObject({ minutesPerDay: 95, source: 'self-reported', week: 1 });
    expect(P.screenTimeFor(s, 8)).toBeNull();
    expect(s.logs).toEqual({});
    expect(P.setScreenTime(one('mind_read'), 3, 95).measures).toBeUndefined();
  });
});

describe('saves and compatibility', () => {
  it('load an existing three-habit pilot program unchanged, timer data included', () => {
    const date = dateForDay(MON, 1);
    const pilotSave = {
      v: 1,
      startedAt: MON,
      answers: { age: '30_49', precautions: [], minutesPerDay: 90, strengthStart: 'sometimes' },
      habits: ['mind_read', 'focus_deepwork', 'strength_log'],
      progression: Object.fromEntries(
        ['mind_read', 'focus_deepwork', 'strength_log'].map((id) => [
          id,
          { v: 1, habitId: id, eras: [{ intensity: 'standard', phase: 'foundation', fromDay: 1, reason: 'start' }] },
        ]),
      ),
      logs: {
        [date]: {
          day: 1,
          date,
          completed: ['mind_read'],
          planned: ['mind_read'],
          track: {
            mind_read: { v: 1, by: 'timer', minutes: 20, everCompleted: true },
            focus_deepwork: {
              v: 1,
              minutes: 7,
              timer: {
                v: 1,
                habitId: 'focus_deepwork',
                day: 1,
                blocks: [25],
                block: 0,
                status: 'paused',
                bankedMs: 420_000,
                finishedMs: 0,
                firstStartedAt: 1_700_000_000_000,
                dayEndsAt: 1_700_050_000_000,
              },
            },
          },
        },
      },
    };
    const loaded = P.sanitizePilotProgram(JSON.parse(JSON.stringify(pilotSave)))!;
    expect(loaded).toEqual(pilotSave);
    // It carries on: the saved timer is kept, untouched, by later changes.
    const next = P.complete(loaded, 'focus_deepwork', 1).program;
    expect(readTrack(log(next, 1), 'focus_deepwork')).toMatchObject({ minutes: 7 });
    expect(log(next, 1).track?.focus_deepwork.timer).toEqual(pilotSave.logs[date].track.focus_deepwork.timer);
    // The day already had its full-day bonus; Focus (a weekly habit) adds its own 10.
    expect(totalXp(next.logs)).toBe(totalXp(loaded.logs) + 10);
  });

  it('expose no timer: the program has no timer actions', () => {
    for (const name of ['startTimer', 'pauseTimer', 'resetTimer', 'settleTimer', 'timerOn'])
      expect(name in P).toBe(false);
  });

  it('use local date keys, so clock changes never move a day', () => {
    const p = doneOn(pilot(THREE.slice(0, 1), ADULT, '2026-10-20'), 'mind_read', [5, 6, 7]);
    expect(Object.keys(p.logs).sort()).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
    expect(P.pilotStreak(p, 7)).toBe(3);
  });

  it('read damaged saves defensively', () => {
    const p = P.complete(pilot(), 'mind_read', 1).program;
    expect(P.sanitizePilotProgram({ ...p, v: 2 })).toBeNull();
    expect(P.sanitizePilotProgram({ ...p, startedAt: 'yesterday' })).toBeNull();
    expect(P.sanitizePilotProgram({ ...p, habits: ['move_strength_session'] })).toBeNull();
    const damaged = { ...p, logs: { ...p.logs, nope: { day: 1 }, '2026-11-03': { day: 2, completed: 'x' } } };
    expect(P.sanitizePilotProgram(damaged)?.logs['2026-11-03']).toMatchObject({ completed: [], planned: [] });
  });

  it('leave V1/V2 progression as it was', () => {
    const plan: PlanHabit[] = [{ habitId: 'mind_read', level: 'easy', addedOnDay: 1, levelSince: 0 }];
    const r = reconcile({ plan, appliedPhase: 1, startKey: MON, logs: {}, today: 22, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('medium');
    expect(P.levelFor(pilot(), 'mind_read', 22).phase).toBe('foundation');
  });
});
