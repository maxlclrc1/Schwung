import { describe, expect, it } from '@jest/globals';
import { ascentDays, landmarkReached } from '../ascent';
import { cellSummary } from '../charts';
import { PROGRAM_DAYS } from '../dates';
import { dayCell } from '../reset/charts';
import { RESET_BY_ID, INTENSITIES, PHASES } from '../reset/habits';
import { minimumAvailable } from '../reset/minimum';
import * as P from '../reset/pilot';
import { t } from '../../i18n';

/*
 * Minimum Effort release-readiness review (after 1439345): the flows a person can tap through, end to end, and the
 * two bugs it found (the mountain overview drew kept days as missed; removing a habit after today's minimum said it
 * left from today while it leaves from tomorrow).
 */

const START = '2026-01-05';
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 120,
  skill: 'Language',
  activeDays: '1_2',
};
const FOUR = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time'];
const program = (ids: string[] = FOUR, intensity: 'starter' | 'standard' | 'challenge' = 'starter') =>
  P.createPilot(
    ANSWERS,
    ids.map((habitId) => ({ habitId, intensity })),
    START,
  )!;
const done = (p: P.PilotProgram, ids: string[], d: number) => ids.reduce((q, id) => P.complete(q, id, d).program, p);
const min = (p: P.PilotProgram, ids: string[], d: number, on = true) =>
  ids.reduce((q, id) => P.setMinimum(q, id, d, on).program, p);
const state = (p: P.PilotProgram, id: string, d: number) => ({
  done: P.isDone(p, id, d),
  minimum: P.minimumOn(p, id, d),
  skipped: !!P.trackOf(p, id, d).skipped,
  xp: P.pilotXp(p),
});

describe('flows: complete, minimum, undo and skip', () => {
  it('complete → undo → minimum → complete → undo → remove, XP exact at each step', () => {
    let p = program(['mind_read']);
    p = P.toggle(p, 'mind_read', 1).program;
    expect(P.minimumFor(p, 'mind_read', 1)).toBe(false); // nothing to offer once done
    p = P.toggle(p, 'mind_read', 1).program;
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: false, skipped: false, xp: 0 });
    p = min(p, ['mind_read'], 1);
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: true, skipped: false, xp: 5 });
    p = P.toggle(p, 'mind_read', 1).program;
    expect(state(p, 'mind_read', 1)).toMatchObject({ done: true, minimum: false });
    expect(P.pilotXp(p)).toBe(P.pilotXp(P.toggle(program(['mind_read']), 'mind_read', 1).program));
    p = P.toggle(p, 'mind_read', 1).program;
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: true, skipped: false, xp: 5 });
    p = min(p, ['mind_read'], 1, false);
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: false, skipped: false, xp: 0 });
  });

  it('skip ↔ minimum: each replaces the other, never both', () => {
    let p = P.setSkipped(program(['mind_read', 'outdoor_time']), 'mind_read', 1, true).program;
    p = min(p, ['mind_read'], 1);
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: true, skipped: false, xp: 5 });
    p = P.setSkipped(p, 'mind_read', 1, true).program;
    expect(state(p, 'mind_read', 1)).toEqual({ done: false, minimum: false, skipped: true, xp: 0 });
  });

  it('partial progress and a minimum: 5 XP once; removing one keeps the other', () => {
    let p = P.setPartial(program(['mind_read']), 'mind_read', 1, true).program;
    p = min(p, ['mind_read'], 1);
    expect(P.pilotXp(p)).toBe(5);
    p = min(p, ['mind_read'], 1, false);
    expect([P.pilotXp(p), P.minimumOn(p, 'mind_read', 1)]).toEqual([5, false]);
  });

  it('counters (Eat Well, Stay Connected): reaching the number completes; going back under returns to the minimum', () => {
    for (const id of ['eat_well', 'social_reach_out']) {
      let p = min(program([id], 'challenge'), [id], 1);
      const goal = P.counterTarget(p, id, 1)!;
      for (let i = 0; i < goal; i++) p = P.count(p, id, 1, 1).program;
      expect([id, P.isDone(p, id, 1), P.minimumOn(p, id, 1)]).toEqual([id, true, false]);
      p = P.count(p, id, 1, -1).program;
      expect([id, P.isDone(p, id, 1), P.minimumOn(p, id, 1), P.pilotXp(p)]).toEqual([id, false, true, 5]);
    }
  });
});

