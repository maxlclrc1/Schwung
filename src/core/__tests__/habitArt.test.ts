import { describe, expect, it } from '@jest/globals';
import { habitArt } from '../../components/habitArt';
import { getHabit } from '../habits';
import { BY_ID } from '../v2/library';

/** The three pilot illustrations, by the stable id they're filed under. */
const PILOTS = { mind_read: 'Read', focus_deepwork: 'Focused work', move_walk: 'Walk' } as const;

describe('habit illustrations', () => {
  it('the pilot ids are real habits, the same id in the V1 and V2 libraries', () => {
    for (const [id, title] of Object.entries(PILOTS)) {
      expect(getHabit(id)).toBeDefined();
      expect(BY_ID[id]?.title).toBe(title);
    }
  });

  it('no illustration is wired up until the files exist, so every card shows its icon', () => {
    for (const id of [...Object.keys(PILOTS), 'discipline_bed', 'custom_123']) expect(habitArt(id)).toBeUndefined();
  });
});
