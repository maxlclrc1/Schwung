import { describe, expect, it } from '@jest/globals';
import { t } from '../../i18n';
import { buildExport } from '../dataExport';
import { readBackup } from '../dataImport';
import { PROGRAM_DAYS } from '../dates';
import { DEFAULT_REMINDERS } from '../reminders';
import { dayCells } from '../reset/charts';
import { RESET_HABITS, INTENSITIES, PHASES } from '../reset/habits';
import { activeDays, completeDaysSoFar, milestoneLine, summitWords } from '../reset/moments';
import * as P from '../reset/pilot';
import { nextRealEasier, sameTarget, stepUpStopped, type Level } from '../reset/readiness';

/*
 * Step 2 of the 66-day improvements (docs/66_DAY_EXPERIENCE_AUDIT.md): a "no" is respected, the moments say only what
 * happened, the welcome back's total is right for its scope, and "Make it easier" is always a real change.
 */

const START = '2026-01-05'; // a Monday
const ADULT: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 120, activeDays: '1_2' };
const read = () => P.createPilot(ADULT, [{ habitId: 'mind_read', intensity: 'starter' }], START)!;
/** Read done every day from `from` to `to`. */
const done = (p: P.PilotProgram, from: number, to: number) => {
  let q = p;
  for (let d = from; d <= to; d++) q = P.complete(q, 'mind_read', d).program;
  return q;
};
const offerOn = (p: P.PilotProgram, day: number) => P.offersNow(p, day, false)[0]?.offer ?? null;
const at = (p: P.PilotProgram, id: string, l: Level): P.PilotProgram => ({
  ...p,
  progression: { ...p.progression, [id]: { ...p.progression[id], eras: [{ ...l, fromDay: 1, reason: 'start' }] } },
});

