import type { Category, Level, LibraryHabit, PlanHabit } from './types';

export const LEVELS: Level[] = ['easy', 'medium', 'hard'];

export const HABITS: LibraryHabit[] = [
  {
    id: 'sleep_bedtime',
    icon: 'moon',
    category: 'sleep',
    title: 'Earlier bedtime',
    levels: {
      easy: 'In bed 30 minutes earlier than usual',
      medium: 'In bed 7 hours before your alarm',
      hard: 'In bed 8 hours before your alarm',
    },
    why: 'More sleep is the cheapest energy upgrade there is.',
  },
  {
    id: 'sleep_no_phone_bed',
    icon: 'eye-off',
    category: 'sleep',
    title: 'Phone-free wind-down',
    levels: {
      easy: 'No phone for the last 15 min before sleep',
      medium: 'No phone for the last 30 min before sleep',
      hard: 'No phone for the last 60 min before sleep',
    },
    why: 'Your brain falls asleep faster without a bright feed in front of it.',
  },
  {
    id: 'sleep_wake',
    icon: 'alarm',
    category: 'sleep',
    title: 'Steady wake-up',
    levels: {
      easy: 'Wake within 60 min of your target time',
      medium: 'Wake within 30 min of your target time',
      hard: 'Wake at your target time, weekends too',
    },
    why: 'A fixed wake time anchors your body clock more than anything else.',
  },
  {
    id: 'screen_morning',
    icon: 'sunny',
    category: 'screen',
    title: 'Phone-free morning',
    levels: {
      easy: 'No phone for the first 15 min after waking',
      medium: 'No phone for the first 30 min after waking',
      hard: 'No phone for the first 60 min after waking',
    },
    why: 'Start the day on your agenda, not everyone else’s.',
  },
  {
    id: 'screen_limit',
    icon: 'phone-portrait',
    category: 'screen',
    title: 'Screen time cap',
    levels: { easy: 'Under 7h screen time', medium: 'Under 5h screen time', hard: 'Under 3h screen time' },
    why: 'Every hour you take back is an hour for the life you actually want.',
  },
  {
    id: 'screen_social',
    icon: 'time',
    category: 'screen',
    title: 'Social-free mornings',
    levels: {
      easy: 'No social apps before 10:00',
      medium: 'No social apps before 12:00',
      hard: 'No social apps before 17:00',
    },
    why: 'Protect your best hours from the scroll.',
  },
  {
    id: 'move_walk',
    icon: 'walk',
    category: 'exercise',
    title: 'Daily walk',
    levels: { easy: '15 min walk', medium: '30 min walk', hard: '45 min walk' },
    why: 'Walking clears your head and lifts your energy with almost no effort.',
  },
  {
    id: 'move_workout',
    icon: 'barbell',
    category: 'exercise',
    title: 'Workout',
    levels: { easy: '10 push-ups + 20 squats', medium: '20 min workout', hard: '40 min workout' },
    why: 'A stronger body makes everything else feel lighter.',
  },
  {
    id: 'move_steps',
    icon: 'footsteps',
    category: 'exercise',
    title: 'Step count',
    levels: { easy: '5,000 steps', medium: '7,500 steps', hard: '10,000 steps' },
    why: 'Small movement all day beats one big burst.',
  },
  {
    id: 'water',
    icon: 'water',
    category: 'water',
    title: 'Hydrate',
    levels: {
      easy: 'Drink 4 glasses of water (1L)',
      medium: 'Drink 6 glasses of water (1.5L)',
      hard: 'Drink 8 glasses of water (2L)',
    },
    why: 'Even mild dehydration drains focus and mood.',
  },
  {
    id: 'mind_read',
    icon: 'book',
    category: 'mind',
    title: 'Read',
    levels: { easy: 'Read 5 pages', medium: 'Read 10 pages', hard: 'Read 20 pages' },
    why: 'A few pages a day adds up to a dozen books a year.',
  },
  {
    id: 'mind_meditate',
    icon: 'leaf',
    category: 'mind',
    title: 'Breathe',
    levels: { easy: '3 min of slow breathing', medium: '10 min meditation', hard: '20 min meditation' },
    why: 'A calm mind makes better decisions.',
  },
  {
    id: 'mind_journal',
    icon: 'create',
    category: 'mind',
    title: 'Journal',
    levels: {
      easy: 'Write 1 line about today',
      medium: 'Write 3 lines about today',
      hard: 'Write a full page',
    },
    why: 'Writing it down turns a blur of days into lessons.',
  },
  {
    id: 'focus_deepwork',
    icon: 'flash',
    category: 'focus',
    title: 'Deep work',
    levels: {
      easy: '20 min focused work, phone in another room',
      medium: '45 min focused work, phone in another room',
      hard: '90 min focused work, phone in another room',
    },
    why: 'One focused block beats a whole day of half-attention.',
  },
  {
    id: 'focus_top3',
    icon: 'list',
    category: 'focus',
    title: 'Top priorities',
    levels: {
      easy: 'Write your #1 task for the day',
      medium: 'Write your top 3 tasks and do #1',
      hard: 'Write your top 3 tasks and do all of them',
    },
    why: 'Deciding what matters first keeps busy from replacing important.',
  },
  {
    id: 'discipline_cold',
    icon: 'snow',
    category: 'discipline',
    title: 'Cold finish',
    levels: {
      easy: '30s cold at the end of your shower',
      medium: '1 min cold at the end of your shower',
      hard: '2 min cold at the end of your shower',
    },
    why: 'Doing one hard thing on purpose makes the rest of the day easier.',
  },
  {
    id: 'discipline_bed',
    icon: 'bed',
    category: 'discipline',
    title: 'Clean start',
    levels: {
      easy: 'Make your bed',
      medium: 'Make your bed and tidy your room',
      hard: 'Bed, tidy room, and plan tomorrow',
    },
    why: 'An easy first win sets the tone for the whole day.',
  },
  {
    id: 'confidence_talk',
    icon: 'chatbubbles',
    category: 'confidence',
    title: 'Start a conversation',
    levels: {
      easy: 'Start one conversation',
      medium: 'Start two conversations',
      hard: 'Speak up once in a group',
    },
    why: 'Confidence is a muscle. Small reps build it.',
  },
  {
    id: 'confidence_compliment',
    icon: 'heart',
    category: 'confidence',
    title: 'Genuine compliment',
    levels: {
      easy: 'Give one genuine compliment',
      medium: 'Give two genuine compliments',
      hard: 'Tell someone specifically what they did well',
    },
    why: 'Noticing the good in others makes you easier to be around, including for yourself.',
  },
];

