import { describe, expect, it } from '@jest/globals';
import { cellSummary, consistency } from '../charts';
import { dateForDay } from '../dates';
import { dayCell, habitBars, weeklyTrend } from '../reset/charts';
import { INTENSITIES, PHASES, RESET_BY_ID, RESET_HABITS } from '../reset/habits';
import { MINIMUM_CATALOGUE_VERSION, MINIMUMS, minimumAvailable, minimumCounted } from '../reset/minimum';
import { strongestHabit } from '../reset/observations';
import * as P from '../reset/pilot';
import type { HabitTrack } from '../reset/tracking';
import { minimumEffort } from '../../lib/flags';
import { t } from '../../i18n';

/*
 * Minimum Effort, screens and fixes (R2b): the approved minimums for every eligible habit, the versioned catalogue
 * that validates saved minimums, the launch switch, and the numbers the screens show (Journey, Insights, after 66).
 */

const START = '2026-01-05'; // a Monday
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 120,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
  pullMinutes: 120,
  strengthStart: 'sometimes',
  phone: '4_6',
};
type Intensity = (typeof INTENSITIES)[number];
const program = (ids: string[], intensity: Intensity = 'starter') =>
  P.createPilot(
    ANSWERS,
    ids.map((habitId) => ({ habitId, intensity })),
    START,
  )!;
const done = (p: P.PilotProgram, ids: string[], day: number) =>
  ids.reduce((q, id) => P.complete(q, id, day).program, p);
/** Recorded as the app does (the approved catalogue, no drafts). */
const min = (p: P.PilotProgram, ids: string[], day: number) =>
  ids.reduce((q, id) => P.setMinimum(q, id, day, true).program, p);
function forge(p: P.PilotProgram, id: string, day: number, track: Partial<HabitTrack>): P.PilotProgram {
  const key = dateForDay(p.startedAt, day);
  const log = p.logs[key] ?? { day, date: key, completed: [], planned: P.plannedOn(p, day, []) };
  return { ...p, logs: { ...p.logs, [key]: { ...log, track: { ...log.track, [id]: { v: 1, ...track } } } } };
}

const ELIGIBLE = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time', 'eat_well', 'social_reach_out'];
/** Each minimum's own size, in the target's terms. */
const MINIMUM_MINUTES: Record<string, number> = { mind_read: 2, mind_meditation: 1, move_walk: 2, outdoor_time: 2 };