describe('a "no" to a step up is respected', () => {
  /** Ready on Day 22: Read at Starter, Foundation → Momentum. */
  const ready = () => done(read(), 1, 21);

  it('one decline: the same offer waits seven days, then comes back once', () => {
    const p = ready();
    const offer = offerOn(p, 22)!;
    expect(offer).toMatchObject({ kind: 'step-up', to: { intensity: 'starter', phase: 'momentum' } });
    const once = done(P.decline(p, 'mind_read', offer, 22), 22, 28);
    expect(once.progression.mind_read.declined).toEqual({ to: offer.to, day: 22, count: 1 });
    for (let d = 23; d < 29; d++) expect(offerOn(done(once, 1, d - 1), d)).toBeNull();
    expect(offerOn(once, 29)).toMatchObject({ kind: 'step-up', to: offer.to });
  });

  it('two declines: never offered again on its own, whatever the phase; "Make it harder" stays', () => {
    const p = ready();
    const first = done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28);
    const twice = P.decline(first, 'mind_read', offerOn(first, 29)!, 29);
    expect(twice.progression.mind_read.declined?.count).toBe(2);
    const later = done(twice, 29, 66);
    for (let d = 29; d <= 66; d++) expect(offerOn(later, d)).toBeNull();
    // The person's own choice is always there: one step harder, from tomorrow.
    expect(P.harder(later, 'mind_read', 50)).toMatchObject({ level: { intensity: 'starter', phase: 'momentum' } });
  });

  it('saying the target is too easy (after the last no) makes it eligible again; before it, it doesn’t', () => {
    const p = ready();
    const first = done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28);
    // "Too easy" said between the two declines doesn't outlast the second "no".
    const early = P.feedback(first, 'mind_read', 'too-easy', 28);
    const twice = done(P.decline(early, 'mind_read', offerOn(early, 29)!, 29), 29, 40);
    expect(offerOn(twice, 41)).toBeNull();
    // Said again, after it: offered again (the cooldown since the last no has passed).
    const renewed = P.feedback(twice, 'mind_read', 'too-easy', 41);
    expect(stepUpStopped(renewed.progression.mind_read, { intensity: 'starter', phase: 'momentum' })).toBe(false);
    expect(offerOn(renewed, 42)).toMatchObject({ kind: 'step-up', to: { intensity: 'starter', phase: 'momentum' } });
    // Declined a third time: stopped again until the next "too easy".
    const third = done(P.decline(renewed, 'mind_read', offerOn(renewed, 42)!, 42), 42, 60);
    expect(third.progression.mind_read.declined?.count).toBe(3);
    expect(offerOn(third, 61)).toBeNull();
    // "Too hard" is not a request for more.
    expect(offerOn(P.feedback(third, 'mind_read', 'too-hard', 61), 62)).toBeNull();
  });

  it('a different step is offered as usual: declines of one never hold back another', () => {
    const p = ready();
    const first = done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28);
    const twice = P.decline(first, 'mind_read', offerOn(first, 29)!, 29);
    // The person later steps up on their own: the stopped offer is gone, and the next step (Mastery) is offered when
    // its phase opens.
    const chosen = P.harder(done(twice, 29, 30), 'mind_read', 31);
    if (!('program' in chosen)) throw new Error('blocked');
    const climbing = done(chosen.program, 31, 47);
    expect(climbing.progression.mind_read.declined).toBeUndefined();
    expect(offerOn(climbing, 48)).toMatchObject({ kind: 'step-up', to: { intensity: 'starter', phase: 'mastery' } });
    // And a stopped step-up never stops a lighter step being suggested when the habit is hard going: the same
    // stopped Read at Standard, done on 6 of Days 8–21 and skipped on the rest (recorded, not done).
    let hard: P.PilotProgram = at(twice, 'mind_read', { intensity: 'standard', phase: 'foundation' });
    hard = { ...hard, logs: {} };
    for (let d = 8; d <= 21; d++)
      hard = [8, 10, 12, 14, 16, 18].includes(d)
        ? P.complete(hard, 'mind_read', d).program
        : P.setSkipped(hard, 'mind_read', d, true).program;
    expect(stepUpStopped(hard.progression.mind_read, { intensity: 'starter', phase: 'momentum' })).toBe(true);
    expect(offerOn(hard, 22)).toMatchObject({ kind: 'step-down', to: { intensity: 'starter', phase: 'foundation' } });
  });

  it('doing nothing is neither a yes nor a no: an ignored offer stays, and nothing is counted', () => {
    const p = done(ready(), 22, 30);
    for (let d = 22; d <= 31; d++) expect(offerOn(p, d)?.kind).toBe('step-up');
    expect(p.progression.mind_read.declined).toBeUndefined();
    expect(P.levelFor(p, 'mind_read', 31)).toEqual({ intensity: 'starter', phase: 'foundation' });
  });

  it('survives a restart and a backup restore; a save from before counts as one decline', () => {
    const p = ready();
    const first = done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28);
    const twice = done(P.decline(first, 'mind_read', offerOn(first, 29)!, 29), 29, 40);
    // Restart: the save as stored, read back.
    const restarted = P.sanitizePilotProgram(JSON.parse(JSON.stringify(twice)))!;
    expect(restarted.progression.mind_read.declined?.count).toBe(2);
    expect(offerOn(restarted, 41)).toBeNull();
    // Backup and restore.
    const backup = JSON.stringify(
      buildExport({
        program: twice,
        saveVersion: 1,
        journeys: [],
        today: 41,
        themePreference: 'system',
        reminders: DEFAULT_REMINDERS,
        comebacks: true,
        recoveryCopies: [],
        now: new Date('2026-02-14T09:00:00Z'),
      }),
    );
    const restored = readBackup(backup, { version: 1, migrate: (state) => state });
    if (!restored.ok) throw new Error('restore failed');
    expect(offerOn(restored.backup.program, 41)).toBeNull();
    // A save from before counts were kept: one decline, so the next one is the second.
    const old = {
      ...first,
      progression: { mind_read: { ...first.progression.mind_read, declined: { to: offerOn(p, 22)!.to, day: 22 } } },
    };
    const next = P.decline(old, 'mind_read', offerOn(old, 29)!, 29);
    expect(next.progression.mind_read.declined?.count).toBe(2);
  });

  it('a New Ascent starts with no declines', () => {
    const p = ready();
    const twice = P.decline(
      done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28),
      'mind_read',
      offerOn(done(P.decline(p, 'mind_read', offerOn(p, 22)!, 22), 22, 28), 29)!,
      29,
    );
    const finished = P.keepMomentum(done(twice, 29, 66), 67);
    const next = P.beginAscent(
      finished,
      ADULT,
      [{ habitId: 'mind_read', intensity: 'starter' }],
      [],
      '2026-03-20',
      75,
      6,
    )!;
    expect(next.progression.mind_read.declined).toBeUndefined();
    expect(offerOn(done(next, 1, 21), 22)?.kind).toBe('step-up');
  });
});

