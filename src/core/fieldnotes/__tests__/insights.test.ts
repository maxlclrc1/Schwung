import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../../dates';
import { CAVEAT, PATTERN_HEADING, RULES, summarize, summaryThrough } from '../insights';
import type { FnDay, FnRun, Rating } from '../types';

const START = '2026-03-02';
/** A run from a compact script: index 0 = day 1. `null` = nothing recorded that day. */
function run(script: (FnDay | null)[], goal: FnRun['goal'] = 'focus'): Pick<FnRun, 'startedAt' | 'days' | 'goal'> {
  const days: Record<string, FnDay> = {};
  script.forEach((d, i) => {
    if (d) days[dateForDay(START, i + 1)] = d;
  });
  return { startedAt: START, days, goal };
}
const n = (rating: Rating): FnDay => ({ rating });
const y = (rating?: Rating, when?: FnDay['when']): FnDay => ({
  tried: true,
  ...(rating ? { rating } : {}),
  ...(when ? { when } : {}),
});
const no = (rating?: Rating): FnDay => ({ tried: false, ...(rating ? { rating } : {}) });

describe('participation and notes are plain counts', () => {
  it('counts tried days of the experiment days so far, and notes of all days', () => {
    const s = summarize(run([n(3), n(2), null, y(4), no(), null, y()]), 7);
    expect(s.experimentDays).toBe(4);
    expect([s.tried, s.notTried, s.unanswered]).toEqual([2, 1, 1]);
    expect(s.notesGiven).toBe(3);
    expect(s.lines[0]).toBe('You tried it on 2 of 4 days.');
    expect(s.lines[1]).toBe('You noted your focus on 3 of 7 days.');
  });

  it('only counts today once something is recorded for it', () => {
    const r = run([n(3), n(3), n(3), y(4), null]);
    expect(summaryThrough(r, 5)).toBe(4);
    expect(summaryThrough(run([n(3), n(3), n(3), y(4), no()]), 5)).toBe(5);
  });
});

describe('missing notes are never zeros', () => {
  it('averages only the notes given, and an unrecorded day changes nothing', () => {
    const withGaps = summarize(run([n(3), null, n(3), y(5), y(), y(5), null, y(5)]), 8);
    const without = summarize(run([n(3), n(3), null, y(5), y(5), y(5)]), 6);
    expect(withGaps.baselineAvg).toBe(3);
    expect(withGaps.triedAvg).toBe(5);
    expect(withGaps.triedNotes).toEqual([5, 5, 5]);
    expect(without.triedAvg).toBe(5);
  });
});

describe('comparisons need enough notes, and say so when there are too few', () => {
  it('one starting note: no comparison, an honest "not enough" line', () => {
    const s = summarize(run([n(2), null, null, y(5), y(5), y(5), y(5)]), 7);
    expect(s.pattern).toBe('notEnough');
    expect(s.lines.join(' ')).toMatch(/aren’t enough notes yet/);
    expect(s.lines.join(' ')).not.toMatch(/higher|lower/);
  });

  it('two tried-day notes: still not enough', () => {
    const s = summarize(run([n(2), n(2), n(2), y(5), y(5), y(), no()]), 7);
    expect(s.pattern).toBe('notEnough');
  });

  it('higher: a clear, consistent gap, stated as counts of days, not a percentage', () => {
    const s = summarize(run([n(2), n(3), n(2), y(4), y(4), y(3), y(5)]), 7);
    expect(s.pattern).toBe('higher');
    expect(s.lines).toContain(
      'Your focus was higher than on your starting days on 4 of the 4 days you tried it and noted it.',
    );
    expect(s.lines).toContain('Average 4.0 on those days, 2.3 on your starting days (1–5).');
  });

  it('lower is reported as lower, with a heading that never sounds like success', () => {
    const s = summarize(run([n(4), n(4), n(5), y(3), y(3), y(2)]), 6);
    expect(s.pattern).toBe('lower');
    expect(PATTERN_HEADING[s.pattern]).not.toMatch(/great|well done|worked|success/i);
  });

  it('a small difference is "about the same"; inconsistent days are "mixed"', () => {
    expect(summarize(run([n(3), n(3), n(3), y(3), y(4), y(3)]), 6).pattern).toBe('same');
    // Average up by 0.5, but only half the days above the start.
    expect(summarize(run([n(3), n(3), n(3), y(5), y(2), y(5), y(2), y(5), y(2)]), 9).pattern).toBe('mixed');
  });

  it('tried vs not-tried days only with two notes on each side and a real gap', () => {
    const both = summarize(run([n(3), n(3), n(3), y(4), no(2), y(5), no(2), y(4)]), 8);
    expect(both.lines).toContain('On days you tried it, your focus averaged 4.3; on days you didn’t, 2.0.');
    const one = summarize(run([n(3), n(3), n(3), y(4), no(2), y(5), y(4)]), 7);
    expect(one.lines.some((l) => l.startsWith('On days you tried it, your focus averaged'))).toBe(false);
  });

  it('time of day needs three answers and a clear majority', () => {
    const s = summarize(run([n(3), n(3), n(3), y(3, 'morning'), y(3, 'morning'), y(3, 'evening'), y(3, 'morning')]), 7);
    expect(s.lines).toContain('You mostly tried it in the morning (3 of 4 times).');
    const split = summarize(run([n(3), n(3), n(3), y(3, 'morning'), y(3, 'evening'), y(3, 'afternoon')]), 6);
    expect(split.lines.some((l) => l.startsWith('You mostly'))).toBe(false);
  });
});

describe('honesty, checked over many random runs', () => {
  // A deterministic pseudo-random generator, so failures reproduce.
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
  const CAUSAL = /\bimprov|\bbecause\b|\bcaused?\b|\bmade (you|your)\b|\bboost|%|proves?\b|\bworks?\b/i;

  it('every statement follows the documented rules, and none claims a cause', () => {
    for (let k = 0; k < 4000; k++) {
      const script: (FnDay | null)[] = Array.from({ length: 14 }, (_, i) => {
        if (rnd() < 0.2) return null;
        const rating = rnd() < 0.25 ? undefined : ((1 + Math.floor(rnd() * 5)) as Rating);
        if (i < 3) return rating ? { rating } : null;
        const t = rnd();
        return { ...(t < 0.6 ? { tried: true } : t < 0.85 ? { tried: false } : {}), ...(rating ? { rating } : {}) };
      });
      const s = summarize(run(script), 14);
      for (const l of s.lines) expect([l, CAUSAL.test(l)]).toEqual([l, false]);
      const enough = s.baselineNotes.length >= RULES.minBaseline && s.triedNotes.length >= RULES.minTriedNotes;
      if (!enough) expect(s.pattern).toBe('notEnough');
      if (s.pattern === 'higher') {
        expect(s.triedAvg! - s.baselineAvg!).toBeGreaterThanOrEqual(RULES.meaningfulDiff);
        expect(s.triedNotes.filter((x) => x > s.baselineAvg!).length / s.triedNotes.length).toBeGreaterThanOrEqual(
          RULES.consistentShare,
        );
      }
      if (s.pattern === 'same') expect(Math.abs(s.triedAvg! - s.baselineAvg!)).toBeLessThan(RULES.meaningfulDiff);
      // Counts add up, and missing notes never count.
      expect(s.tried + s.notTried + s.unanswered).toBe(s.experimentDays);
      expect(s.notesGiven).toBe(script.filter((d) => d?.rating !== undefined).length);
    }
    expect(CAUSAL.test(CAVEAT.replace('not proof of what caused what', ''))).toBe(false);
  });
});
