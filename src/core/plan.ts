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

  if (a.sleep === '<5h' || a.sleep === '5-6h') add('sleep_bedtime');
  else if (a.sleep === '6-7h') add('sleep_no_phone_bed');
  else if (a.sleep === '7-8h') add('sleep_wake');

  if (a.screen === '6-8h' || a.screen === '8h+') add('screen_limit');
  else if (a.screen === '4-6h') add('screen_social');
  else if (a.screen === '2-4h') add('screen_morning');

  if (a.exercise === 'never') add('move_walk');
  else if (a.exercise === 'rarely') add('move_steps');
  else if (a.exercise === '1-2x') add('move_workout');

  if (a.water === '<0.5L' || a.water === '0.5-1L' || a.water === '1-2L') add('water');

  if (a.mind === 'never') add('mind_journal');
  else if (a.mind === 'rarely') add('mind_meditate');
  else if (a.mind === 'weekly') add('mind_read');

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
    case 'calm':
      add(ids.includes('mind_meditate') ? 'mind_journal' : 'mind_meditate');
      break;
    case 'fitness':
      add(ids.includes('move_workout') ? 'move_steps' : 'move_workout');
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
