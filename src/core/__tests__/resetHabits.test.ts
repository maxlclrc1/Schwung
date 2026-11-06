import { describe, expect, it } from '@jest/globals';
import { habitScene } from '../../components/habitArt';
import {
  HELD_EXERCISE_PROGRAMMES,
  INTENSITIES,
  LOWER_IS_HARDER,
  PHASES,
  RESET_BY_ID,
  RESET_HABITS,
  resetExclusion,
  SCROLLING_RULES,
  scrollingLimit,
  scrollingRecommended,
  RETIRED_HABITS,
  STRENGTH_RULES,
  strengthNotes,
  upBy,
  WEEKLY_RULES,
  type Intensity,
  type ResetHabit,
  type Target,
} from '../reset/habits';
import { TEEN_FOCUS_MAX_MIN, type Profile } from '../reset/profile';

const ADULT: Profile = {
  age: '18_29',
  activeDays: '1_2',
  phone: '2_4',
  precautions: [],
  wake: { kind: 'time', time: '07:15' },
};
const TEEN: Profile = { ...ADULT, age: '16_17' };

const num = (t: Target) =>
  t.amount.kind === 'fixed' ? t.amount.value : t.amount.kind === 'below-baseline' ? t.amount.reduceBy : t.amount.min;
/** Below-baseline amounts are reductions: a bigger reduction is harder. */
const harder = (t: Target) => (LOWER_IS_HARDER.has(t.unit) && t.amount.kind === 'fixed' ? -num(t) : num(t));
const days = (t: Target) =>
  t.schedule.kind === 'daily'
    ? 7
    : t.schedule.kind === 'sessions'
      ? typeof t.schedule.perWeek === 'number'
        ? t.schedule.perWeek
        : 2
      : t.schedule.days;
const strings = (x: unknown): string[] =>
  typeof x === 'string'
    ? [x]
    : Array.isArray(x)
      ? x.flatMap(strings)
      : x && typeof x === 'object'
        ? Object.values(x).flatMap(strings)
        : [];
const table = (h: ResetHabit) => INTENSITIES.map((i) => PHASES.map((p) => h.targets[i][p].text));

describe('Life Reset habit catalog: the 11 approved habits', () => {
  it('has the 11 habits, in order, with stable ids', () => {
    expect(RESET_HABITS.map((h) => [h.id, h.name])).toEqual([
      ['eat_well', 'Eat Well'],
      ['screen_app_limit', 'Less Scrolling'],
      ['focus_top3', 'Get It Done'],
      ['mind_read', 'Read Daily'],
      ['mind_meditation', 'Meditation'],
      ['move_walk', 'Daily Movement'],
      ['sleep_wake', 'Sleep Routine'],
      ['outdoor_time', 'Time Outdoors'],
      ['skill_practice', 'Practice a Skill'],
      ['social_reach_out', 'Stay Connected'],
      ['strength_log', 'Strength Training'],
    ]);
  });

  it('keeps the six ids it grew from, and five new ones', () => {
    for (const h of RESET_HABITS) if (h.existingId) expect(h.existingId).toBe(h.id);
    expect(RESET_HABITS.filter((h) => h.existingId).length).toBe(6);
    expect(RESET_HABITS.filter((h) => !h.existingId).map((h) => h.id)).toEqual([
      'eat_well',
      'mind_meditation',
      'outdoor_time',
      'skill_practice',
      'strength_log',
    ]);
  });

  it('never reuses a replaced habit’s id, and no catalog id looks like a habit of the person’s own', () => {
    expect(Object.keys(RETIRED_HABITS).sort()).toEqual(['confidence_talk', 'focus_deepwork', 'home_tidy']);
    for (const h of RESET_HABITS) {
      expect(RETIRED_HABITS[h.id]).toBeUndefined();
      expect(/^custom_\d+$/.test(h.id)).toBe(false);
    }
    for (const id of Object.keys(RETIRED_HABITS)) expect(habitScene(id, 'light')).toBeUndefined();
  });

  it('gives every habit a name, an actionable description, a category, ages, a completion and an inactive status', () => {
    for (const h of RESET_HABITS) {
      expect(h.description.length).toBeGreaterThan(10);
      expect(h.completion.criterion.length).toBeGreaterThan(10);
      expect(h.ages.adult.length).toBeGreaterThan(0);
      expect(h.availability.active).toBe(false);
      expect(h.availability.status).toBe('internal-test-candidate');
      expect(h.availability.beforeProduction.length).toBeGreaterThan(0);
    }
  });

  it('points art at scenes that exist, and everything else at the world-crop fallback', () => {
    for (const h of RESET_HABITS) {
      if (h.art === null) continue;
      expect(habitScene(h.art, 'light')).toBeDefined();
      expect(habitScene(h.art, 'dark')).toBeDefined();
    }
    // Every habit has its own scene, except the three new ones still waiting for theirs.
    expect(RESET_HABITS.filter((h) => !h.art).map((h) => h.id)).toEqual([
      'eat_well',
      'mind_meditation',
      'outdoor_time',
    ]);
    for (const h of RESET_HABITS) if (h.art) expect(h.art).toBe(h.id);
  });
});

