import { describe, expect, it } from '@jest/globals';
import type { DayCell } from '../charts';
import { dayCells } from '../reset/charts';
import { absenceStart, comebackText, programAbsence } from '../reset/comeback';
import * as P from '../reset/pilot';

const cells = (states: DayCell['state'][]): DayCell[] =>
  states.map((state, i) => ({ day: i + 1, date: '', weekday: i % 7, state, done: [], skipped: [], planned: [] }));

describe('the welcome back', () => {
  it('needs two days with something due and no activity, just before today', () => {
    expect(absenceStart(cells(['full', 'unrecorded', 'today']), 3)).toBeNull();
    expect(absenceStart(cells(['full', 'unrecorded', 'missed', 'today']), 4)).toBe(2);
    // Today's own state never counts.
    expect(absenceStart(cells(['full', 'full', 'unrecorded', 'unrecorded', 'today']), 5)).toBe(3);
  });

  it('walks past days with nothing due, and stops at any activity (a deliberate skip included)', () => {
    expect(absenceStart(cells(['full', 'unrecorded', 'rest', 'rest', 'today']), 5)).toBeNull();
    expect(absenceStart(cells(['full', 'unrecorded', 'rest', 'missed', 'today']), 5)).toBe(2);
    expect(absenceStart(cells(['unrecorded', 'skipped', 'unrecorded', 'today']), 4)).toBeNull();
    expect(absenceStart(cells(['unrecorded', 'partial', 'unrecorded', 'unrecorded', 'today']), 5)).toBe(3);
  });

  it('speaks kindly, without guilt or streak talk', () => {
    for (let d = 1; d < 10; d++) {
      const t = comebackText(d);
      expect(`${t.title} ${t.body}`).not.toMatch(/streak|lost|miss|failed|behind|should/i);
    }
  });
});

// --- Over a real program, through Day 66 and beyond (docs/66_DAY_EXPERIENCE_AUDIT.md, B1) ---

const START = '2026-01-05'; // a Monday
const answers: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 60 };
const fresh = () => P.createPilot(answers, [{ habitId: 'mind_read', intensity: 'starter' }], START)!;
/** Read done on every day from `from` to `to`. */
const doneFrom = (p: P.PilotProgram, from: number, to: number) => {
  let q = p;
  for (let d = from; d <= to; d++) q = P.complete(q, 'mind_read', d).program;
  return q;
};
/** Shown on Habits today, as PilotToday decides: an absence, and not yet seen. */
const shows = (p: P.PilotProgram, today: number) => {
  const a = programAbsence(p, today);
  return a !== null && p.comeback?.seen !== a ? a : null;
};
const seen = (p: P.PilotProgram, start: number): P.PilotProgram => ({ ...p, comeback: { seen: start } });

describe('the welcome back over a program', () => {
  it('within the 66 days, decides exactly as from the Journey’s cells', () => {
    // Read on Days 1–9, away 10–19, back on 20 to 30, away 31–33, back 34; checked on every day.
    const p = doneFrom(doneFrom(doneFrom(fresh(), 1, 9), 20, 30), 34, 40);
    for (let today = 1; today <= 66; today++)
      expect(programAbsence(p, today)).toBe(absenceStart(dayCells(p, today), today));
    expect(programAbsence(p, 20)).toBe(10);
    expect(programAbsence(p, 34)).toBe(31);
    // One quiet day is not an absence.
    const one = doneFrom(doneFrom(fresh(), 1, 9), 11, 20);
    expect(programAbsence(one, 11)).toBeNull();
  });

  it('after Day 66 with Keep My Momentum: back on Day 91 after 10 days away (Days 81–90)', () => {
    const p = doneFrom(P.keepMomentum(doneFrom(fresh(), 1, 66), 67), 67, 80);
    expect(programAbsence(p, 91)).toBe(81);
    // Shown once: once seen, the same absence never comes back, on that day or the next.
    expect(shows(p, 91)).toBe(81);
    const after = doneFrom(seen(p, 81), 91, 92);
    expect(shows(after, 91)).toBeNull();
    expect(shows(after, 92)).toBeNull();
    // A later absence is a new one, welcomed in its turn (consecutive returns).
    const again = doneFrom(after, 93, 100);
    expect(shows(again, 104)).toBe(101);
    // A single quiet day after the summit is not an absence.
    expect(programAbsence(doneFrom(p, 81, 89), 91)).toBeNull();
  });

  it('from Day 66 straight into Keep My Momentum, the days run on: an absence across the summit counts', () => {
    // Away Days 65–68, Keep My Momentum chosen on Day 67 (tracking continuous from 67).
    const p = P.keepMomentum(doneFrom(fresh(), 1, 64), 67);
    expect(programAbsence(p, 69)).toBe(65);
  });

  it('never while the program waits for a choice, and never across the pause before a later choice', () => {
    const summit = doneFrom(fresh(), 1, 64); // Days 65–66 quiet
    // Waiting for a choice: nothing is tracked, nothing welcomed (before, this was also null).
    for (let today = 67; today <= 90; today++) expect(programAbsence(summit, today)).toBeNull();
    // Keep My Momentum chosen on Day 80: Days 67–79 were a pause, and the quiet Days 65–66 before it aren't joined
    // to anything after it.
    const later = P.keepMomentum(summit, 80);
    expect(programAbsence(later, 80)).toBeNull();
    expect(programAbsence(later, 81)).toBeNull();
    // Away from Day 80 itself: an absence of its own, from the choice on.
    expect(programAbsence(later, 82)).toBe(80);
  });

  it('a New Ascent starts clean: the previous climb’s absence is never welcomed in it', () => {
    const prev = doneFrom(P.keepMomentum(doneFrom(fresh(), 1, 66), 67), 67, 80); // away from Day 81
    const next = P.beginAscent(
      prev,
      answers,
      [{ habitId: 'mind_read', intensity: 'starter' }],
      [],
      '2026-04-06',
      92,
      6,
    )!;
    expect(next.comeback).toBeUndefined();
    // Day 1 of the new climb, done: nothing from the old one's 11 days away is carried in.
    const started = doneFrom(next, 1, 1);
    for (let today = 1; today <= 3; today++) expect(programAbsence(started, today)).toBeNull();
    // Its own absences are its own (Days 2–3 quiet, back on Day 4).
    expect(programAbsence(started, 4)).toBe(2);
  });

  it('changes nothing saved: days, XP, streak and history are the same before and after', () => {
    const p = doneFrom(P.keepMomentum(doneFrom(fresh(), 1, 66), 67), 67, 80);
    const before = JSON.stringify(p);
    programAbsence(p, 91);
    expect(JSON.stringify(p)).toBe(before);
    expect(P.pilotXp(p)).toBe(P.pilotXp(JSON.parse(before)));
    expect(P.pilotStreak(p, 91)).toBe(0);
  });
});
