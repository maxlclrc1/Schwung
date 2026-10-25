import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../../dates';
import { EXERCISE_IDS } from '../../v2/exercise';
import { DEV_CLEARED } from '../../v2/gate';
import { BY_ID } from '../../v2/library';
import { FIXTURES } from '../../v2/__tests__/fixtures';
import { eligibilityProfile, experimentById, experimentOptions, GOALS } from '../catalog';
import { CAMPS, campReached, daysAway, stageOf, todaysAction } from '../journey';
import type { FnProfile, FnRun } from '../types';

const ADULT: FnProfile = { age: '18_29', precautions: [], fromSchwung: false };

describe('experiments come from reviewed habits and the plan’s own eligibility rules', () => {
  it('every goal has experiments, each a reviewed habit at the smallest step of its ladder', () => {
    for (const g of GOALS) {
      const opts = experimentOptions(g.id, ADULT);
      expect([g.id, opts.length >= 2]).toEqual([g.id, true]);
      for (const o of opts) {
        expect(DEV_CLEARED.has(o.habitId)).toBe(true);
        expect((EXERCISE_IDS as readonly string[]).includes(o.habitId)).toBe(false);
        expect(o.action).toBe(BY_ID[o.habitId].ladder(eligibilityProfile(g.id, ADULT, null))[0]);
        expect(experimentById(o.id)!.easier.length).toBeGreaterThan(0);
      }
    }
  });

  it('health answers: a heart condition or "prefer not to say" rules out the walking and breathing experiments', () => {
    const ids = (p: FnProfile, goal: 'energy' | 'calm') => experimentOptions(goal, p).map((o) => o.habitId);
    expect(ids(ADULT, 'energy')).toContain('move_walk');
    expect(ids(ADULT, 'calm')).toContain('mind_breathe');
    for (const p of [
      { ...ADULT, precautions: ['heart'] as FnProfile['precautions'] },
      { ...ADULT, precautions: ['pregnancy'] as FnProfile['precautions'] },
      { ...ADULT, precautions: 'unknown' as const },
    ]) {
      expect(ids(p, 'energy')).not.toContain('move_walk');
      expect(ids(p, 'calm')).not.toContain('mind_breathe');
    }
    expect(ids({ ...ADULT, precautions: ['walkingDifficult'] }, 'energy')).not.toContain('move_walk');
  });

  it('teens still get experiments; a Schwung profile is used read-only', () => {
    expect(experimentOptions('focus', { ...ADULT, age: '16_17' }).length).toBeGreaterThan(0);
    const C = FIXTURES['C · 28, energy'];
    const before = JSON.stringify(C);
    const opts = experimentOptions(
      'calm',
      { age: C.age as FnProfile['age'], precautions: C.precautions, fromSchwung: true },
      C,
    );
    expect(opts.length).toBeGreaterThan(0);
    expect(JSON.stringify(C)).toBe(before);
  });
});

describe('the 14-day journey', () => {
  const run: FnRun = {
    startedAt: '2026-03-02',
    goal: 'focus',
    profile: ADULT,
    experiment: { id: 'focus_read', habitId: 'mind_read', question: 'q', action: 'Read for 5 min' },
    days: {},
  };

  it('stages: starting point 1–3, experiment 4–10, discovery and decision 11–14, then done', () => {
    expect([1, 3, 4, 10, 11, 14, 15].map(stageOf)).toEqual([
      'baseline',
      'baseline',
      'experiment',
      'experiment',
      'decide',
      'decide',
      'done',
    ]);
  });

  it('camps are reached on their days; the field note needs day 14 and a decision', () => {
    const reached = (day: number, r = run) => CAMPS.filter((c) => campReached(c, day, r)).map((c) => c.key);
    expect(reached(1)).toEqual(['question']);
    expect(reached(4)).toEqual(['question', 'start']);
    expect(reached(11)).toEqual(['question', 'start', 'firstLook', 'discovery']);
    expect(reached(14)).toEqual(['question', 'start', 'firstLook', 'discovery']);
    expect(reached(14, { ...run, decision: 'keep' })).toContain('note');
  });

  it('days away counts only the unrecorded days right before today', () => {
    const r = { ...run, days: { [dateForDay(run.startedAt, 3)]: { rating: 3 as const } } };
    expect(daysAway(r, 4)).toBe(0);
    expect(daysAway(r, 7)).toBe(3);
  });

  it('after "make it easier", today’s action is the easier one', () => {
    expect(todaysAction(run)).toBe('Read for 5 min');
    expect(todaysAction({ ...run, decision: 'easier', next: { action: 'Read one page' } })).toBe('Read one page');
    expect(todaysAction({ ...run, decision: 'different', next: { action: 'x', experimentId: 'y' } })).toBe(
      'Read for 5 min',
    );
  });
});
