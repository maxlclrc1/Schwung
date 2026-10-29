import { useMemo } from 'react';
import { useShownProgram } from './shownProgram';
import * as P from '../core/reset/pilot';
import type { DayLog } from '../core/types';
import { pilotToday, useResetPilot } from '../store/resetPilot';

/** The days the Journey shows: the program's own logs, rest days and stats. */
export type JourneySource = {
  started: boolean;
  logs: Record<string, DayLog>;
  start: string;
  today: number;
  /** Past days with nothing due (weekly habits resting): neither done nor missed. */
  rest?: (day: number) => boolean;
  stats: { done: number; streak: number; best: number };
  title: (id: string) => string;
};

export function useJourneySource(): JourneySource {
  const program = useShownProgram();
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  return useMemo(() => {
    if (!program)
      return {
        started: false,
        logs: {},
        start: '',
        today: 0,
        stats: { done: 0, streak: 0, best: 0 },
        title: (id) => id,
      };
    return {
      started: true,
      logs: program.logs,
      start: program.startedAt,
      today,
      rest: (day: number) => day < today && P.dayResult(program, day) === 'rest',
      stats: P.journeyStats(program, today),
      title: (id: string) => P.nameOf(program, id),
    };
  }, [program, today]);
}
