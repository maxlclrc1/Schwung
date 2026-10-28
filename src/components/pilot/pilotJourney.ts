import * as P from '../../core/reset/pilot';

/** What the Journey tab needs from a Life Reset program: its own days, rest days and stats (never the other's). */
export function pilotJourney(program: P.PilotProgram, today: number) {
  return {
    logs: program.logs,
    start: program.startedAt,
    today,
    /** A day with nothing due (weekly habits resting): neither done nor missed. */
    rest: (day: number) => day < today && P.dayResult(program, day) === 'rest',
    stats: P.journeyStats(program, today),
    title: (id: string) => P.habitName(id),
  };
}