describe('every eligible habit: only where the minimum is genuinely below the day’s target', () => {
  it('timed habits: offered exactly where the target asks more minutes than the minimum', () => {
    for (const id of Object.keys(MINIMUM_MINUTES))
      for (const intensity of INTENSITIES)
        for (const phase of PHASES) {
          const target = RESET_BY_ID[id].targets[intensity][phase].minutesPerDueDay ?? 0;
          expect([id, intensity, phase, minimumAvailable(id, { intensity, phase })]).toEqual([
            id,
            intensity,
            phase,
            target > MINIMUM_MINUTES[id],
          ]);
          // And every one of the catalogue's targets is longer, so each is offered at every level.
          expect(target).toBeGreaterThan(MINIMUM_MINUTES[id]);
        }
  });

  it('Eat Well: never at Starter, where the target is the minimum itself', () => {
    for (const phase of PHASES) {
      expect(minimumAvailable('eat_well', { intensity: 'starter', phase })).toBe(false);
      expect(minimumAvailable('eat_well', { intensity: 'standard', phase })).toBe(true);
      expect(minimumAvailable('eat_well', { intensity: 'challenge', phase })).toBe(true);
    }
    // The Starter target and the minimum ask the same thing.
    expect(t('engine.target.eatWell.starter').toLowerCase()).toContain('fruit or vegetables with one meal');
  });

  it('Stay Connected: only on daily levels asking for two or more people or a call', () => {
    for (const intensity of INTENSITIES)
      for (const phase of PHASES) {
        const tg = RESET_BY_ID.social_reach_out.targets[intensity][phase];
        const asksMore =
          tg.schedule.kind === 'daily' && tg.amount.kind === 'fixed' && (tg.amount.value >= 2 || !!tg.calls);
        expect(minimumAvailable('social_reach_out', { intensity, phase })).toBe(asksMore);
        if (asksMore) expect(tg.amount.kind === 'fixed' && tg.amount.value).toBeGreaterThanOrEqual(2);
      }
  });

  it('Sleep, Strength, Less Scrolling, the weekly habits and custom habits never have one', () => {
    for (const h of RESET_HABITS.filter((x) => !ELIGIBLE.includes(x.id)))
      for (const intensity of INTENSITIES)
        for (const phase of PHASES) {
          expect(minimumAvailable(h.id, { intensity, phase }, 'drafts')).toBe(false);
          expect(minimumCounted(h.id, { intensity, phase })).toBe(false);
        }
    let p = program(['mind_read']);
    const own = P.addCustomHabit(p, { name: 'Stretch', perWeek: 7 }, 1, 0)!;
    p = own.program;
    expect(P.minimumFor(p, own.id, 1, 'drafts')).toBe(false);
    expect(P.setMinimum(p, own.id, 1, true, 'drafts').program).toBe(p);
  });

  it.each(ELIGIBLE)('%s: record, upgrade to done, undo, remove — 5 XP, never stacked', (id) => {
    const p0 = program([id], id === 'eat_well' || id === 'social_reach_out' ? 'challenge' : 'starter');
    expect(P.minimumFor(p0, id, 1)).toBe(true);
    const a = min(p0, [id], 1);
    expect([P.minimumOn(a, id, 1), P.pilotXp(a), P.isDone(a, id, 1)]).toEqual([true, 5, false]);
    // Tapping again changes nothing (idempotent).
    expect(P.setMinimum(a, id, 1, true).program).toBe(a);
    const b = P.complete(a, id, 1).program;
    expect([P.minimumOn(b, id, 1), P.isDone(b, id, 1)]).toEqual([false, true]);
    expect(P.pilotXp(b)).toBe(P.pilotXp(P.complete(p0, id, 1).program)); // 10 + the full day, never +5 on top
    const c = P.toggle(b, id, 1).program; // undo the completion: back to the minimum underneath
    expect([P.minimumOn(c, id, 1), P.pilotXp(c)]).toEqual([true, 5]);
    const d = P.setMinimum(c, id, 1, false).program;
    expect([P.minimumOn(d, id, 1), P.pilotXp(d)]).toEqual([false, 0]);
  });

  it.each(ELIGIBLE)('%s: its approved wording, in both forms, in every language', (id) => {
    for (const form of ['inline', 'title'] as const) {
      const text = P.minimumText(id, form);
      expect(text.length).toBeGreaterThan(3);
      expect(text).not.toMatch(/[{}]/);
    }
    expect(P.minimumText('sleep_wake', 'title')).toBe('');
  });

  it('the approved English, word for word', () => {
    expect(ELIGIBLE.map((id) => P.minimumText(id, 'title'))).toEqual([
      'Read or listen for 2 minutes',
      'One quiet minute, any way you like',
      'Move for 2 minutes, any way you like',
      'Step outside for 2 minutes',
      'Fruit or vegetables in one meal',
      'One short message to someone you care about',
    ]);
    expect([t('today.habit.minimum'), t('today.habit.removeMinimum'), t('today.habit.minimumDone')]).toEqual([
      'Did the minimum',
      'Remove minimum',
      'Minimum done.',
    ]);
    expect(t('today.card.minimum')).toBe('Minimum done');
    expect(t('today.habit.minimumHint', { minimum: P.minimumText('mind_read', 'inline'), xp: 5 })).toBe(
      'The minimum is read or listen for 2 minutes. It counts as showing up: with your other habits, it can keep today in your streak (+5 XP). Partially completed earns +5 XP, without the streak.',
    );
  });
});

describe('the versioned catalogue: an edited backup can’t add a minimum Schwung never offered', () => {
  it('version 1, append-only: the six minimums, each offered since version 1', () => {
    expect(MINIMUM_CATALOGUE_VERSION).toBe(1);
    expect(
      Object.entries(MINIMUMS)
        .filter(([, m]) => m.since !== undefined)
        .map(([id, m]) => [id, m.since])
        .sort(),
    ).toEqual(ELIGIBLE.map((id) => [id, 1]).sort());
    expect(MINIMUMS.sleep_wake.since).toBeUndefined();
  });

  it('forged minimums are ignored for counting and XP, and the raw record is kept', () => {
    const cases: [string[], string, Intensity][] = [
      [['sleep_wake', 'mind_read'], 'sleep_wake', 'starter'],
      [['screen_app_limit', 'mind_read'], 'screen_app_limit', 'starter'],
      [['strength_log', 'mind_read'], 'strength_log', 'starter'],
      [['eat_well', 'mind_read'], 'eat_well', 'starter'], // Starter: the minimum is the target
      [['social_reach_out', 'mind_read'], 'social_reach_out', 'standard'], // Standard Foundation: 1 a day
    ];
    for (const [ids, id, intensity] of cases) {
      const base = done(program(ids, intensity), ['mind_read'], 1);
      const p = forge(base, id, 1, { minimum: true });
      expect([id, P.minimumOn(p, id, 1), P.dayOutcome(p, 1), P.pilotXp(p)]).toEqual([
        id,
        false,
        P.dayOutcome(base, 1),
        P.pilotXp(base),
      ]);
      expect(P.trackOf(P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!, id, 1).minimum).toBe(true);
    }
    // A custom habit, forged.
    const own = P.addCustomHabit(program(['mind_read']), { name: 'Stretch', perWeek: 7 }, 1, 0)!;
    const f = forge(own.program, own.id, 1, { minimum: true });
    expect([P.minimumOn(f, own.id, 1), P.pilotXp(f)]).toEqual([false, 0]);
  });

  it('a genuine minimum keeps counting where its level allowed it, whatever the habit is at now', () => {
    let p = program(['eat_well', 'mind_read'], 'standard');
    p = min(p, ['eat_well', 'mind_read'], 3);
    p = P.removeHabit(p, 'eat_well', 4)!;
    p = P.addHabit(p, {}, { habitId: 'eat_well', intensity: 'starter' }, 5)!;
    expect([P.dayOutcome(p, 3), P.pilotXp(p), P.minimumsOn(p, 3).sort()]).toEqual([
      'kept',
      10,
      ['eat_well', 'mind_read'],
    ]);
  });
});

