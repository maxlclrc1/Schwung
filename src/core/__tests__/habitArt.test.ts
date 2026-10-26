import { describe, expect, it } from '@jest/globals';
import { habitScene, placeholderCrop } from '../../components/habitArt';
import { getHabit } from '../habits';
import { BY_ID } from '../v2/library';

/** The three pilot scenes, by the stable id they're filed under. */
const PILOTS = { mind_read: 'Read', focus_deepwork: 'Focused work', move_walk: 'Walk' } as const;

describe('habit scenes', () => {
  it('the pilot ids are real habits, the same id in the V1 and V2 libraries', () => {
    for (const [id, title] of Object.entries(PILOTS)) {
      expect(getHabit(id)).toBeDefined();
      expect(BY_ID[id]?.title).toBe(title);
    }
  });

  it('the three pilots have their scenes in both themes; the rest show a crop of the world', () => {
    for (const id of Object.keys(PILOTS)) {
      expect(habitScene(id, 'dark')).toBeDefined();
      expect(habitScene(id, 'light')).toBeDefined();
    }
    expect(habitScene('discipline_bed', 'dark')).toBeUndefined();
    expect(habitScene('custom', 'light')).toBeUndefined();
    expect(placeholderCrop('mind_read')).toEqual(placeholderCrop('mind_read'));
    // A typical plan doesn't show the same scene on every card.
    const plan = ['discipline_bed', 'sleep_bedtime', 'mind_journal', 'nutrition_produce', 'screen_video'];
    expect(new Set(plan.map((id) => JSON.stringify(placeholderCrop(id)))).size).toBeGreaterThanOrEqual(3);
  });
});
