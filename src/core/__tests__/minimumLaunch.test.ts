import { describe, expect, it } from '@jest/globals';
import { MINIMUM_EFFORT_LAUNCHED, minimumEffort } from '../../lib/flags';

/*
 * The Minimum Effort launch guard. The production release is one change: `MINIMUM_EFFORT_LAUNCHED = true` in
 * src/lib/flags.ts. This suite fails if that's set while the release checklist still has an open item (its native
 * iPhone checks, section B, and its human-review blockers, section C) or any Minimum Effort translation is still
 * awaiting review by a person (scripts/i18n/state.json, cleared with `npm run i18n:approve` after the review). It
 * never signs anything off itself.
 */

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as { readFileSync(file: string, encoding: 'utf8'): string };
const ROOT = process.cwd();
const checklist = fs.readFileSync(`${ROOT}/docs/MINIMUM_EFFORT_RELEASE_CHECKLIST.md`, 'utf8');
const state = JSON.parse(fs.readFileSync(`${ROOT}/scripts/i18n/state.json`, 'utf8')) as {
  en: Record<string, unknown>;
  review: Record<string, string[]>;
};

/** Every English key Minimum Effort added (the strings whose translations need a native speaker). */
const HABITS = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time', 'eat_well', 'social_reach_out'];
const MINIMUM_KEYS = [
  ...HABITS.flatMap((h) => [`engine.minimum.${h}.inline`, `engine.minimum.${h}.title`]),
  'engine.minimum.outdoor_time.note',
  'today.habit.minimum',
  'today.habit.removeMinimum',
  'today.habit.minimumDone',
  'today.habit.minimumHint',
  'today.habit.minimumHintDone',
  'today.habit.leavesTomorrowMinimum',
  'today.card.minimum',
  'journeyTab.cell.kept',
  'progress.cell.kept',
  'progress.cell.atMinimum',
  'progress.observation.habitMinimum',
  'beyond.since.a11yKept',
  'beyond.since.kept',
  'beyond.recent.a11yKept',
  'beyond.recent.kept',
  'insights.facts.weekMinimum',
  'insights.ring.doneMinimum',
  'insights.ring.a11yMinimum',
  'insights.ring.weekValueMinimum',
  'insights.week.closedMinimum',
  'insights.week.currentMinimum',
  'insights.habit.shareMinimum',
  'insights.stripMinimum',
];

/** The open items (`- [ ]`) in a checklist section, by its heading letter. */
function openItems(letter: string): string[] {
  const start = checklist.indexOf(`## ${letter}.`);
  if (start < 0) throw new Error(`Section ${letter} is missing from the release checklist`);
  const end = checklist.indexOf('\n## ', start + 1);
  return checklist
    .slice(start, end < 0 ? undefined : end)
    .split('\n')
    .filter((l) => /^\s*- \[ \]/.test(l));
}
const pendingTranslations = () =>
  Object.entries(state.review).flatMap(([lang, keys]) =>
    keys.filter((k) => MINIMUM_KEYS.includes(k)).map((k) => `${lang}:${k}`),
  );

describe('the Minimum Effort launch switch', () => {
  it('development and internal builds offer it; production only once launched', () => {
    expect([minimumEffort('development', false), minimumEffort('internal', false)]).toEqual([true, true]);
    expect(minimumEffort('production', false)).toBe(false);
    expect(minimumEffort('production', true)).toBe(true);
    expect(minimumEffort('production')).toBe(MINIMUM_EFFORT_LAUNCHED);
  });

  it('guards every Minimum Effort string, each one in the English catalogue', () => {
    expect(MINIMUM_KEYS).toHaveLength(36);
    for (const k of MINIMUM_KEYS) expect([k, k in state.en]).toEqual([k, true]);
    // Any other English key mentioning the minimum must be added here, so none launches unreviewed.
    const others = Object.keys(state.en).filter(
      (k) => /minimum/i.test(k) && !MINIMUM_KEYS.includes(k) && !/(^|\.)min$/.test(k),
    );
    expect(others).toEqual([]);
  });

  it('is launched only with the checklist complete and every translation reviewed by a person', () => {
    const open = [...openItems('B'), ...openItems('C')];
    const untranslated = pendingTranslations();
    if (MINIMUM_EFFORT_LAUNCHED) {
      expect(open).toEqual([]);
      expect(untranslated).toEqual([]);
    }
    // While it's off nothing is asserted: reviews can be signed off one by one before the switch is set.
  });
});
