import { describe, expect, it } from '@jest/globals';
import { addDays, canEditYesterday, dateForDay, dayNumber, daysBetween, toDateKey } from '../dates';

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('counts the start date as day 1', () => {
    expect(dayNumber('2026-10-20', '2026-10-20')).toBe(1);
    expect(dayNumber('2026-10-20', '2026-10-21')).toBe(2);
  });

  it('starts on any weekday', () => {
    // A Thursday start is just as valid as a Monday.
    expect(dayNumber('2026-10-22', '2026-10-28')).toBe(7);
  });

  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(daysBetween('2026-01-01', '2027-01-01')).toBe(365);
    expect(dateForDay('2026-10-20', 66)).toBe('2026-12-24');
  });

  it('is unaffected by DST transitions (calendar math, not elapsed time)', () => {
    // US DST ends 2026-11-01, EU DST ends 2026-10-25.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
  });

  it('keeps counting correctly across a long gap', () => {
    expect(dayNumber('2026-10-20', addDays('2026-10-20', 30))).toBe(31);
  });

  it('gives a non-positive day if the clock goes backwards', () => {
    expect(dayNumber('2026-10-20', '2026-10-19')).toBe(0);
  });

  it('uses the device local date, so a timezone change moves the day with the wall clock', () => {
    // Late evening in one zone is already tomorrow in another: the key we store
    // is whatever the device calendar says, and day math only ever uses keys.
    const start = '2026-10-20';
    expect(dayNumber(start, '2026-10-20')).toBe(1);
    expect(dayNumber(start, '2026-10-21')).toBe(2);
  });

  it('allows fixing yesterday only before noon', () => {
    expect(canEditYesterday(new Date(2026, 9, 20, 11, 59))).toBe(true);
    expect(canEditYesterday(new Date(2026, 9, 20, 12, 0))).toBe(false);
  });
});
