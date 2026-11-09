import { addDays } from '../../src/core/dates';
import { COLLECTIBLES } from '../../src/core/reset/collection';
import * as P from '../../src/core/reset/pilot';

/*
 * Deterministic saved states for the visual QA (scripts/qa/README.md). Built with the app's own program rules, so a
 * state is always one the app could have saved. Development only: nothing here is imported by the app; the QA
 * runner writes these into a throwaway browser profile's localStorage before the web build loads.
 */

/** The fixed "today" every case runs at (the browser clock is pinned to it). */
export const QA_TODAY = '2026-06-15';
export const QA_NOW = `${QA_TODAY}T10:00:00`;

const ADULT: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 120,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '3_4',
};
const CHOICES: P.PilotChoice[] = [
  { habitId: 'mind_read', intensity: 'starter' },
  { habitId: 'move_walk', intensity: 'starter' },
  { habitId: 'sleep_wake', intensity: 'starter' },
];
/** Custom names stay exactly as typed (not translated): a long one tests wrapping in every language. */
const CUSTOM = {
  name: 'Evening stretch with the kids before bed',
  note: 'Ten minutes on the living room floor',
  perWeek: 3,
};

/**
 * A program on `day` (today), with most earlier days done, every moment before today already seen. `momentum`: Keep
 * My Momentum chosen on that day, and the days after it done like the rest (an active person beyond the summit).
 */
export function programOn(
  day: number,
  opts: { misses?: number[]; seen?: boolean; momentum?: number } = {},
): P.PilotProgram {
  const created = P.createPilot(ADULT, CHOICES, addDays(QA_TODAY, 1 - day));
  if (!created) throw new Error(`QA program refused: ${P.setupProblems(ADULT, CHOICES).join('; ')}`);
  let p: P.PilotProgram = created;
  const added = P.addCustomHabit(p, CUSTOM, 1, 12);
  if (added) p = added.program;
  if (opts.momentum !== undefined) p = P.keepMomentum(p, opts.momentum);
  const misses = new Set(opts.misses ?? [4, 9, 15]);
  const last = Math.min(day - 1, P.endDay(p));
  for (let d = 1; d <= last; d++) {
    if (misses.has(d)) continue;
    // Everything the day asks for: the daily habits and an open weekly one (the custom habit until its 3 are in).
    for (const id of P.requiredOn(p, d)) {
      const next: P.PilotProgram | null = P.complete(p, id, d).program;
      if (next) p = next;
    }
  }
  if (opts.seen !== false) {
    const xp = P.lifetimeXp(p);
    p = {
      ...p,
      ceremonies: {
        day1: true,
        summit: day > 66 ? true : undefined,
        milestones: P.MILESTONE_DAYS.filter((m) => m <= day),
      },
      collection: { unlocked: COLLECTIBLES.filter((c) => xp >= c.xp).map((c) => c.id) },
      comeback: { seen: day },
    };
  }
  return p;
}

export type QaState = {
  /** Program save (schwung-reset-pilot state), or a raw string to write as is (recovery). */
  pilot?: P.PilotProgram | null | { raw: string };
  journeys?: P.ArchivedJourney[];
  /** Preference overrides (language and theme are set per case). */
  prefs?: Record<string, unknown>;
};

export type QaScene = {
  id: string;
  /** Screen group in the report. */
  group: string;
  route: string;
  state: QaState;
  /** A flow the runner walks (setup: through every onboarding step). */
  flow?: 'setup';
  /** Part of the default (quick) run. */
  core?: boolean;
};

const running = (day: number, extra: Partial<P.PilotProgram> = {}) => ({ ...programOn(day), ...extra });
const archived = (): P.ArchivedJourney => ({
  v: 1,
  id: 'qa-journey-1',
  archivedAt: addDays(QA_TODAY, -3),
  program: programOn(67),
});

