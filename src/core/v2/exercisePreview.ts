import { dateForDay } from '../dates';
import { levelUp } from '../habits';
import { completionRun, levelUpOffers, reconcile, type ReconcileEvent } from '../progression';
import { isDueOn, plannedForDay, rescheduled } from '../schedule';
import type { DayLog, PlanHabit, Weekday } from '../types';
import { exclusion, habitNotes, targetsFor } from './engine';
import {
  canAcceptLevelUp,
  checkOutcome,
  EXERCISE_IDS,
  EXERCISE_PREVIEW_GATE,
  SUGGESTED_DAYS,
  validExerciseDays,
  type CheckOutcome,
  type ExerciseId,
} from './exercise';
import { BY_ID } from './library';
import { iconFor, previewPlan, type PreviewPlan } from './program';
import type { ProfileV2 } from './types';

/*
 * The development Exercise Preview's logic, kept pure and separate from the real program: synthetic personas,
 * what the engine would offer them with the exercise prototypes unlocked, and an isolated mock program that runs
 * the real scheduling and progression functions. Nothing here reads or writes saved data.
 */

const base: ProfileV2 = {
  age: '30_49',
  goal: 'fitness',
  sleepHours: '7_8',
  sleepTrouble: 'rarely',
  activeDays: '0',
  produce: '3_4',
  sugary: 'rarely',
  phone: '1_2',
  routines: ['bed'],
  precautions: [],
  wake: { kind: 'time', time: '07:00' },
};

/** The seven fitness situations the preview is checked against. */
export const PERSONAS: { name: string; profile: ProfileV2 }[] = [
  { name: 'Inactive 19-year-old', profile: { ...base, age: '18_29' } },
  { name: 'Inactive 35-year-old', profile: base },
  { name: 'Active 40-year-old', profile: { ...base, activeDays: '5p', routines: ['bed', 'walk'] } },
  { name: '67, joint discomfort', profile: { ...base, age: '65p', precautions: ['joint'] } },
  { name: '72, interested in balance', profile: { ...base, age: '65p', activeDays: '1_2' } },
  { name: 'Limited walking', profile: { ...base, age: '50_64', precautions: ['walkingDifficult'] } },
  { name: 'Heart condition', profile: { ...base, precautions: ['heart'] } },
];

export type ExerciseStatus = { id: ExerciseId; title: string; excluded: string | null; check: CheckOutcome };

/** What the engine offers this profile with the prototypes unlocked, and each prototype's status. */
export function exercisePreview(p: ProfileV2): { plan: PreviewPlan; exercises: ExerciseStatus[] } {
  return {
    plan: previewPlan(p, EXERCISE_PREVIEW_GATE),
    exercises: EXERCISE_IDS.map((id) => ({
      id,
      title: BY_ID[id].title,
      excluded: exclusion(BY_ID[id], p, EXERCISE_PREVIEW_GATE),
      check: checkOutcome(id, p.exerciseCheck),
    })),
  };
}

/** Whether a prototype can be started for this profile: eligible and, where needed, a clear safety check. */
export function canStart(id: ExerciseId, p: ProfileV2): { ok: true } | { ok: false; reason: string } {
  const excluded = exclusion(BY_ID[id], p, EXERCISE_PREVIEW_GATE);
  if (excluded) return { ok: false, reason: excluded };
  const check = checkOutcome(id, p.exerciseCheck);
  if (check === 'needed') return { ok: false, reason: 'Answer the safety check first.' };
  if (check === 'blocked') return { ok: false, reason: 'The safety check answers rule it out.' };
  return { ok: true };
}

export type Sim = {
  startKey: string;
  day: number;
  appliedPhase: number;
  plan: PlanHabit[];
  logs: Record<string, DayLog>;
  events: ReconcileEvent[];
};

/** A Monday, so weekdays read naturally in tests and in the preview. */
export const SIM_START = '2024-01-01';

