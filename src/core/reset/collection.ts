import { t, type TKey } from '../../i18n';
/*
 * Growth & Collection: XP, the effort of every habit done (pilot.ts pilotXp, unchanged), now climbs a ladder of
 * titles, and each rung adds an alpine object to the person's collection. Separate from the 66-day Journey (it's
 * about effort, not days) and never in the way of anything: no habit, feature or setting waits on XP.
 *
 * Thresholds, from what 66 days really earn (10 XP a habit done, +20 a complete day): two habits at about half the
 * time earn ~900-1,000 XP (four objects); three at ~70% about 2,000 (six); a strong run 3,000+ (all seven). XP
 * keeps counting after Day 66. Unlocks are kept for good: an undo can lower XP, never take an object back.
 */

export type Collectible = {
  id: string;
  /** XP that unlocks it (and the title that comes with it). */
  xp: number;
  title: string;
  name: string;
  /** A short reflection, shown once it's yours. */
  reflection: string;
};

/** The title before the first object (read in the current language). */
export const startTitle = () => t('progress.collection.startTitle');

/** A collectible whose title, name and reflection are read in the current language. */
function item(id: string, xp: number): Collectible {
  return {
    id,
    xp,
    get title() {
      return t(`progress.collection.${id}.title` as TKey);
    },
    get name() {
      return t(`progress.collection.${id}.name` as TKey);
    },
    get reflection() {
      return t(`progress.collection.${id}.reflection` as TKey);
    },
  };
}

export const COLLECTIBLES: Collectible[] = [
  item('compass', 60),
  item('edelweiss', 180),
  item('trail_journal', 380),
  item('mountain_lantern', 700),
  item('climbing_rope', 1100),
  item('walking_staff', 1600),
  item('summit_pennant', 2300),
];

/** The title for an XP total, the object it last unlocked, and the next rung (null at the top). */
export function growth(xp: number) {
  const reached = COLLECTIBLES.filter((c) => xp >= c.xp);
  const current = reached[reached.length - 1] ?? null;
  const next = COLLECTIBLES.find((c) => xp < c.xp) ?? null;
  const from = current?.xp ?? 0;
  return {
    title: current?.title ?? startTitle(),
    rank: reached.length,
    current,
    next,
    /** 0..1 along the way to the next rung (1 at the top). */
    progress: next ? (xp - from) / (next.xp - from) : 1,
  };
}

/** Objects the XP has reached that aren't in the collection yet (in order). */
export const newlyReached = (xp: number, unlocked: readonly string[]) =>
  COLLECTIBLES.filter((c) => xp >= c.xp && !unlocked.includes(c.id));

/** The collection as saved: known ids only, each once. */
export function sanitizeCollection(x: unknown): { unlocked: string[] } | undefined {
  const ids = (x as { unlocked?: unknown } | null)?.unlocked;
  if (!Array.isArray(ids)) return undefined;
  const known = COLLECTIBLES.map((c) => c.id);
  const unlocked = [...new Set(ids.filter((i): i is string => typeof i === 'string' && known.includes(i)))];
  return unlocked.length ? { unlocked } : undefined;
}