describe('the launch switch: off for normal users until the safety wording is reviewed', () => {
  it('only development and internal (tester) builds offer it', () => {
    // Before launch (the switch itself is guarded by minimumLaunch.test.ts).
    expect(minimumEffort('production', false)).toBe(false);
    expect(minimumEffort('internal', false)).toBe(true);
    expect(minimumEffort('development', false)).toBe(true);
  });
});

/** Day 9 of a Starter program, four habits: a mix of full, kept and missed days. */
function hardWeek() {
  const FOUR = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time'];
  let p = program(FOUR);
  for (let d = 1; d <= 4; d++) p = done(p, FOUR, d);
  p = min(done(p, ['mind_read', 'move_walk', 'outdoor_time'], 5), ['mind_meditation'], 5); // kept: 3 done + 1 minimum
  p = min(p, FOUR, 6); // kept: minimums only
  p = done(p, ['mind_read'], 7); // missed: 1 of 4
  p = min(done(p, ['mind_read'], 8), ['move_walk'], 8); // missed: 2 of 4 is under 80%
  return p;
}

describe('progress display: the Journey’s kept days', () => {
  it('a kept day is marked kept; a day with minimums under 80% is a partial day, not kept', () => {
    const p = hardWeek();
    expect(dayCell(p, 4, 9)).not.toHaveProperty('kept');
    expect(dayCell(p, 5, 9)).toMatchObject({ state: 'partial', kept: true, minimum: ['mind_meditation'] });
    expect(dayCell(p, 6, 9)).toMatchObject({ state: 'partial', kept: true });
    expect(dayCell(p, 7, 9)).not.toHaveProperty('minimum');
    expect(dayCell(p, 8, 9)).toMatchObject({ state: 'partial', minimum: ['move_walk'] });
    expect(dayCell(p, 8, 9)).not.toHaveProperty('kept');
    expect(P.journeyStats(p, 9)).toMatchObject({ done: 4, kept: 2 });
  });

  it('the selected day’s words name what was done and what was at the minimum', () => {
    const p = hardWeek();
    const name = (id: string) => P.nameOf(p, id);
    expect(cellSummary(dayCell(p, 5, 9), name)).toBe(
      'Kept with the minimum. Done: Read Daily, Daily Movement, Time Outdoors. At the minimum: Meditation.',
    );
    expect(cellSummary(dayCell(p, 6, 9), name)).toBe(
      'Kept with the minimum. At the minimum: Read Daily, Meditation, Daily Movement, Time Outdoors.',
    );
    expect(cellSummary(dayCell(p, 8, 9), name)).toBe('Done: Read Daily. At the minimum: Daily Movement.');
    // Today, with a minimum recorded.
    const q = min(p, ['outdoor_time'], 9);
    expect(cellSummary(dayCell(q, 9, 9), name)).toBe('Today, still open. At the minimum: Time Outdoors.');
  });

  it('a habit’s recent days show its minimums (never as misses)', () => {
    const days = P.recentDays(hardWeek(), 'move_walk', 9);
    expect(days.map((d) => d.state)).toEqual([
      'done',
      'done',
      'done',
      'done',
      'done',
      'minimum',
      'missed',
      'minimum',
      'today',
    ]);
  });
});