const foundation: PlanHabit = {
  habitId: 'discipline_bed',
  level: 'easy',
  addedOnDay: 1,
  levelSince: 0,
  spec: {
    title: 'Make your bed',
    icon: 'bed',
    why: '',
    targets: { easy: 'Make your bed', medium: 'Make your bed', hard: 'Make your bed' },
    notes: [],
  },
};

/** A mock program with the daily foundation habit and one exercise prototype. Null if it can't be started. */
export function startSim(id: ExerciseId, p: ProfileV2, days?: Weekday[]): Sim | null {
  if (!canStart(id, p).ok) return null;
  const def = BY_ID[id];
  const scheduleDays = id === 'move_seated' ? undefined : (days ?? SUGGESTED_DAYS[id]!);
  if (scheduleDays && !validExerciseDays(id, scheduleDays)) return null;
  const habit: PlanHabit = {
    habitId: id,
    level: 'easy',
    addedOnDay: 1,
    levelSince: 0,
    spec: {
      title: def.title,
      icon: iconFor(id),
      why: def.why,
      targets: targetsFor(def, p),
      notes: habitNotes(def, p),
    },
    ...(scheduleDays ? { schedule: { days: [...scheduleDays] } } : {}),
  };
  return { startKey: SIM_START, day: 1, appliedPhase: 1, plan: [foundation, habit], logs: {}, events: [] };
}

export const simHabit = (sim: Sim) => sim.plan[1];
export const simDue = (sim: Sim) => isDueOn(simHabit(sim), sim.startKey, sim.day);

/** Today's choice for the exercise habit: done, rested (never a miss) or left undone. Make your bed is always done. */
export function logToday(sim: Sim, choice: 'done' | 'rest' | 'undone'): Sim {
  const id = simHabit(sim).habitId;
  const date = dateForDay(sim.startKey, sim.day);
  const completed = ['discipline_bed', ...(choice === 'done' && simDue(sim) ? [id] : [])];
  const rested = choice === 'rest' && simDue(sim) ? [id] : [];
  const planned = plannedForDay(sim.plan, sim.startKey, sim.day, completed, rested);
  const log: DayLog = { day: sim.day, date, completed, planned, ...(rested.length ? { rested } : {}) };
  return { ...sim, logs: { ...sim.logs, [date]: log } };
}

/** Moves to a later day (skipped days have no log, as if the app wasn't opened) and applies the real reconcile. */
export function goTo(sim: Sim, day: number): Sim {
  const r = reconcile({
    plan: sim.plan,
    appliedPhase: sim.appliedPhase,
    startKey: sim.startKey,
    logs: sim.logs,
    today: day,
    yesterdayEditable: false,
  });
  return { ...sim, day, plan: r.plan, appliedPhase: r.appliedPhase, events: [...sim.events, ...r.events] };
}

export const simRun = (sim: Sim) => completionRun(simHabit(sim), sim.logs, sim.startKey, sim.day);
export const simOffered = (sim: Sim) =>
  levelUpOffers(sim.plan, sim.logs, sim.startKey, sim.day).includes(simHabit(sim).habitId);

/** Accepting needs an offer and, for exercise habits, the self-check. */
export function accept(sim: Sim, selfCheck: boolean): Sim | null {
  const h = simHabit(sim);
  if (!simOffered(sim) || !canAcceptLevelUp(h.habitId, selfCheck)) return null;
  return { ...sim, plan: [sim.plan[0], { ...h, level: levelUp(h.level), levelSince: sim.day }] };
}

/** "Not yet": no penalty, the run simply starts again. */
export function decline(sim: Sim): Sim {
  return { ...sim, plan: [sim.plan[0], { ...simHabit(sim), levelSince: sim.day }] };
}

/** Changes the days from today on (schedule history keeps the past), within the habit's rule. */
export function changeDays(sim: Sim, days: Weekday[]): Sim | null {
  const h = simHabit(sim);
  if (!h.schedule || !validExerciseDays(h.habitId, days)) return null;
  return { ...sim, plan: [sim.plan[0], { ...h, schedule: rescheduled(h.schedule, days, sim.day, h.addedOnDay) }] };
}
