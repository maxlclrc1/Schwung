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

export const START_TITLE = 'Wanderer';

export const COLLECTIBLES: Collectible[] = [
  {
    id: 'compass',
    xp: 60,
    title: 'Explorer',
    name: 'The Compass',
    reflection: 'You chose a direction. Everything since has been finding your way along it.',
  },
  {
    id: 'edelweiss',
    xp: 180,
    title: 'Trailblazer',
    name: 'Pressed Edelweiss',
    reflection: 'It only grows where it’s hard to reach. Kept here, like the first days that took real effort.',
  },
  {
    id: 'trail_journal',
    xp: 380,
    title: 'Pathfinder',
    name: 'The Trail Journal',
    reflection: 'Small entries, day after day. Read back, they become a story about who you’re becoming.',
  },
  {
    id: 'mountain_lantern',
    xp: 700,
    title: 'Ridgewalker',
    name: 'The Mountain Lantern',
    reflection: 'For the early starts and the long evenings: a steady light you carry yourself.',
  },
  {
    id: 'climbing_rope',
    xp: 1100,
    title: 'Mountaineer',
    name: 'The Climbing Rope',
    reflection: 'Each strand holds a little; woven together, they hold you. Like habits, repeated.',
  },
  {
    id: 'walking_staff',
    xp: 1600,
    title: 'Alpinist',
    name: 'The Walking Staff',
    reflection: 'Worn smooth where your hand rests. Proof of how far it has carried you, and you it.',
  },
  {
    id: 'summit_pennant',
    xp: 2300,
    title: 'Summit Keeper',
    name: 'The Summit Pennant',
    reflection: 'Raised where few go. Not for the view: for every ordinary day that led here.',
  },
];

/** The title for an XP total, the object it last unlocked, and the next rung (null at the top). */
export function growth(xp: number) {
  const reached = COLLECTIBLES.filter((c) => xp >= c.xp);
  const current = reached[reached.length - 1] ?? null;
  const next = COLLECTIBLES.find((c) => xp < c.xp) ?? null;
  const from = current?.xp ?? 0;
  return {
    title: current?.title ?? START_TITLE,
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
