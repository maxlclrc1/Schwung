import { describe, expect, it } from '@jest/globals';
import { habitScene, placeholderCrop } from '../../components/habitArt';
import { dateForDay } from '../dates';
import { totalXp } from '../progression';
import { HELD_EXERCISE_PROGRAMMES, RESET_HABITS } from '../reset/habits';
import * as P from '../reset/pilot';
import { readTrack } from '../reset/tracking';

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

  it('use their own artwork in both themes, all 11 of them', () => {
    const own = [...P.PILOT_HABITS];
    for (const theme of ['light', 'dark'] as const) {
      for (const id of own) expect(habitScene(id, theme)).toBeTruthy();
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
    // The 80% list has only Read, but the day isn't complete while Focus's and Strength's weeks are open.
    expect([log(p, 1).planned, P.dayFull(p, 1)]).toEqual([['mind_read'], false]);
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

describe('adding a habit to a running program', () => {
  // Read Daily alone from Day 1 (a Monday); Daily Movement joins on Day 10 (Wednesday of Week 2).
  const base = () => doneOn(one('mind_read'), 'mind_read', [1, 2, 3]);
  const withWalk = (p = base()) =>
    P.addHabit(p, { activeDays: '1_2' }, { habitId: 'move_walk', intensity: 'starter' }, 10)!;

  it('offers the habits not in the program yet, and asks only what the new one needs', () => {
    const p = base();
    expect(P.addableHabits(p)).toHaveLength(10);
    expect(P.addableHabits(p)).not.toContain('mind_read');
    expect(P.missingBaselines(p, 'move_walk')).toEqual(['activeDays']);
    expect(P.missingBaselines(p, 'screen_app_limit')).toEqual(['phone', 'pullMinutes']);
    expect(P.missingBaselines(p, 'focus_top3')).toEqual([]);
  });

  it('joins from the day it’s added, in catalog order, at Foundation, without touching earlier days', () => {
    const before = base();
    const p = withWalk(before);
    expect(p.habits).toEqual(['mind_read', 'move_walk']);
    expect(p.progression.move_walk.eras).toEqual([
      { intensity: 'starter', phase: 'foundation', fromDay: 10, reason: 'start' },
    ]);
    expect(p.answers.activeDays).toBe('1_2');
    expect(p.logs).toBe(before.logs);
    // Before it joined it simply didn't exist: never a miss, never a rest day.
    expect(P.isDaily(p, 'move_walk', 9)).toBe(false);
    expect(P.plannedOn(p, 5, [])).toEqual(['mind_read']);
    expect(P.recentDays(p, 'move_walk', 12).map((d) => d.day)).toEqual([10, 11, 12]);
    const done = P.complete(p, 'move_walk', 10).program;
    expect(P.habitTally(done, 'move_walk', 12)).toEqual({ done: 1, eligible: 2 }); // Days 10 and 11
    expect(P.overallTally(done, 12)).toEqual({
      done: P.habitTally(done, 'mind_read', 12).done + 1,
      eligible: P.habitTally(done, 'mind_read', 12).eligible + 2,
    });
    expect(P.weekTally(done, 12)).toEqual({ done: 1 + 0, eligible: 5 + 3 }); // Read Days 8–12, Movement 10–12
  });

  it('counts a weekly habit that joins mid-week only from that day', () => {
    const p = P.addHabit(base(), {}, { habitId: 'focus_deepwork', intensity: 'standard' }, 10)!;
    const weeks = P.habitWeeks(p, 'focus_deepwork', 15);
    expect(weeks.map((w) => [w.week, w.firstDay])).toEqual([
      [2, 8],
      [3, 15],
    ]);
    // Week 2's goal is scaled to the five days it was part of the program; nothing is owed for Week 1.
    expect(P.habitTally(p, 'focus_deepwork', 15)).toEqual({ done: 0, eligible: weeks[0].goal });
    expect(weeks[0].goal).toBeLessThan(5);
  });

  it('refuses what set-up refuses', () => {
    const p = base();
    const add = (id: string, extra: Partial<P.PilotAnswers> = {}, intensity: P.PilotChoice['intensity'] = 'starter') =>
      P.addProblems(p, extra, { habitId: id, intensity }, 10);
    expect(add('mind_read')).toEqual(['Read Daily is already in your Life Reset.']);
    expect(add('sleep_no_phone_bed')).toEqual(['Choose from the Life Reset habits.']);
    expect(add('sleep_wake')).toEqual(['Sleep Routine: say when you usually get up.']);
    expect(add('sleep_wake', { wake: { kind: 'time', time: '07:00' } })).toEqual([]);
    expect(add('strength_log', { strengthStart: 'new', precautions: ['heart'] })[0]).toMatch(/clinician or midwife/);
    expect(P.addHabit(p, {}, { habitId: 'sleep_wake', intensity: 'starter' }, 10)).toBeNull();
    // At most six habits.
    let six = p;
    for (const id of ['focus_top3', 'home_tidy', 'social_reach_out', 'confidence_talk', 'focus_deepwork'])
      six = P.addHabit(six, {}, { habitId: id, intensity: 'starter' }, 10) ?? six;
    expect(six.habits).toHaveLength(6);
    expect(
      P.addProblems(six, { skill: 'Language' }, { habitId: 'skill_practice', intensity: 'starter' }, 10),
    ).toContain('You have 6 habits, the most for now.');
  });

  it('checks the time with every habit at today’s level, and accepts more time a day', () => {
    const tight = P.addHabit(
      one('focus_deepwork', 'challenge', { ...ADULT, minutesPerDay: 60 }),
      {},
      {
        habitId: 'mind_read',
        intensity: 'challenge',
      },
      3,
    );
    expect(tight).toBeNull();
    const roomier = P.addHabit(
      one('focus_deepwork', 'challenge', { ...ADULT, minutesPerDay: 60 }),
      { minutesPerDay: 90 },
      { habitId: 'mind_read', intensity: 'challenge' },
      3,
    );
    expect(roomier?.answers.minutesPerDay).toBe(90);
    // 45 + 30 + 30 = 105 min, over the 90 now available: the message says so.
    expect(P.addProblems(roomier!, { activeDays: '3_4' }, { habitId: 'move_walk', intensity: 'challenge' }, 3)).toEqual(
      [expect.stringMatching(/about 105 min .* more than the 90 min you have/)],
    );
  });
});

describe('a complete day', () => {
  // Read every day; Focus Time any 5 days a week; Day 1 is a Monday.
  const two = () => pilot(THREE.slice(0, 2));

  it('needs every daily habit and every weekly habit whose week is still open', () => {
    let p = P.complete(two(), 'mind_read', 1).program;
    expect(P.dayFull(p, 1)).toBe(false);
    p = P.complete(p, 'focus_deepwork', 1).program;
    expect(P.dayFull(p, 1)).toBe(true);
    // Undo takes it back, and its bonus with it; doing it again never counts twice.
    const undone = P.undo(p, 'focus_deepwork', 1).program;
    expect([P.dayFull(undone, 1), P.pilotXp(undone)]).toEqual([false, 10]);
    expect(P.pilotXp(p)).toBe(2 * 10 + 20);
    expect(P.pilotXp(P.complete(p, 'focus_deepwork', 1).program)).toBe(P.pilotXp(p));
  });

  it('lets a weekly habit rest once its week’s goal is met', () => {
    // Focus done Days 1–5 (its goal of 5 met): on Saturday Read alone completes the day.
    const p = doneOn(doneOn(two(), 'focus_deepwork', [1, 2, 3, 4, 5]), 'mind_read', [6]);
    expect(P.requiredOn(p, 6)).toEqual(['mind_read']);
    expect(P.dayFull(p, 6)).toBe(true);
  });

  it('is read from the saved days, the same after a reload', () => {
    const p = doneOn(two(), 'mind_read', [1]);
    const back = P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;
    expect([P.dayFull(back, 1), P.pilotXp(back)]).toEqual([false, 10]);
  });
});

describe('removing a habit', () => {
  // Read and Movement every day; Movement done Days 1–5, Read Days 1–7. Movement is removed on Day 6.
  const two = () =>
    doneOn(
      doneOn(
        pilot([
          { habitId: 'mind_read', intensity: 'starter' },
          { habitId: 'move_walk', intensity: 'starter' },
        ]),
        'move_walk',
        [1, 2, 3, 4, 5],
      ),
      'mind_read',
      [1, 2, 3, 4, 5, 6, 7],
    );

  it('takes it out from that day, keeping its past exactly as it was', () => {
    const before = two();
    const p = P.removeHabit(before, 'move_walk', 6)!;
    expect(p.habits).toEqual(['mind_read']);
    expect(p.logs).toBe(before.logs);
    // Days 1–5: both habits were there and done; from Day 6 only Read counts.
    expect(P.plannedOn(p, 3, ['mind_read', 'move_walk'])).toEqual(['mind_read', 'move_walk']);
    expect(P.plannedOn(p, 6, ['mind_read'])).toEqual(['mind_read']);
    // Days 1–7 all count (Movement done while it was there): the streak isn't rewritten.
    expect(P.journeyStats(p, 8)).toEqual({ done: 7, streak: 7, best: 7 });
    expect(P.totalCompleted(p)).toBe(P.totalCompleted(before));
    // Days 1–5 keep their XP; from Day 6 Movement isn't asked any more, so Days 6–7 (Read done) are complete.
    expect(P.pilotXp(p)).toBe(7 * 10 + 5 * 10 + 7 * 20);
    expect(P.pilotXp(before)).toBe(7 * 10 + 5 * 10 + 5 * 20);
    // Its opportunities stop when it left: Days 1–5, all done.
    expect(P.habitTally(p, 'move_walk', 8)).toEqual({ done: 5, eligible: 5 });
    expect(P.overallTally(p, 8)).toEqual({ done: 12, eligible: 12 });
    expect(P.complete(p, 'move_walk', 7).event).toBeNull();
  });

  it('keeps today when it was already done today (it leaves from tomorrow)', () => {
    const p = P.removeHabit(two(), 'move_walk', 5)!;
    expect(P.plannedOn(p, 5, ['mind_read', 'move_walk'])).toEqual(['mind_read', 'move_walk']);
    expect(P.plannedOn(p, 6, ['mind_read'])).toEqual(['mind_read']);
  });

  it('never removes the last habit, nor one that isn’t there', () => {
    const one1 = one('mind_read');
    expect(P.removeProblem(one1, 'mind_read')).toMatch(/at least one habit/);
    expect(P.removeHabit(one1, 'mind_read', 3)).toBeNull();
    expect(P.removeProblem(two(), 'focus_top3')).toMatch(/isn’t in your Life Reset/);
  });

  it('can be added again later: the days away never existed, and its past is still there', () => {
    const away = P.removeHabit(two(), 'move_walk', 6)!;
    const back = P.addHabit(away, {}, { habitId: 'move_walk', intensity: 'standard' }, 10)!;
    expect(back.habits).toEqual(['mind_read', 'move_walk']);
    expect([6, 9, 10].map((d) => P.isDaily(back, 'move_walk', d))).toEqual([false, false, true]);
    expect(P.levelFor(back, 'move_walk', 10)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(P.habitTally(back, 'move_walk', 12)).toEqual({ done: 5, eligible: 7 }); // Days 1–5, then 10–11
    // A removed habit is offered again in "Add a habit".
    expect(P.addableHabits(away)).toContain('move_walk');
  });

  it('survives a save and reload with its history', () => {
    const p = P.removeHabit(two(), 'move_walk', 6)!;
    const back = P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;
    expect(back.habits).toEqual(['mind_read']);
    expect(back.progression.move_walk.gaps).toEqual([{ from: 6 }]);
    expect(P.habitTally(back, 'move_walk', 8)).toEqual({ done: 5, eligible: 5 });
  });
});

describe('the person’s own habits', () => {
  const make = (p = one('mind_read'), def = { name: 'Stretch', note: '10 minutes after work', perWeek: 7 }, day = 3) =>
    P.addCustomHabit(p, def, day, 7)!;

  it('join from that day with their name, what counts and how often, and no levels or offers', () => {
    const { program: p, id } = make();
    expect(id).toBe('custom_1');
    expect(p.habits).toEqual(['mind_read', 'custom_1']);
    expect(P.nameOf(p, id)).toBe('Stretch');
    expect(P.targetText(p, id, 3)).toBe('10 minutes after work');
    expect(P.frequencyText(p, id, 3)).toBe('Every day');
    expect(P.levelLineFor(p, id, 3)).toBe('Your habit');
    expect(P.isDaily(p, id, 2)).toBe(false); // before it was made
    expect(P.isDaily(p, id, 3)).toBe(true);
    expect(P.offersNow(P.complete(p, id, 3).program, 30, false).some((o) => o.habitId === id)).toBe(false);
    expect(P.timerBlocksFor(p, id, 3)).toEqual([]);
    expect(P.easier(p, id, 3)).toHaveProperty('blocked');
  });

  it('count like any habit: completion, XP, the day’s list and Insights', () => {
    let { program: p } = make();
    p = doneOn(p, 'custom_1', [3, 4]);
    expect(P.plannedOn(p, 4, ['mind_read', 'custom_1'])).toEqual(['mind_read', 'custom_1']);
    expect(P.habitTally(p, 'custom_1', 5)).toEqual({ done: 2, eligible: 2 });
    expect(P.totalCompleted(p)).toBe(2);
  });

  it('can be weekly: any days the person chooses, counted by the week', () => {
    const { program: p, id } = make(undefined, { name: 'Swim', perWeek: 2 } as never, 1);
    expect(P.frequencyText(p, id, 1)).toBe('Any 2 days a week');
    expect(P.targetText(p, id, 1)).toBe('Any 2 days a week');
    expect(P.isDaily(p, id, 1)).toBe(false);
    expect(P.weekProgress(P.complete(p, id, 2).program, id, 3)).toMatchObject({ credited: 1, goal: 2 });
  });

  it('each get a different part of the panorama while there are views to go round', () => {
    let p = one('mind_read');
    const scenes: number[] = [];
    for (const name of ['A', 'B', 'C']) {
      const r = P.addCustomHabit(p, { name, perWeek: 7 }, 1, 7)!;
      p = r.program;
      scenes.push(p.custom![r.id].scene);
    }
    expect(new Set(scenes).size).toBe(3);
  });

  it('are refused without a name, with a name already used, or past six habits', () => {
    const p = one('mind_read');
    expect(P.customProblems(p, '  ', 7)).toEqual(['Give it a name.']);
    expect(P.customProblems(p, 'read daily', 7)).toEqual(['You already have a habit with that name.']);
    expect(P.customProblems(p, 'x'.repeat(41), 7)).toEqual(['Keep the name to 40 characters.']);
    expect(P.customProblems(p, 'Swim', 0)).toEqual(['Choose how many days a week.']);
    let six = p;
    for (const name of ['A', 'B', 'C', 'D', 'E']) six = P.addCustomHabit(six, { name, perWeek: 7 }, 1, 7)!.program;
    expect(P.customProblems(six, 'F', 7)).toEqual(['You have 6 habits, the most for now.']);
  });

  it('can be removed, and survive a save and reload', () => {
    let { program: p } = make();
    p = P.removeHabit(doneOn(p, 'custom_1', [3]), 'custom_1', 5)!;
    const back = P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;
    expect(back.custom?.custom_1).toEqual({ name: 'Stretch', note: '10 minutes after work', perWeek: 7, scene: 0 });
    expect(back.habits).toEqual(['mind_read']);
    expect(P.habitTally(back, 'custom_1', 8)).toEqual({ done: 1, eligible: 2 });
    // A made-up habit id with no definition is never trusted.
    expect(P.sanitizePilotProgram({ ...JSON.parse(JSON.stringify(p)), habits: ['custom_9'] })).toBeNull();
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
});

describe('the ceremonies', () => {
  it('the summit is due only once the 66 days are done: Day 66 complete, or any day after, never twice', () => {
    const p = pilot([{ habitId: 'mind_read', intensity: 'starter' }]);
    expect(P.summitDue(p, 1)).toBe(false);
    expect(P.summitDue(p, 65)).toBe(false);
    expect(P.summitDue(p, 66)).toBe(false);
    expect(P.summitDue(doneOn(p, 'mind_read', [66]), 66)).toBe(true);
    // Consistency never decides it: nothing done at all, and it still comes after Day 66.
    expect(P.summitDue(p, 67)).toBe(true);
    expect(P.summitDue({ ...p, ceremonies: { summit: true } }, 70)).toBe(false);
  });

  it('keeps which ceremonies were seen through a save, and nothing else under that name', () => {
    const p = { ...pilot(), ceremonies: { day1: true, summit: 'yes' } };
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))?.ceremonies).toEqual({ day1: true });
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(pilot())))?.ceremonies).toBeUndefined();
  });
});