describe('the exact approved targets', () => {
  it('match the specification tables', () => {
    const t = (id: string) => table(RESET_BY_ID[id]);
    expect(t('eat_well')).toEqual([
      ['Fruit or vegetables in one meal', 'Fruit or vegetables in one meal', 'Fruit or vegetables in one meal'],
      ['One balanced meal', 'One balanced meal', 'One balanced meal'],
      ['Two balanced meals', 'Two balanced meals', 'Two balanced meals'],
    ]);
    expect(INTENSITIES.map((i) => num(RESET_BY_ID.eat_well.targets[i].foundation))).toEqual([1, 1, 2]);
    expect(t('focus_top3')).toEqual([
      ['Finish your #1 task', 'Finish your #1 task before 15:00', 'Finish your top 2 tasks'],
      ['Finish your top 2 tasks', 'Finish your top 3 tasks', 'Finish your top 3, your #1 before noon'],
      ['Finish your top 3 tasks', 'Top 3, your #1 before noon', 'Top 3, your #1 before 10:00'],
    ]);
    expect(t('mind_read')).toEqual([
      ['10 min', '15 min', '20 min'],
      ['20 min', '25 min', '30 min'],
      ['30 min', '45 min', '60 min'],
    ]);
    expect(INTENSITIES.map((i) => PHASES.map((p) => RESET_BY_ID.mind_read.targets[i][p].pages))).toEqual([
      [5, 10, 15],
      [10, 15, 20],
      [20, 30, 40],
    ]);
    expect(t('mind_meditation')).toEqual([
      ['2 min', '2 min', '2 min'],
      ['5 min', '5 min', '5 min'],
      ['10 min', '10 min', '10 min'],
    ]);
    expect(t('move_walk')).toEqual([
      ['10 min of movement you choose', '15 min of movement you choose', '20 min of movement you choose'],
      ['20 min of movement you choose', '25 min of movement you choose', '30 min of movement you choose'],
      ['30 min of movement you choose', '40 min of movement you choose', '45 min of movement you choose'],
    ]);
    expect(INTENSITIES.map((i) => PHASES.map((p) => num(RESET_BY_ID.sleep_wake.targets[i][p])))).toEqual([
      [60, 45, 30],
      [45, 30, 20],
      [30, 20, 15],
    ]);
    expect(t('outdoor_time')).toEqual([
      ['5 min', '5 min', '5 min'],
      ['10 min', '10 min', '10 min'],
      ['20 min', '20 min', '20 min'],
    ]);
    for (const id of ['eat_well', 'mind_meditation', 'outdoor_time'])
      for (const i of INTENSITIES)
        for (const p of PHASES) expect(RESET_BY_ID[id].targets[i][p].schedule).toEqual({ kind: 'daily' });
    expect(t('skill_practice')).toEqual([
      ['10 min', '15 min', '20 min'],
      ['20 min', '30 min', '40 min'],
      ['40 min', '60 min', '90 min'],
    ]);
    expect(t('social_reach_out')).toEqual([
      ['1 person, 4 days a week', '1 person, 5 days a week', '1 person a day'],
      ['1 person a day', '2 people a day', '2 people a day, one of them a call'],
      ['2 people a day', '3 people a day', '3 people a day, one of them a call'],
    ]);
    expect(t('strength_log')).toEqual([
      ['2 sessions a week, ~20 min', '2 a week, ~30 min', '2 a week, ~30 min'],
      ['2 a week, ~30 min', '3 a week, ~40 min', '3 a week, ~45 min'],
      ['Your current sessions (2 or more)', 'Same, kept steady', 'Same, kept steady'],
    ]);
    expect(RESET_BY_ID.strength_log.targets.starter.mastery.optional).toBe('or 3 if it feels good');
    expect(RESET_BY_ID.strength_log.targets.challenge.mastery.optional).toBe('+1 a week only if you choose');
  });

  it('gives Less Scrolling the approved reductions, and the worked example from the specification', () => {
    const h = RESET_BY_ID.screen_app_limit;
    const reductions = INTENSITIES.map((i) => PHASES.map((p) => num(h.targets[i][p])));
    expect(reductions).toEqual([
      [15, 30, 45],
      [30, 60, 90],
      [45, 90, 120],
    ]);
    // Someone at 3 h a day: Starter 2 h 45 → 2 h 30 → 2 h 15; Challenge 2 h 15 → 1 h 30 → 1 h.
    expect(reductions[0].map((r) => scrollingLimit(180, r))).toEqual([165, 150, 135]);
    expect(reductions[2].map((r) => scrollingLimit(180, r))).toEqual([135, 90, 60]);
    // Never below 30 min, rounded to 15.
    expect(scrollingLimit(60, 45)).toBe(30);
    expect(scrollingLimit(100, 30)).toBe(75);
    // Recommended automatically from 60 min a day; below that it can be chosen, and a low starting point is kept.
    expect([scrollingRecommended(60), scrollingRecommended(45)]).toEqual([true, false]);
    expect(scrollingLimit(30, 45)).toBe(30);
    expect(scrollingLimit(20, 15)).toBe(20);
    // Never below the time the person says they need.
    expect(scrollingLimit(180, 120, 90)).toBe(90);
  });

  it('computes Sleep Routine’s “Up by” time from the person’s own wake time', () => {
    expect(upBy('07:15', 60)).toBe('08:15');
    expect(upBy('07:15', 20)).toBe('07:35');
    expect(upBy('23:50', 30)).toBe('00:20');
  });

  it('has nine valid targets per habit, with one unit and explicit frequencies', () => {
    for (const h of RESET_HABITS) {
      const all = INTENSITIES.flatMap((i) => PHASES.map((p) => h.targets[i][p]));
      expect(all).toHaveLength(9);
      expect(new Set(all.map((t) => t.unit)).size).toBe(1);
      for (const t of all) {
        expect(t.text.length).toBeGreaterThan(3);
        if (t.amount.kind === 'own') expect(t.amount.min <= t.amount.max && t.amount.min > 0).toBe(true);
        else expect(num(t)).toBeGreaterThan(0);
        expect(Number.isInteger(days(t)) && days(t) >= 1 && days(t) <= 7).toBe(true);
        if (t.schedule.kind === 'workdays') expect(t.schedule.days).toBeLessThanOrEqual(5);
        const kinds: Record<ResetHabit['frequency'], string[]> = {
          daily: ['daily'],
          weekly: ['weekly'],
          workdays: ['workdays'],
          sessions: ['sessions'],
          mixed: ['weekly', 'daily'],
        };
        expect([h.id, kinds[h.frequency].includes(t.schedule.kind)]).toEqual([h.id, true]);
      }
    }
  });

  it('never gets easier from phase to phase, or from a higher intensity to a lower one', () => {
    for (const h of RESET_HABITS) {
      for (const i of INTENSITIES)
        for (let k = 1; k < 3; k++) {
          const [a, b] = [h.targets[i][PHASES[k - 1]], h.targets[i][PHASES[k]]];
          expect([h.id, i, k, harder(b) >= harder(a), days(b) >= days(a)]).toEqual([h.id, i, k, true, true]);
          if (a.minutesPerDueDay !== null && b.minutesPerDueDay !== null)
            expect(b.minutesPerDueDay).toBeGreaterThanOrEqual(a.minutesPerDueDay);
        }
      for (const p of PHASES)
        for (let n = 1; n < 3; n++) {
          const [a, b] = [h.targets[INTENSITIES[n - 1]][p], h.targets[INTENSITIES[n]][p]];
          if (a.amount.kind !== b.amount.kind) continue; // Strength at Challenge is the person's own number
          expect([h.id, p, n, harder(b) >= harder(a), days(b) >= days(a)]).toEqual([h.id, p, n, true, true]);
        }
    }
  });

  it('keeps every focus or practice block within the 16–17 cap', () => {
    for (const h of RESET_HABITS)
      for (const i of INTENSITIES)
        for (const p of PHASES) {
          const t = h.targets[i][p];
          if (t.unit === 'minutes' && h.id === 'skill_practice')
            expect(num(t) / (t.blocks ?? 1)).toBeLessThanOrEqual(TEEN_FOCUS_MAX_MIN);
        }
  });
});

