import { getHabit } from './habits';
import type { Answers, LibraryHabit, PlanHabit } from './types';

export const MIN_HABITS = 3;
const TARGET_MIN = 5;
const TARGET_MAX = 6;
const FILLERS = ['mind_read', 'water', 'move_walk', 'screen_morning'];
// When over the max, these go first; after that, drop from the bottom of the list.
const DROP_FIRST = ['discipline_cold', 'confidence_talk'];

/**
 * Deterministic plan from quiz answers. Returns 5–6 library habits in priority order.
 */
export function generatePlan(a: Answers): LibraryHabit[] {
  const ids: string[] = [];
  const add = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  add('discipline_bed');

  if (a.sleep === '<6h') add('sleep_bedtime');
  else if (a.sleep === '6-7h') add('sleep_no_phone_bed');

  if (a.screen === '6h+') add('screen_limit');
  else if (a.screen === '3-6h') add('screen_morning');

  if (a.exercise === 'never') add('move_walk');
  else if (a.exercise === 'sometimes') add('move_workout');

  if (a.water === '<1L' || a.water === '1-2L') add('water');

  if (a.mind === 'never') add('mind_journal');
  else if (a.mind === 'sometimes') add('mind_read');

  switch (a.goal) {
    case 'focus':
      add('focus_deepwork');
      break;
    case 'discipline':
      add('discipline_cold');
      break;
    case 'confidence':
      add('confidence_talk');
      break;
    case 'energy':
      add(ids.includes('move_walk') ? 'water' : 'move_walk');
      break;
  }

  for (const id of FILLERS) {
    if (ids.length >= TARGET_MIN) break;
    add(id);
  }

  while (ids.length > TARGET_MAX) {
    const extra = DROP_FIRST.find((id) => ids.includes(id));
    if (extra) ids.splice(ids.indexOf(extra), 1);
    else ids.pop();
  }

  return ids.map((id) => getHabit(id)!);
}

export function toPlan(habits: LibraryHabit[], day = 1): PlanHabit[] {
  return habits.map((h) => ({ habitId: h.id, level: 'easy', addedOnDay: day, levelSince: day - 1 }));
}