describe('the moments say only what happened', () => {
  /** Read on the given days only. */
  const on = (days: number[]) => days.reduce((p, d) => P.complete(p, 'mind_read', d).program, read());
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  it('Day 7: "seven days of showing up" only after seven days with activity', () => {
    expect(milestoneLine(on(range(1, 7)), 7, 8)).toEqual({ key: 'line', count: 7 });
    expect(milestoneLine(on([1, 3, 6]), 7, 8)).toEqual({ key: 'lineSome', count: 3 });
    expect(milestoneLine(read(), 7, 8)).toEqual({ key: 'lineQuiet', count: 0 });
    // A deliberate skip and partial progress are recorded activity; days after the milestone don't count toward it.
    const skipped = P.setSkipped(on(range(1, 6)), 'mind_read', 7, true).program;
    expect(milestoneLine(skipped, 7, 8).key).toBe('line');
    const partly = P.setPartial(on(range(1, 6)), 'mind_read', 7, true).program;
    expect(milestoneLine(partly, 7, 8).key).toBe('line');
    expect(milestoneLine(on([...range(1, 6), 9, 10]), 7, 12)).toEqual({ key: 'lineSome', count: 6 });
    // It appears as Day 7 opens, before its habits: six days with activity and here on the seventh is a full week.
    expect(milestoneLine(on(range(1, 6)), 7, 7)).toEqual({ key: 'line', count: 6 });
    // Opening the app is not recorded activity: nothing done at all is still the quiet line, on the day or later.
    expect(milestoneLine(read(), 7, 7)).toEqual({ key: 'lineQuiet', count: 0 });
    // Shown later (back after a week away), the seventh day counts only if something was recorded on it.
    expect(milestoneLine(on(range(1, 6)), 7, 12)).toEqual({ key: 'lineSome', count: 6 });
  });

  it('Day 21: "the Foundation is laid" only when most days had activity; Day 44 is calendar words', () => {
    expect(milestoneLine(on(range(1, 11)), 21, 22).key).toBe('line');
    expect(milestoneLine(on(range(1, 10)), 21, 22).key).toBe('lineQuiet');
    // Ten days before it and here on Day 21 itself: most of the 21.
    expect(milestoneLine(on(range(1, 10)), 21, 21).key).toBe('line');
    expect(milestoneLine(read(), 44, 44).key).toBe('line');
  });

  it('the summit is everyone’s: its words claim the climb only when most of the 66 days had activity', () => {
    for (const p of [read(), on(range(1, 7)), on(range(1, 33)), on(range(1, 34)), on(range(1, 66))]) {
      // Reached by everyone after Day 66, whatever happened.
      expect(P.summitDue(p, 67)).toBe(true);
    }
    expect(summitWords(read())).toEqual({ headline: 'headlineQuiet', message: 'messageQuiet' });
    expect(summitWords(on(range(1, 33)))).toEqual({ headline: 'headlineQuiet', message: 'messageQuiet' });
    expect(summitWords(on(range(1, 34)))).toEqual({ headline: 'headline', message: 'message' });
    expect(activeDays(on(range(1, 66)), 1, PROGRAM_DAYS)).toBe(66);
  });

  it('the words themselves never invent effort, guilt or a finished habit', () => {
    const quiet = [
      t('ceremony.milestone.7.lineQuiet'),
      t('ceremony.milestone.21.lineQuiet'),
      t('ceremony.summit.headlineQuiet'),
      t('ceremony.summit.messageQuiet'),
    ].join(' ');
    expect(quiet).not.toMatch(/showing up|made it|laid|kept|yours now|should|missed|failed|behind/i);
    expect(t('ceremony.milestone.7.lineSome', { count: 3 })).toMatch(/3 of these seven days/);
    // No message promises that a small step makes a day count, or claims something was built.
    for (let i = 0; i < 3; i++) expect(t(`progress.comeback.${i}.body` as never)).not.toMatch(/plenty|enough|built/i);
    // Nothing claims a habit is now automatic.
    expect(t('ceremony.summit.message')).not.toMatch(/habits are yours now/i);
  });
});