const BY_ID: Record<string, LibraryHabit> = Object.fromEntries(HABITS.map((h) => [h.id, h]));

export function getHabit(id: string): LibraryHabit | undefined {
  return BY_ID[id];
}

export function isCustom(h: PlanHabit): boolean {
  return h.custom !== undefined;
}

export function habitTitle(h: PlanHabit): string {
  return h.custom?.title ?? getHabit(h.habitId)?.title ?? h.habitId;
}

/** The concrete target for today, e.g. "Read 10 pages". */
export function habitTask(h: PlanHabit): string | undefined {
  if (h.custom) return h.custom.description;
  return getHabit(h.habitId)?.levels[h.level];
}

export function habitIcon(h: PlanHabit): string {
  return h.custom ? 'star' : (getHabit(h.habitId)?.icon ?? 'star');
}

export function habitCategory(h: PlanHabit): Category | 'custom' {
  return h.custom ? 'custom' : (getHabit(h.habitId)?.category ?? 'custom');
}

export function levelUp(l: Level): Level {
  return LEVELS[Math.min(LEVELS.indexOf(l) + 1, LEVELS.length - 1)];
}

export function levelDown(l: Level): Level {
  return LEVELS[Math.max(LEVELS.indexOf(l) - 1, 0)];
}

/**
 * Library habits not already in the plan, same category first.
 */
export function swapCandidates(current: PlanHabit, plan: PlanHabit[]): LibraryHabit[] {
  const inPlan = new Set(plan.map((p) => p.habitId));
  const category = habitCategory(current);
  const free = HABITS.filter((h) => !inPlan.has(h.id));
  return [...free.filter((h) => h.category === category), ...free.filter((h) => h.category !== category)];
}
