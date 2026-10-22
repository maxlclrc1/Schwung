import { describe, expect, it } from '@jest/globals';
import { ANSWER_LABEL } from '../answers';
import { getHabit, levelUp } from '../habits';
import { GROWTH_NOTES, phasePreview, startingPoint } from '../onboarding';
import { buildPlan, toPlan } from '../plan';
import { LEVEL_UP_RUN, PHASE_START, reconcile, STEP_DOWN_MISSES } from '../progression';
import { ANSWER_VALUES, type Answers } from '../types';

const ALL: Answers[] = [];
for (const goal of ANSWER_VALUES.goal)
  for (const sleep of ANSWER_VALUES.sleep)
    for (const screen of ANSWER_VALUES.screen)
      for (const exercise of ANSWER_VALUES.exercise)
        for (const water of ANSWER_VALUES.water)
          for (const mind of ANSWER_VALUES.mind) ALL.push({ goal, sleep, screen, exercise, water, mind });

const CASES = ALL.map((a) => {
  const picks = buildPlan(a);
  return { a, picks, point: startingPoint(a, picks) };
});

/** Written out independently of the plan code: answers that call for no habit in their area. */
const HEALTHY: Record<string, string[]> = {
  sleep: ['7-8h', '8h+'],
  screen: ['<2h'],
  exercise: ['3-4x', '5x+'],
  water: ['2-3L', '3L+'],
  mind: ['most-days', 'daily'],
};
const RANK: Record<string, string[]> = {
  sleep: ['8h+', '7-8h', '6-7h', '5-6h', '<5h'],
  screen: ['<2h', '2-4h', '4-6h', '6-8h', '8h+'],
  exercise: ['5x+', '3-4x', '1-2x', 'rarely', 'never'],
  water: ['3L+', '2-3L', '1-2L', '0.5-1L', '<0.5L'],
  mind: ['daily', 'most-days', 'weekly', 'rarely', 'never'],
};
const AREAS = ['sleep', 'exercise', 'water', 'screen', 'mind'] as const;

describe('starting point', () => {
  it('covers every answer combination', () => expect(CASES).toHaveLength(18750));

  it('"Already working" lists exactly the healthy answers, in plan order', () => {
    for (const { a, point } of CASES) {
      expect(point.working.map((w) => w.area)).toEqual(AREAS.filter((k) => HEALTHY[k].includes(a[k])));
      for (const w of point.working) expect(w.text.length).toBeGreaterThan(0);
    }
  });

  it('never calls an area "already working" while the plan has a habit for that answer', () => {
    for (const { picks, point } of CASES) {
      const answerAreas = picks.filter((p) => p.source === 'answer').map((p) => answerAreaOf(p.habit.id));
      for (const w of point.working) expect(answerAreas).not.toContain(w.area);
    }
  });

  it('the lever is the hardest answer the plan has a habit for, quoted and shown with its real task', () => {
    for (const { a, picks, point } of CASES) {
      const lever = point.lever;
      if (!lever) {
        // Only when no answer called for a habit that made the plan.
        expect(picks.some((p) => p.source === 'answer')).toBe(false);
        continue;
      }
      const pick = picks.find((p) => p.habit.id === lever.habitId)!;
      expect(pick.source).toBe('answer');
      expect(lever.task).toBe(pick.habit.levels[pick.level]);
      expect(lever.answer).toBe((ANSWER_LABEL[lever.area] as Record<string, string>)[a[lever.area]]);
      // Nothing in the plan comes from a harder answer, and ties go to the more foundational area.
      const rank = (k: (typeof AREAS)[number]) => RANK[k].indexOf(a[k]);
      for (const k of AREAS) {
        if (HEALTHY[k].includes(a[k])) continue;
        const inPlan = picks.some((p) => p.source === 'answer' && answerAreaOf(p.habit.id) === k);
        if (!inPlan) continue;
        expect(rank(k)).toBeLessThanOrEqual(rank(lever.area));
        if (rank(k) === rank(lever.area)) expect(AREAS.indexOf(k)).toBeGreaterThanOrEqual(AREAS.indexOf(lever.area));
      }
    }
  });

  it('has a lever for everyone with any area to improve, and none for all-healthy answers', () => {
    for (const { a, point } of CASES) {
      const allHealthy = AREAS.every((k) => HEALTHY[k].includes(a[k]));
      expect(point.lever === null).toBe(allHealthy);
    }
  });

  it('backs up "at least one habit is there just for your goal" for every plan', () => {
    for (const { picks } of CASES) expect(picks.some((p) => p.forGoal)).toBe(true);
  });
});

describe('how it grows', () => {
  it('shows a habit from the plan, through the real phase level-ups', () => {
    for (const { picks } of CASES.filter((_, i) => i % 7 === 0)) {
      const { habitTitle, steps } = phasePreview(picks);
      const example = picks.find((p) => getHabit(p.habit.id)!.title === habitTitle)!;
      expect(example).toBeDefined();
      expect(example.level).toBe('easy');
      expect(steps.map((s) => [s.from, s.to])).toEqual([
        [1, PHASE_START[2] - 1],
        [PHASE_START[2], PHASE_START[3] - 1],
        [PHASE_START[3], 66],
      ]);

      // Run the actual phase changes on the started plan and compare levels.
      const plan = toPlan(picks);
      let state = { plan, appliedPhase: 1 };
      for (const [i, day] of [1, PHASE_START[2], PHASE_START[3]].entries()) {
        state = reconcile({
          ...state,
          startKey: '2026-01-01',
          logs: allDone(plan, day),
          today: day,
          yesterdayEditable: false,
        });
        const h = state.plan.find((p) => p.habitId === example.habit.id)!;
        expect(steps[i].level).toBe(h.level);
        expect(steps[i].text).toBe(example.habit.levels[h.level]);
      }
    }
  });

  it('every onboarding plan starts below the top level, so "each habit steps up one level" holds', () => {
    for (const { picks } of CASES) for (const p of picks) expect(levelUp(p.level)).not.toBe(p.level);
  });

  it('notes quote the real thresholds', () => {
    expect(GROWTH_NOTES[0]).toContain(`${LEVEL_UP_RUN} days in a row`);
    expect(GROWTH_NOTES[1]).toContain(`${STEP_DOWN_MISSES} days in a row`);
  });
});

/** Logs with every habit done on every day up to `day`, so no step-downs interfere. */
function allDone(plan: { habitId: string }[], day: number) {
  const ids = plan.map((p) => p.habitId);
  const logs: Record<string, { day: number; date: string; completed: string[]; planned: string[] }> = {};
  for (let d = 1; d <= day; d++) {
    const date = new Date(Date.UTC(2026, 0, d)).toISOString().slice(0, 10);
    logs[date] = { day: d, date, completed: ids, planned: ids };
  }
  return logs;
}

function answerAreaOf(id: string): string | undefined {
  if (id.startsWith('sleep_')) return 'sleep';
  if (id.startsWith('screen_')) return 'screen';
  if (id.startsWith('move_')) return 'exercise';
  if (id === 'water') return 'water';
  if (id.startsWith('mind_')) return 'mind';
}