describe('kept-day streaks', () => {
  it('kept days continue the streak, a miss ends it, and full days stay counted apart', () => {
    let p = program();
    p = done(p, FOUR, 1);
    p = min(p, FOUR, 2); // kept
    p = min(done(p, ['mind_read', 'move_walk'], 3), ['mind_meditation'], 3); // kept: 2 done + 1 minimum of 4
    expect(P.pilotStreak(p, 4)).toBe(3);
    expect(P.journeyStats(p, 4)).toMatchObject({ done: 1, kept: 2, streak: 3, best: 3 });
    p = done(p, ['mind_read'], 4); // missed: a grace day, carried over
    expect(P.pilotStreak(p, 5)).toBe(3);
    p = done(p, ['mind_read'], 5); // missed again: two in a row end it
    expect(P.pilotStreak(p, 6)).toBe(0);
    expect(P.journeyStats(p, 6)).toMatchObject({ done: 1, kept: 2, best: 3 });
  });
});

describe('fix: the mountain overview never draws a kept day as missed', () => {
  it('a kept day is "kept", a miss is "missed", and counts of done days are unchanged', () => {
    let p = program();
    p = done(p, FOUR, 1);
    p = min(p, FOUR, 2);
    p = done(p, ['mind_read'], 3);
    const today = 4;
    const kept = (d: number) => d < today && P.dayOutcome(p, d) === 'kept';
    const rest = (d: number) => d < today && P.dayResult(p, d) === 'rest';
    const days = ascentDays(p.logs, p.startedAt, today, rest, kept);
    expect(days.slice(0, 4).map((d) => d.status)).toEqual(['done', 'kept', 'missed', 'today']);
    expect(days.filter((d) => d.status === 'done')).toHaveLength(1);
    // Without the kept rule (and in every save without minimums) it's exactly as before.
    expect(
      ascentDays(p.logs, p.startedAt, today, rest)
        .slice(0, 3)
        .map((d) => d.status),
    ).toEqual(['done', 'missed', 'missed']);
  });
});

describe('fix: removing a habit after today’s minimum', () => {
  it('the words say what removeHabit does: it leaves from tomorrow and today stays kept', () => {
    const p = min(program(['mind_read', 'outdoor_time']), ['mind_read', 'outdoor_time'], 3);
    expect(P.removalStays(p, 'mind_read', 3)).toBe('minimum');
    expect(P.leavesText('minimum')).toBe('It leaves from tomorrow (today’s minimum stays).');
    const q = P.removeHabit(p, 'mind_read', 3)!;
    expect([P.minimumOn(q, 'mind_read', 3), P.dayOutcome(q, 3), P.pilotXp(q)]).toEqual([true, 'kept', 10]);
    // Done, and neither: as before.
    expect(P.removalStays(done(program(['mind_read']), ['mind_read'], 3), 'mind_read', 3)).toBe('done');
    expect(P.leavesText('done')).toBe(t('today.habit.leavesTomorrow'));
    expect(P.removalStays(program(['mind_read']), 'mind_read', 3)).toBeNull();
    expect(P.leavesText(null)).toBe(t('today.habit.leavesToday'));
  });
});

describe('Read Daily: pages mode is never offered, so no "one page" minimum appears', () => {
  it('every Read Daily target and its minimum are in minutes', () => {
    const p = program(['mind_read']);
    expect(P.targetText(p, 'mind_read', 1)).toBe('Read for 10 minutes');
    expect(P.minimumText('mind_read', 'title')).toBe('Read or listen for 2 minutes');
    expect(P.minimumText('mind_read', 'inline')).not.toMatch(/page/i);
    expect(P.progressKind(p, 'mind_read', 1).kind).toBe('minutes');
    // The catalogue's pages are data only: no answer selects them.
    expect('readingMode' in p.answers).toBe(false);
    for (const i of INTENSITIES)
      for (const ph of PHASES) expect(RESET_BY_ID.mind_read.targets[i][ph].minutesPerDueDay).toBeGreaterThan(2);
  });
});

describe('Journey and Insights wording on a kept day', () => {
  it('the day entry and its outcome agree', () => {
    const p = min(done(program(), ['mind_read', 'move_walk'], 1), ['mind_meditation'], 1);
    expect(P.dayOutcome(p, 1)).toBe('kept');
    expect(cellSummary(dayCell(p, 1, 2), (id) => P.nameOf(p, id))).toMatch(/^Kept with the minimum\./);
  });

  it('after the summit, a whole run kept with minimums keeps the streak going', () => {
    let p = program(['mind_read']);
    for (let d = 1; d <= PROGRAM_DAYS; d++) p = done(p, ['mind_read'], d);
    p = P.keepMomentum(p, 67);
    for (let d = 67; d <= 70; d++) p = min(p, ['mind_read'], d);
    expect(P.sinceSummitStrip(p, 71)).toEqual(['kept', 'kept', 'kept', 'kept', 'today']);
    expect(P.sinceSummit(p, 71)).toMatchObject({ counted: 0, kept: 4, best: 4 });
    expect(P.pilotStreak(p, 71)).toBe(PROGRAM_DAYS + 4);
  });
});