describe('the milestone moments', () => {
  const p = pilot([{ habitId: 'mind_read', intensity: 'starter' }]);
  const seen = (milestones: number[]) => ({ ...p, ceremonies: { milestones } });

  it('are due on reaching Days 7, 21 and 44, whatever the consistency, never early', () => {
    expect(P.milestoneDue(p, 6)).toBeNull();
    expect(P.milestoneDue(p, 7)).toBe(7);
    expect(P.milestoneDue(p, 21)).toBe(21);
    expect(P.milestoneDue(p, 44)).toBe(44);
  });

  it('show once, and someone back late sees only the latest, never a stack', () => {
    expect(P.milestoneDue(seen([7]), 10)).toBeNull();
    // Back on Day 30 having seen none: only Foundation's, while Momentum lasts.
    expect(P.milestoneDue(p, 30)).toBe(21);
    expect(P.milestoneDue(seen([7, 21]), 30)).toBeNull();
    // Back after the summit: none at all (the summit ceremony speaks for the whole climb).
    expect(P.milestoneDue(p, 70)).toBeNull();
  });

  it('keep which were seen through a save, and nothing else', () => {
    const x = { ...p, ceremonies: { day1: true, milestones: [7, 9, 'x', 21] } };
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(x)))?.ceremonies).toEqual({
      day1: true,
      milestones: [7, 21],
    });
  });
});