describe('experienced people', () => {
  it('can start at Challenge, whose first targets are above Starter’s last', () => {
    for (const h of RESET_HABITS) {
      const [first, last] = [h.targets.challenge.foundation, h.targets.starter.mastery];
      if (first.amount.kind === last.amount.kind) expect(harder(first)).toBeGreaterThanOrEqual(harder(last));
    }
  });

  it('aren’t turned away for already doing the habit', () => {
    const active: Profile = { ...ADULT, activeDays: '5p', phone: '6p' };
    for (const h of RESET_HABITS) expect([h.id, resetExclusion(h, active, 'challenge')]).toEqual([h.id, null]);
  });

  it('keep their own number of strength sessions: no automatic increase', () => {
    const c = RESET_BY_ID.strength_log.targets.challenge;
    for (const p of PHASES) {
      expect(c[p].amount).toEqual({ kind: 'own', min: 2, max: 7 });
      expect(c[p].schedule).toEqual({ kind: 'sessions', perWeek: 'own', maxPerDay: 1 });
    }
    expect(STRENGTH_RULES.autoIncreasesFrequency).toBe(false);
  });
});

describe('Strength Training: tracking only', () => {
  const strength = RESET_BY_ID.strength_log;

  it('is weekly sessions, at most one credited a day, never a daily obligation', () => {
    for (const i of INTENSITIES)
      for (const p of PHASES) {
        const t = strength.targets[i][p];
        expect(t.schedule.kind).toBe('sessions');
        if (t.schedule.kind === 'sessions') {
          expect(t.schedule.maxPerDay).toBe(1);
          if (typeof t.schedule.perWeek === 'number') expect(t.schedule.perWeek).toBeLessThan(7);
        }
      }
    expect(strength.frequency).toBe('sessions');
    expect(STRENGTH_RULES).toMatchObject({
      maxCreditedPerDay: 1,
      consecutiveDays: 'note',
      prescribesExercises: false,
      prescribesLoad: false,
    });
  });

  it('keeps the precaution exclusions and age rules', () => {
    for (const pre of ['heart', 'pregnancy', 'walkingDifficult'] as const)
      for (const i of INTENSITIES) expect(resetExclusion(strength, { ...ADULT, precautions: [pre] }, i)).not.toBeNull();
    for (const i of INTENSITIES)
      expect(resetExclusion(strength, { ...ADULT, precautions: 'unknown' }, i)).not.toBeNull();
    const joint: Profile = { ...ADULT, precautions: ['joint'] };
    expect(resetExclusion(strength, joint, 'starter')).not.toBeNull();
    expect(resetExclusion(strength, joint, 'standard')).toBeNull();
    expect(strengthNotes(joint)).toHaveLength(1);
    // 18+ only: the 16–17 rules stay in the catalog, but no intensity is open to anyone under 18.
    expect(strength.ages.teen).toEqual(['starter', 'standard']);
    for (const i of INTENSITIES)
      expect(resetExclusion(strength, TEEN, i)).toBe('Schwung is made for people 18 and older');
    expect(strengthNotes(TEEN)).toHaveLength(1);
    expect(strengthNotes({ ...ADULT, age: '65p' })).toHaveLength(1);
  });

  it('never releases the held exercise programmes', () => {
    const ids = new Set(RESET_HABITS.map((h) => h.id));
    for (const id of HELD_EXERCISE_PROGRAMMES) {
      expect(ids.has(id)).toBe(false);
    }
    expect(strings(RESET_HABITS).some((s) => HELD_EXERCISE_PROGRAMMES.some((id) => s.includes(id)))).toBe(false);
  });
});

