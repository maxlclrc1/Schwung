import { describe, expect, it } from '@jest/globals';
import type { DayCell, WeekPoint } from '../charts';
import { bestWeekday, streakNote, strongestHabit, weekChange, weeklyGoals } from '../reset/observations';

const week = (n: number, share: number | null, state: WeekPoint['state'] = 'closed'): WeekPoint => ({
  week: n,
  firstDay: (n - 1) * 7 + 1,
  lastDay: n * 7,
  days: 7,
  done: share === null ? 0 : Math.round(share * 10),
  eligible: share === null ? 0 : 10,
  share,
  state,
});
const day = (n: number, state: DayCell['state']): DayCell => ({
  day: n,
  date: '',
  weekday: (n - 1) % 7,
  state,
  done: [],
  skipped: [],
  planned: [],
});

describe('Insights observations: only what the saved days support', () => {
  it('compares the last two finished weeks, and says nothing with fewer', () => {
    expect(weekChange([week(1, 0.6), week(2, null, 'current')])).toBeNull();
    expect(weekChange([week(1, 0.6), week(2, 0.8)])?.text).toBe('Week 2 came in at 80%, up from 60% in Week 1.');
    expect(weekChange([week(1, 0.8), week(2, 0.78)])?.tone).toBe('steady');
  });

  it('names the most complete weekday only after two weeks of judged days', () => {
    const cells = Array.from({ length: 13 }, (_, i) => day(i + 1, 'full'));
    expect(bestWeekday(cells)).toBeNull();
    const two = Array.from({ length: 14 }, (_, i) => day(i + 1, i % 7 === 1 ? 'full' : 'partial'));
    expect(bestWeekday(two)?.text).toBe('Tuesdays have been your most complete days: 2 of 2 fully done.');
  });

  it('marks a strongest habit only with enough opportunities and more than one habit', () => {
    expect(strongestHabit([{ name: 'Read', tally: { done: 4, eligible: 4 } }])).toBeNull();
    expect(
      strongestHabit([
        { name: 'Read', tally: { done: 9, eligible: 10 } },
        { name: 'Walk', tally: { done: 5, eligible: 10 } },
      ])?.text,
    ).toBe('Read is your most consistent habit: 9 of 10 times (90%).');
  });

  it('reports weekly goals from two finished weeks, and the longest streak from three days', () => {
    expect(weeklyGoals([{ name: 'Strength', met: 1, judged: 1 }])).toEqual([]);
    expect(weeklyGoals([{ name: 'Strength', met: 2, judged: 3 }])[0].text).toBe(
      'Strength: weekly goal met in 2 of 3 finished weeks.',
    );
    expect(streakNote(2, 2)).toBeNull();
    expect(streakNote(4, 6)).toBeNull();
    expect(streakNote(5, 5)?.text).toBe('You’re on your longest streak so far: 5 days in a row.');
  });
});
