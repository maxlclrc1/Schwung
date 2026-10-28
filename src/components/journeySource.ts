import { useMemo } from 'react';
import { getHabit, habitTitle } from '../core/habits';
import { bestStreak, currentStreak, daysCompleted } from '../core/progression';
import type { DayLog, PlanHabit } from '../core/types';
import { BY_ID } from '../core/v2/library';
import { pilot, useLifeReset } from '../store/pilotGate';
import { currentDay, useApp } from '../store/useApp';

/**
 * The days the Journey shows: the Life Reset's while it's on (testing builds), otherwise the program's. Each keeps
 * its own logs, XP and stats; nothing is ever mixed.
 */
export type JourneySource = {
  kind: 'reset' | 'program';
  started: boolean;
  logs: Record<string, DayLog>;
  start: string;
  today: number;
  /** Past days with nothing due (Life Reset weekly habits resting): neither done nor missed. */
  rest?: (day: number) => boolean;
  stats: { done: number; streak: number; best: number };
  title: (id: string) => string;
  plan?: PlanHabit[];
};

export function useJourneySource(): JourneySource {
  const reset = useLifeReset();
  const logs = useApp((s) => s.logs);
  const plan = useApp((s) => s.plan);
  const startedAt = useApp((s) => s.startedAt);
  const offset = useApp((s) => s.devDayOffset);
  const today = currentDay({ startedAt, devDayOffset: offset });
  return useMemo(() => {
    if (reset && pilot) return { kind: 'reset', started: true, ...pilot.journey(reset.program, reset.today) };
    const start = startedAt ?? '';
    return {
      kind: 'program',
      started: startedAt !== null,
      logs,
      start,
      today,
      plan,
      stats: {
        done: daysCompleted(logs, start, today),
        streak: currentStreak(logs, start, today),
        best: bestStreak(logs, start, today),
      },
      title: (id: string) => {
        const h = plan.find((p) => p.habitId === id);
        return h ? habitTitle(h) : (getHabit(id)?.title ?? BY_ID[id]?.title ?? id);
      },
    };
  }, [reset, logs, plan, startedAt, today]);
}