describe('safety: existing exclusions preserved', () => {
  it('never offers anything under 18', () => {
    for (const h of RESET_HABITS)
      for (const i of INTENSITIES)
        for (const age of ['u16', '16_17'] as const) expect(resetExclusion(h, { ...ADULT, age }, i)).not.toBeNull();
  });

  it('uses Walk’s and Steady wake-up’s V2 rules', () => {
    const move = RESET_BY_ID.move_walk;
    for (const pre of ['heart', 'pregnancy', 'walkingDifficult'] as const)
      expect(resetExclusion(move, { ...ADULT, precautions: [pre] }, 'starter')).not.toBeNull();
    const sleep = RESET_BY_ID.sleep_wake;
    expect(resetExclusion(sleep, { ...ADULT, wake: { kind: 'shift' } }, 'starter')).not.toBeNull();
    expect(resetExclusion(sleep, { ...ADULT, wake: { kind: 'varies' } }, 'starter')).not.toBeNull();
  });

  it('uses App time’s phone-time rule for Less Scrolling (and covers social media too)', () => {
    const h = RESET_BY_ID.screen_app_limit;
    expect(resetExclusion(h, { ...ADULT, phone: '1_2' }, 'starter')).not.toBeNull();
    expect(resetExclusion(h, { ...ADULT, phone: 'lt1' }, 'starter')).not.toBeNull();
    expect(resetExclusion(h, ADULT, 'standard')).toBeNull(); // social media is the pull here
  });

  it('lets a plain adult take every other habit at every allowed intensity, in every adult age band', () => {
    for (const h of RESET_HABITS)
      for (const age of ['18_29', '30_49', '50_64', '65p'] as const)
        for (const i of h.ages.adult as Intensity[])
          expect([h.id, age, i, resetExclusion(h, { ...ADULT, age }, i)]).toEqual([h.id, age, i, null]);
  });
});