export function scenes(): QaScene[] {
  const day12 = running(12);
  const day1Fresh = programOn(1, { seen: false });
  const day7 = { ...programOn(7), ceremonies: { day1: true, milestones: [] } };
  const summit = { ...programOn(67), ceremonies: { day1: true, milestones: [7, 21, 44] } };
  const beyond = programOn(67);
  const momentum = programOn(80, { momentum: 67 });
  const absent = programOn(20, { misses: [4, 9, 16, 17, 18, 19] });
  return [
    {
      id: 'choose-language',
      group: 'Start',
      route: '/',
      state: { pilot: null, prefs: { languageChosen: false } },
      core: true,
    },
    { id: 'welcome', group: 'Start', route: '/welcome', state: { pilot: null }, core: true },
    { id: 'setup', group: 'Onboarding', route: '/life-reset/setup', state: { pilot: null }, flow: 'setup', core: true },
    { id: 'today', group: 'Habits', route: '/today', state: { pilot: day12 }, core: true },
    { id: 'today-day1', group: 'Ceremonies', route: '/today', state: { pilot: day1Fresh } },
    { id: 'milestone-7', group: 'Ceremonies', route: '/today', state: { pilot: day7 } },
    { id: 'summit', group: 'Ceremonies', route: '/today', state: { pilot: summit } },
    { id: 'comeback', group: 'Ceremonies', route: '/today', state: { pilot: { ...absent, comeback: undefined } } },
    { id: 'habit-detail', group: 'Habits', route: '/life-reset/mind_read', state: { pilot: day12 } },
    { id: 'habit-custom', group: 'Habits', route: '/life-reset/custom_1', state: { pilot: day12 } },
    { id: 'add-habit', group: 'Habits', route: '/life-reset/add', state: { pilot: day12 } },
    { id: 'journey', group: 'Journey', route: '/progress', state: { pilot: day12 }, core: true },
    { id: 'insights', group: 'Insights', route: '/insights', state: { pilot: day12 }, core: true },
    { id: 'reflect', group: 'Reflections', route: '/life-reset/reflect?week=1', state: { pilot: day12 } },
    { id: 'collection', group: 'Collection', route: '/life-reset/collection', state: { pilot: day12 } },
    { id: 'story', group: '66-Day Story', route: '/life-reset/story', state: { pilot: beyond }, core: true },
    { id: 'beyond-today', group: 'Beyond the Summit', route: '/today', state: { pilot: beyond }, core: true },
    { id: 'beyond-next', group: 'Beyond the Summit', route: '/life-reset/next', state: { pilot: beyond } },
    { id: 'new-ascent', group: 'Beyond the Summit', route: '/life-reset/ascent', state: { pilot: beyond } },
    { id: 'momentum', group: 'Beyond the Summit', route: '/today', state: { pilot: momentum } },
    { id: 'momentum-journey', group: 'Beyond the Summit', route: '/progress', state: { pilot: momentum } },
    {
      id: 'past-journeys',
      group: 'Beyond the Summit',
      route: '/life-reset/journeys',
      state: { pilot: day12, journeys: [archived()] },
    },
    {
      id: 'past-story',
      group: '66-Day Story',
      route: '/life-reset/story?journey=qa-journey-1',
      state: { pilot: day12, journeys: [archived()] },
    },
    { id: 'settings', group: 'Settings', route: '/settings', state: { pilot: day12 }, core: true },
    { id: 'settings-language', group: 'Settings', route: '/language', state: { pilot: day12 } },
    { id: 'privacy', group: 'Settings', route: '/privacy', state: { pilot: day12 }, core: true },
    { id: 'legal-wellness', group: 'Settings', route: '/legal?doc=wellness', state: { pilot: day12 } },
    { id: 'legal-terms', group: 'Settings', route: '/legal?doc=terms', state: { pilot: day12 } },
    { id: 'restore', group: 'Backup & recovery', route: '/restore', state: { pilot: null } },
    {
      id: 'recovery',
      group: 'Backup & recovery',
      route: '/',
      state: { pilot: { raw: JSON.stringify({ state: { program: { v: 1, habits: 'damaged' } }, version: 2 }) } },
      core: true,
    },
  ];
}