describe('Insights: every count agrees with its percentage', () => {
  it('the weekly trend carries its minimums, included in the share', () => {
    const trend = weeklyTrend(hardWeek(), 9);
    const week1 = trend[0];
    expect(week1.state).toBe('closed');
    expect(week1.minimum).toBe(5); // Day 5: one, Day 6: four (Day 8 is in Week 2)
    expect(trend[1].minimum).toBe(1);
    expect(week1.share).toBeCloseTo((week1.done + week1.minimum!) / week1.eligible);
  });

  it('the strongest-habit observation names its minimums when its share includes them', () => {
    const bars = habitBars(hardWeek(), 9);
    const o = strongestHabit(bars.map((b) => ({ name: b.id, tally: b.tally })))!;
    const top = bars.find((b) => o.text.startsWith(b.id))!;
    expect(top.tally.minimum).toBeGreaterThan(0);
    const pct = Math.round(consistency(top.tally)! * 100);
    expect(o.text).toBe(
      `${top.id} is your most consistent habit: ${top.tally.done} of ${top.tally.eligible} times done and ${top.tally.minimum} at the minimum (${pct}%).`,
    );
    // Without minimums, the words are exactly as before.
    const plain = strongestHabit([
      { name: 'A', tally: { done: 8, eligible: 10 } },
      { name: 'B', tally: { done: 5, eligible: 10 } },
    ])!;
    expect(plain.text).toBe('A is your most consistent habit: 8 of 10 times (80%).');
  });

  it('the screens’ figure is consistency: full completions and minimums', () => {
    expect(consistency({ done: 17, eligible: 20, minimum: 2 })).toBeCloseTo(0.95);
    expect(consistency({ done: 17, eligible: 20 })).toBeCloseTo(0.85);
    expect(consistency({ done: 0, eligible: 0 })).toBeNull();
    expect(t('insights.ring.doneMinimum', { shown: 71, eligible: 77, minimum: 10 })).toBe(
      '71 of 77 habit opportunities, 10 at the minimum',
    );
    expect(
      t('insights.week.closedMinimum', { week: 3, range: '', pct: '100%', done: 22, eligible: 28, minimum: 6 }),
    ).toBe('Week 3: 100%, 22 of 28 done and 6 at the minimum.');
    expect(t('insights.ring.weekValueMinimum', { done: 17, eligible: 20, minimum: 2 })).toBe(
      '17 of 20 · 2 at the minimum',
    );
  });
});

describe('after Day 66: kept days are never shown as missed', () => {
  function momentum() {
    const THREE = ['mind_read', 'move_walk', 'outdoor_time'];
    let p = program(THREE);
    for (let d = 1; d <= 66; d++) p = done(p, THREE, d);
    p = P.keepMomentum(p, 67);
    p = done(p, THREE, 67);
    p = min(done(p, ['mind_read'], 68), ['move_walk', 'outdoor_time'], 68); // kept
    p = done(p, ['mind_read'], 69); // missed
    p = done(p, THREE, 70);
    return p;
  }

  it('the strip shows kept days as kept, misses as missed, and an open today as today', () => {
    expect(P.sinceSummitStrip(momentum(), 71)).toEqual(['counted', 'kept', 'missed', 'counted', 'today']);
    expect(P.sinceSummitStrip(min(momentum(), ['mind_read', 'move_walk', 'outdoor_time'], 71), 71)).toEqual([
      'counted',
      'kept',
      'missed',
      'counted',
      'kept',
    ]);
  });

  it('the panel’s numbers and caption report kept days beside counted ones', () => {
    const s = P.sinceSummit(momentum(), 71);
    expect(s).toMatchObject({ counted: 2, kept: 1, judged: 4, best: 2 });
    expect(P.recentDays80(momentum(), 71)).toMatchObject({ kept: 1 });
    expect(t('beyond.since.kept', { count: 1 })).toBe(
      'Plus 1 day kept with the minimum (the ringed dot): it keeps your streak going.',
    );
    expect(t('beyond.recent.kept', { count: 2 })).toBe('Plus 2 days kept with the minimum.');
  });

  it('a save without minimums after Day 66 shows exactly what it always did', () => {
    let p = program(['mind_read']);
    for (let d = 1; d <= 66; d++) p = done(p, ['mind_read'], d);
    p = P.keepMomentum(p, 67);
    p = done(p, ['mind_read'], 67);
    const strip = P.sinceSummitStrip(p, 69);
    expect(strip).toEqual(['counted', 'missed', 'today']);
    expect([P.dayResult(p, 67), P.dayResult(p, 68)]).toEqual(['counted', 'missed']);
    expect(P.sinceSummit(p, 69).kept).toBe(0);
  });
});