describe('final product changes (after c264a32)', () => {
  it('the recorded hint never nests parentheses, for every eligible habit and level', () => {
    const levels: [string, 'starter' | 'standard' | 'challenge'][] = [
      ['mind_read', 'starter'],
      ['mind_meditation', 'standard'],
      ['move_walk', 'challenge'],
      ['outdoor_time', 'starter'],
      ['eat_well', 'standard'],
      ['social_reach_out', 'challenge'],
    ];
    for (const [id, intensity] of levels) {
      const p = program([id], intensity);
      const text = t('today.habit.minimumHintDone', {
        minimum: P.minimumText(id, 'title'),
        target: P.targetText(p, id, 1),
      });
      let depth = 0;
      let deepest = 0;
      for (const ch of text) {
        if (ch === '(') deepest = Math.max(deepest, ++depth);
        if (ch === ')') depth--;
      }
      expect([id, deepest]).toEqual([id, id === 'social_reach_out' ? 1 : 0]);
    }
    expect(
      t('today.habit.minimumHintDone', {
        minimum: 'One short message',
        target: 'Reach out to 2 people (more than a like)',
      }),
    ).toBe(
      'One short message counts as showing up today. Your goal stays the same: Reach out to 2 people (more than a like). Doing it in full still counts as done.',
    );
  });

  it('the available hint keeps “can keep today in your streak”', () => {
    expect(t('today.habit.minimumHint', { minimum: 'x', xp: 5 })).toContain('it can keep today in your streak (+5 XP)');
  });

  it('Time Outdoors has its safety note; no other minimum has one', () => {
    expect(P.minimumNote('outdoor_time')).toBe(
      'A doorstep, balcony or garden counts. Don’t go outside when conditions aren’t safe.',
    );
    for (const id of ['mind_read', 'mind_meditation', 'move_walk', 'eat_well', 'social_reach_out', 'sleep_wake'])
      expect(P.minimumNote(id)).toBeNull();
  });

  it('Movement: no minimum for “Rather not say” or a 16–17 program; the habit itself stays available', () => {
    const unknown = P.createPilot(
      { ...ANSWERS, precautions: 'unknown' },
      [
        { habitId: 'move_walk', intensity: 'starter' },
        { habitId: 'mind_read', intensity: 'starter' },
      ],
      START,
    )!;
    expect(unknown.habits).toContain('move_walk'); // eligibility unchanged
    expect(P.minimumFor(unknown, 'move_walk', 1)).toBe(false);
    expect(P.setMinimum(unknown, 'move_walk', 1, true).program).toBe(unknown);
    expect(P.minimumFor(unknown, 'mind_read', 1)).toBe(true); // other minimums unchanged
    // A 16–17 program (already paused until the person confirms 18+), and the rule itself.
    const teen = { ...program(), answers: { ...program().answers, age: '16_17' as const } };
    expect(P.minimumFor(teen, 'move_walk', 1)).toBe(false);
    const lvl = { intensity: 'starter' as const, phase: 'foundation' as const };
    expect(minimumAvailable('move_walk', lvl, 'approved', { age: '16_17', precautions: [] })).toBe(false);
    expect(minimumAvailable('move_walk', lvl, 'approved', { age: '30_49', precautions: 'unknown' })).toBe(false);
    expect(minimumAvailable('move_walk', lvl, 'approved', { age: '30_49', precautions: [] })).toBe(true);
    expect(minimumAvailable('outdoor_time', lvl, 'approved', { age: '30_49', precautions: 'unknown' })).toBe(true);
    // A minimum already saved counts as it was recorded (counting never re-judges the person).
    const saved = P.setMinimum(program(['move_walk']), 'move_walk', 1, true).program;
    const later = { ...saved, answers: { ...saved.answers, precautions: 'unknown' as const } };
    expect([P.minimumOn(later, 'move_walk', 1), P.dayOutcome(later, 1), P.pilotXp(later)]).toEqual([true, 'kept', 5]);
  });

  it('milestones are reached by the calendar; a kept milestone day keeps its seed', () => {
    let p = program();
    for (let d = 1; d <= 6; d++) p = done(p, FOUR, d);
    p = min(p, FOUR, 7); // Day 7, the first milestone, kept with minimums
    const today = 9;
    const kept = (d: number) => d < today && P.dayOutcome(p, d) === 'kept';
    const days = ascentDays(p.logs, p.startedAt, today, undefined, kept);
    expect(days[6]).toMatchObject({ day: 7, landmark: true, status: 'kept' });
    expect(landmarkReached(days[6])).toBe(true);
    expect(landmarkReached({ status: 'missed' })).toBe(true);
    expect(landmarkReached({ status: 'done' })).toBe(true);
    expect(landmarkReached({ status: 'today' })).toBe(true);
    expect(landmarkReached(days[20])).toBe(false); // Day 21, still ahead
    expect(dayCell(p, 7, today)).toMatchObject({ kept: true });
  });
});
