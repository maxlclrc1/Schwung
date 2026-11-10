import { RESET_BY_ID, type Phase, type Intensity } from './habits';

/*
 * Minimum Effort's per-habit minimums (docs/MINIMUM_EFFORT_SPEC.md §3). Pure data and one rule.
 *
 * A minimum is a one-day fallback below the day's target, never a level. It's offered only where the day's target
 * asks strictly more than it (otherwise it would be the target itself).
 *
 * The review gate: no minimum is approved yet. Each one needs its wording and a safety review before it can be
 * recorded, so in the app (`review: 'approved'`, the default everywhere) none is available and the feature can't be
 * reached. Tests and development previews pass `review: 'drafts'`. A `disabled` minimum is never available, drafts
 * or not. The wording itself is added with the screens (phase R2b), after review.
 *
 * Counting never consults this table: a recorded minimum keeps its day's outcome even if a minimum is later changed
 * or withdrawn (pilot.ts `minimumOn`).
 */

export type MinimumStatus = 'draft' | 'approved' | 'disabled';
/** Which minimums may be recorded: only approved ones (the app), or drafts too (tests and previews). */
export type MinimumReview = 'approved' | 'drafts';

type Level = { intensity: Intensity; phase: Phase };

type MinimumDef = {
  status: MinimumStatus;
  /** Why a disabled or excluded minimum isn't available (for reviewers). */
  note?: string;
  /** Whether the day's target at this level asks strictly more than the minimum. */
  asksMore: (level: Level) => boolean;
};

const target = (id: string, l: Level) => RESET_BY_ID[id].targets[l.intensity][l.phase];
/** A timed habit whose minimum is `m` minutes: offered where the target is longer. */
const moreMinutesThan = (id: string, m: number) => (l: Level) => (target(id, l).minutesPerDueDay ?? 0) > m;

/**
 * The catalogue habits with a minimum. Less Scrolling and Strength Training are excluded for now, and the weekly
 * habits (Get It Done, Practice a Skill) have none in R2; neither has an entry, so neither ever has a minimum.
 */
export const MINIMUMS: Readonly<Record<string, MinimumDef>> = {
  /** "Read one page" (pages mode) or "Read for 2 minutes". */
  mind_read: { status: 'draft', asksMore: moreMinutesThan('mind_read', 2) },
  /** "One quiet minute, any way you like" (no breathing technique prescribed). */
  mind_meditation: { status: 'draft', asksMore: moreMinutesThan('mind_meditation', 1) },
  /** "2 minutes of movement you choose" (the habit's walking, heart and pregnancy gates already apply). */
  move_walk: { status: 'draft', asksMore: moreMinutesThan('move_walk', 2) },
  /** "2 minutes outside, by choice". */
  outdoor_time: { status: 'draft', asksMore: moreMinutesThan('outdoor_time', 2) },
  /** "Fruit or vegetables in one meal": the Starter target itself, so only above Starter. Never water (fluid limits). */
  eat_well: { status: 'draft', asksMore: (l) => l.intensity !== 'starter' },
  /** "One short message to someone you care about": only on daily levels asking for two people or a call. */
  social_reach_out: {
    status: 'draft',
    asksMore: (l) => {
      const t = target('social_reach_out', l);
      return t.schedule.kind === 'daily' && t.amount.kind === 'fixed' && (t.amount.value >= 2 || !!t.calls);
    },
  },
  /** A wider wake window (never earlier, never less sleep). */
  sleep_wake: {
    status: 'disabled',
    note: 'Disabled pending a further safety review (owner decision after ea0c86c).',
    asksMore: () => false,
  },
};

/** Whether a catalogue habit has a minimum that may be recorded at this level under this review. */
export function minimumAvailable(habitId: string, level: Level, review: MinimumReview = 'approved'): boolean {
  const def = MINIMUMS[habitId];
  if (!def || def.status === 'disabled') return false;
  if (def.status === 'draft' && review !== 'drafts') return false;
  return def.asksMore(level);
}
