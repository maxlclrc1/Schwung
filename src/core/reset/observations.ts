import { formatPercent, t, type TKey } from '../../i18n';
import type { DayCell, Tally, WeekPoint } from '../charts';

/*
 * Insights' "What can I learn?": short observations, each stated only when the saved days support it (enough
 * finished weeks, judged days or opportunities), worded as what happened, never as a guess or a pep talk. Pure: the
 * screen passes in what reset/charts.ts and reset/pilot.ts already computed.
 */

export type Observation = { id: string; text: string; tone: 'up' | 'steady' | 'down' | 'note' };

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const pct = (share: number) => Math.round(share * 100);
const pctText = (share: number) => formatPercent(pct(share) / 100);

/** The last two finished weeks compared (needs both). */
export function weekChange(points: WeekPoint[]): Observation | null {
  const closed = points.filter((p) => p.state === 'closed' && p.share !== null);
  if (closed.length < 2) return null;
  const [a, b] = closed.slice(-2);
  const d = pct(b.share!) - pct(a.share!);
  const text = t(
    Math.abs(d) < 5 ? 'progress.observation.steady' : d > 0 ? 'progress.observation.up' : 'progress.observation.down',
    {
      week: b.week,
      pct: pctText(b.share!),
      prev: a.week,
      prevPct: pctText(a.share!),
    },
  );
  return { id: 'week', text, tone: Math.abs(d) < 5 ? 'steady' : d > 0 ? 'up' : 'down' };
}

/** The weekday with the most complete days, once there are two weeks of judged days. */
export function bestWeekday(cells: DayCell[]): Observation | null {
  // Judged days only: finished, with something due.
  const judged = cells.filter((c) => ['full', 'partial', 'missed', 'skipped', 'unrecorded'].includes(c.state));
  if (judged.length < 14) return null;
  const by = WEEKDAYS.map((_, w) => {
    const days = judged.filter((c) => c.weekday === w);
    return { w, n: days.length, full: days.filter((c) => c.state === 'full').length };
  }).filter((x) => x.n >= 2);
  if (!by.length) return null;
  const best = by.reduce((a, b) =>
    b.full / b.n > a.full / a.n || (b.full / b.n === a.full / a.n && b.n > a.n) ? b : a,
  );
  if (best.full === 0) return null;
  return {
    id: 'weekday',
    text: t('progress.observation.weekday', {
      days: t(`progress.weekdaysPlural.${best.w}` as TKey),
      full: best.full,
      count: best.n,
    }),
    tone: 'note',
  };
}

/** The habit done most consistently (with enough opportunities to mean something), when there's more than one. */
export function strongestHabit(habits: { name: string; tally: Tally }[]): Observation | null {
  const ranked = habits.filter((h) => h.tally.eligible >= 5);
  if (ranked.length < 2) return null;
  const top = ranked.reduce((a, b) => (b.tally.done / b.tally.eligible > a.tally.done / a.tally.eligible ? b : a));
  const share = top.tally.done / top.tally.eligible;
  if (share < 0.5) return null;
  return {
    id: 'habit',
    text: t('progress.observation.habit', {
      habit: top.name,
      done: top.tally.done,
      eligible: top.tally.eligible,
      pct: pctText(share),
    }),
    tone: 'up',
  };
}

/** Weekly goals met in finished weeks, for each weekly habit that has some. */
export function weeklyGoals(bars: { name: string; met: number; judged: number }[]): Observation[] {
  return bars
    .filter((b) => b.judged >= 2)
    .map((b) => ({
      id: `goal-${b.name}`,
      text: t('progress.observation.goals', { habit: b.name, met: b.met, judged: b.judged }),
      tone: b.met === b.judged ? 'up' : 'note',
    }));
}

/** On the longest streak so far (worth saying from three days). */
export function streakNote(streak: number, best: number): Observation | null {
  if (streak < 3 || streak < best) return null;
  return { id: 'streak', text: t('progress.observation.streak', { count: streak }), tone: 'up' };
}
