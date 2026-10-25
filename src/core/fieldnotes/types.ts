import type { AgeBand, Precaution } from '../v2/types';

/*
 * Field Notes: a 14-day prototype where a person runs one small experiment and notices what happens
 * (SCHWUNG_FIELD_NOTES_PROTOTYPE.md). It has its own saved state and never reads or writes a Schwung program.
 */

/** What the person wants to understand better; also what they notice each day. */
export type FnGoal = 'focus' | 'energy' | 'calm' | 'confidence';

export type Rating = 1 | 2 | 3 | 4 | 5;
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
export type Feeling = 'easy' | 'okay' | 'hard';
export type Decision = 'keep' | 'easier' | 'different';

/** What the person recorded on one calendar day. Anything missing simply wasn't recorded (never a zero). */
export type FnDay = {
  /** Experiment days only (4–14): whether they tried today's small thing. */
  tried?: boolean;
  /** When they tried it, if they said. */
  when?: TimeOfDay;
  /** The day's observation on the 1–5 scale, if they gave one. */
  rating?: Rating;
};

/** The answers Field Notes uses for eligibility: only what it needs, never a diagnosis. */
export type FnProfile = {
  age: Exclude<AgeBand, 'u16'>;
  /** 'unknown' when the person preferred not to say: exercise-like experiments are then not offered. */
  precautions: Precaution[] | 'unknown';
  /** True when these answers came (read-only) from the person's Schwung profile. */
  fromSchwung: boolean;
};

/** One experiment, fixed when it starts. */
export type Experiment = {
  id: string; // experiment id in the catalog
  habitId: string; // the reviewed Schwung habit it uses
  question: string;
  action: string; // today's small thing
};

/** The finished note, kept after a restart so earlier discoveries stay reviewable. */
export type FieldNote = {
  goal: FnGoal;
  experiment: Experiment;
  startedAt: string; // date key of day 1
  days: Record<string, FnDay>;
  checkIn?: Feeling;
  decision: Decision;
  /** What they carry forward: the same, an easier version, or the next experiment's id. */
  next: { action: string; experimentId?: string };
  finishedOn: string; // date key
};

export type FnRun = {
  startedAt: string;
  goal: FnGoal;
  profile: FnProfile;
  experiment: Experiment;
  days: Record<string, FnDay>;
  /** The day-7 check-in. */
  checkIn?: Feeling;
  decision?: Decision;
  next?: { action: string; experimentId?: string };
};
