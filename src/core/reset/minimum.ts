import { RESET_BY_ID, type Phase, type Intensity } from './habits';

/*
 * Minimum Effort's per-habit minimums (docs/MINIMUM_EFFORT_SPEC.md §3). Pure data and one rule.
 *
 * A minimum is a one-day fallback below the day's target, never a level. It's offered only where the day's target
 * asks strictly more than it (otherwise it would be the target itself).
 *
 * The review gate: the six minimums below were approved by the owner with the content package (`d7652fc`); a new
 * one starts as a `draft`, recorded only by tests and previews (`review: 'drafts'`). A `disabled` minimum is never
 * available, drafts or not. Whether the app offers minimums at all is a separate launch switch
 * (`src/lib/flags.ts` `minimumEffort`), off for normal users until the safety wording is reviewed.
 *
 * The catalogue is versioned and append-only (`MINIMUM_CATALOGUE_VERSION`, `since`). Counting checks a saved
 * minimum against it (`minimumCounted`): a minimum counts only for a habit and level the catalogue has ever offered,
 * so an edited backup can't add one Schwung never offered (Sleep, Less Scrolling, a custom habit, Eat Well at
 * Starter), while a minimum withdrawn later keeps `since` and its recorded days keep counting. An entry is never
 * removed and `since` never changes; a new minimum takes the next catalogue version.
 */

export type MinimumStatus = 'draft' | 'approved' | 'disabled';
/** Which minimums may be recorded: only approved ones (the app), or drafts too (tests and previews). */
export type MinimumReview = 'approved' | 'drafts';

type Level = { intensity: Intensity; phase: Phase };

/** The catalogue's version: raised by one whenever a minimum is first offered. Never lowered. */
export const MINIMUM_CATALOGUE_VERSION = 1;

type MinimumDef = {
  status: MinimumStatus;
  /** The catalogue version that first offered it (approved). Absent for a minimum never offered. Never removed. */
  since?: number;
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
  /** "Read or listen for 2 minutes" (Read Daily's pages mode isn't offered in the app, so its "one page" isn't either). */
  mind_read: { status: 'approved', since: 1, asksMore: moreMinutesThan('mind_read', 2) },
  /** "One quiet minute, any way you like" (no breathing technique prescribed). */
  mind_meditation: { status: 'approved', since: 1, asksMore: moreMinutesThan('mind_meditation', 1) },
  /** "Move for 2 minutes, any way you like" (the habit's walking, heart and pregnancy gates already apply). */
  move_walk: { status: 'approved', since: 1, asksMore: moreMinutesThan('move_walk', 2) },
  /** "Step outside for 2 minutes" (by choice, as the habit says). */
  outdoor_time: { status: 'approved', since: 1, asksMore: moreMinutesThan('outdoor_time', 2) },
  /** "Fruit or vegetables in one meal": the Starter target itself, so only above Starter. Never water (fluid limits). */
  eat_well: { status: 'approved', since: 1, asksMore: (l) => l.intensity !== 'starter' },
  /** "One short message to someone you care about": only on daily levels asking for two people or a call. */
  social_reach_out: {
    status: 'approved',
    since: 1,
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

/**
 * Whether a saved minimum can count: a catalogue habit whose minimum has been offered (`since`, even if withdrawn
 * since), at a level where it was below the target. Read by counting (pilot.ts `minimumOn`), never by recording.
 */
export function minimumCounted(habitId: string, level: Level): boolean {
  const def = MINIMUMS[habitId];
  return !!def && def.since !== undefined && def.since <= MINIMUM_CATALOGUE_VERSION && def.asksMore(level);
}
