/**
 * Calendar-date helpers. A "date key" is a local calendar date, YYYY-MM-DD.
 * All day math is done on calendar dates (never on elapsed milliseconds), so DST
 * shifts and timezone changes can't make a day disappear or repeat.
 */

export const PROGRAM_DAYS = 66;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const t = new Date(keyToUtc(key) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / 86_400_000);
}

/** Day 1 is the start date. Can be ≤ 0 if the clock moved backwards. */
export function dayNumber(startKey: string, todayKey: string): number {
  return daysBetween(startKey, todayKey) + 1;
}

export function dateForDay(startKey: string, day: number): string {
  return addDays(startKey, day - 1);
}

/** Yesterday's checklist can still be fixed until noon today. */
export function canEditYesterday(now: Date): boolean {
  return now.getHours() < 12;
}

/** "07:30" → { hour: 7, minute: 30 } */
export function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h || 0, minute: m || 0 };
}

export function formatTime(t: string): string {
  const { hour, minute } = parseTime(t);
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
