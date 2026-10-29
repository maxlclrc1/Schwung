import { describe, expect, it } from '@jest/globals';
import type { DayCell } from '../charts';
import { absenceStart, comebackText } from '../reset/comeback';

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
