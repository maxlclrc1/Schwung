import { describe, expect, it } from '@jest/globals';
import { habitScene, placeholderCrop } from '../../components/habitArt';
import { PILOT_HABITS } from '../reset/pilot';

describe('habit scenes', () => {
  it('every Life Reset habit has its own scene in both themes, except the three still waiting for theirs', () => {
    const waiting = ['eat_well', 'mind_meditation', 'outdoor_time'];
    for (const id of waiting)
      expect([id, habitScene(id, 'dark'), habitScene(id, 'light')]).toEqual([id, undefined, undefined]);
    for (const id of PILOT_HABITS.filter((x) => !waiting.includes(x))) {
      expect([id, !!habitScene(id, 'dark'), !!habitScene(id, 'light')]).toEqual([id, true, true]);
    }
  });

  it('anything else falls back to a crop of the world, the same one every time', () => {
    expect(habitScene('custom', 'light')).toBeUndefined();
    expect(placeholderCrop('custom')).toEqual(placeholderCrop('custom'));
    const ids = ['a_one', 'b_two', 'c_three', 'd_four', 'e_five'];
    expect(new Set(ids.map((id) => JSON.stringify(placeholderCrop(id)))).size).toBeGreaterThanOrEqual(3);
  });
});