describe('Meditation, Eat Well and Time Outdoors wording', () => {
  const words = (id: string) => [RESET_BY_ID[id].description, ...RESET_BY_ID[id].notes].join(' ');

  it('makes no medical or therapeutic claims for Meditation, and counts guided practice', () => {
    expect(words('mind_meditation')).toMatch(/guided/);
    expect(words('mind_meditation')).not.toMatch(
      /anxiety|stress|depress|heal|cure|therap|treat|medical|blood pressure/i,
    );
  });

  it('keeps Eat Well inclusive: what a balanced meal is, any cuisine or way of eating, nothing to count or avoid', () => {
    const w = words('eat_well');
    expect(w).toMatch(/balanced meal/);
    expect(w).toMatch(/Any cuisine and any way of eating/);
    expect(w).toMatch(/Nothing to count or weigh, no foods to avoid/);
    expect(w).not.toMatch(/weight loss|lose weight|junk|bad food|good food|unhealthy|cheat|guilt|diet plan/i);
    expect(RESET_BY_ID.eat_well.personalization).toEqual([]);
  });

  it('counts only outdoor time the person chooses, never commutes or errands, and needs no exercise', () => {
    const w = words('outdoor_time');
    expect(w).toMatch(/No exercise needed/);
    expect(w).toMatch(/work or school and running errands don’t count, unless you add some outdoor time/);
  });
});

describe('approved product decisions', () => {
  it('records Less Scrolling as a self-reported limit, with an optional weekly Screen Time check', () => {
    expect(SCROLLING_RULES).toEqual({
      verification: 'self-reported',
      weeklyScreenTimeCheck: 'optional',
      missingWeeklyCheckInvalidatesDays: false,
    });
    expect(RESET_BY_ID.screen_app_limit.notes.join(' ')).toMatch(/can’t see your Screen Time/);
  });

  it('never implies automatic Screen Time verification', () => {
    const claims =
      /(schwung|we|app)\s+(checks?|verif|reads?|measures?|tracks?|detects?|sees?)\b[^.]*screen time|automatic(ally)?[^.]*screen time/i;
    for (const s of strings(RESET_HABITS)) expect([s, claims.test(s)]).toEqual([s, false]);
  });

  it('records the weekly-habit rules', () => {
    expect(WEEKLY_RULES).toEqual({
      restDayIsMiss: false,
      evaluatedSeparatelyFromDailyStreak: true,
      zeroAgainstTargetSucceeds: false,
      streakLossForWeeklyHabits: false,
    });
  });

  it('requires no projects, missions, capstones, journals or reflections', () => {
    const all = strings(RESET_HABITS);
    expect(all.length).toBeGreaterThan(150);
    const banned = /project|mission|capstone|journal|reflect|essay|destination|summit|ladder|transformation/i;
    for (const s of all) expect([s, banned.test(s)]).toEqual([s, false]);
    // Personal answers are short and mostly optional; the required ones are a single choice or time.
    for (const h of RESET_HABITS) expect(h.personalization.filter((x) => x.required).length).toBeLessThanOrEqual(1);
  });

  it('uses no prohibited or overclaiming language', () => {
    const banned =
      /\bcold\b|fasting|calorie|weight loss|\bdiet\b|glasses of water|5 ?a\.?m|proven|guarantee|scientific|validated/i;
    for (const s of strings(RESET_HABITS)) expect([s, banned.test(s)]).toEqual([s, false]);
  });
});