describe('the welcome back’s total', () => {
  it('within the 66 days, the Journey’s own count of complete days', () => {
    const p = done(read(), 1, 30);
    for (const today of [5, 31, 66])
      expect(completeDaysSoFar(p, today)).toBe(dayCells(p, today).filter((c) => c.state === 'full').length);
  });

  it('after Day 66 with Keep My Momentum, the days since the summit count too; the 66-day numbers stay', () => {
    const p = done(P.keepMomentum(done(read(), 1, 66), 67), 67, 80);
    expect(completeDaysSoFar(p, 91)).toBe(66 + 14);
    // The Journey and summit numbers are the 66 days, as before.
    expect(dayCells(p, 91).filter((c) => c.state === 'full')).toHaveLength(66);
    // Waiting for a choice: nothing after Day 66 is tracked, so the total is the 66 days.
    expect(completeDaysSoFar(done(read(), 1, 66), 80)).toBe(66);
  });
});

describe('"Make it easier" is always a real change', () => {
  it('for every built-in habit at every level, the next easier step asks something different', () => {
    for (const h of RESET_HABITS)
      for (const intensity of INTENSITIES)
        for (const phase of PHASES) {
          const to = nextRealEasier(h.id, { intensity, phase });
          if (to) expect(sameTarget(h.id, { intensity, phase }, to)).toBe(false);
        }
  });

  it('a program saved at a level that asks the same as the one below steps down to a real target', () => {
    const p0 = P.createPilot(ADULT, [{ habitId: 'mind_meditation', intensity: 'standard' }], START)!;
    // Saved before Step 1: Meditation at Standard, stepped "up" to Momentum (still 5 minutes).
    const p = at(p0, 'mind_meditation', { intensity: 'standard', phase: 'momentum' });
    const r = P.easier(p, 'mind_meditation', 10);
    expect(r).toMatchObject({ level: { intensity: 'starter', phase: 'foundation' } });
    if (!('program' in r)) throw new Error('blocked');
    expect(P.targetText(r.program, 'mind_meditation', 11)).not.toBe(P.targetText(p, 'mind_meditation', 10));
    // Its saved level and past days are untouched until tomorrow, when the new target starts.
    expect(P.levelFor(r.program, 'mind_meditation', 10)).toEqual({ intensity: 'standard', phase: 'momentum' });
  });

  it('a step-down offer, too, goes to a real target', () => {
    const p0 = P.createPilot(ADULT, [{ habitId: 'mind_meditation', intensity: 'standard' }], START)!;
    const p = at(p0, 'mind_meditation', { intensity: 'standard', phase: 'momentum' });
    // Struggling: 3 of the 14 days before Day 22 done.
    const q = [8, 12, 16].reduce((x, d) => P.complete(x, 'mind_meditation', d).program, p);
    const withMisses = { ...q, logs: { ...q.logs } };
    for (let d = 1; d <= 21; d++)
      withMisses.logs = P.setSkipped(withMisses, 'mind_meditation', d, ![8, 12, 16].includes(d)).program.logs;
    expect(P.offersNow(withMisses, 22, false)[0]?.offer).toMatchObject({
      kind: 'step-down',
      to: { intensity: 'starter', phase: 'foundation' },
    });
  });

  it('the Starter floor and safety stay: nothing easier at Starter Foundation, a safety rule still blocks', () => {
    const p = read();
    expect(P.easier(p, 'mind_read', 3)).toEqual({ blocked: 'this is already the easiest target' });
    // Strength with a joint precaution can't go down to Starter (the clinician's routine comes first).
    const joint = {
      ...ADULT,
      precautions: ['joint'] as P.PilotAnswers['precautions'],
      strengthStart: 'sometimes' as const,
    };
    const s = P.createPilot(joint, [{ habitId: 'strength_log', intensity: 'standard' }], START)!;
    expect(P.easier(s, 'strength_log', 3)).toEqual({ blocked: expect.stringMatching(/physiotherapist|clinician/) });
  });
});
