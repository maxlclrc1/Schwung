/*
 * Habit Science 2.0: profile and habit specification types.
 * See HABIT_SCIENCE_V2_ARCHITECTURE.md (revision 5). This module is not connected to the app yet.
 */

export type AgeBand = 'u16' | '16_17' | '18_29' | '30_49' | '50_64' | '65p';
export type GoalV2 = 'energy' | 'focus' | 'discipline' | 'confidence' | 'calm' | 'fitness';
export type SleepHours = 'lt6' | '6_7' | '7_8' | '8_9' | 'gt9';
export type SleepTrouble = 'rarely' | 'some' | 'most';
export type ActiveDays = '0' | '1_2' | '3_4' | '5p';
export type Produce = '0' | '1_2' | '3_4' | '5p' | 'skip';
export type Sugary = 'most' | 'some' | 'rarely';
export type PhoneHours = 'lt1' | '1_2' | '2_4' | '4_6' | '6p' | 'unknown';
export type PhonePull = 'social' | 'video' | 'games' | 'messages' | 'mix';
export type Routine = 'reading' | 'breathing' | 'journaling' | 'planning' | 'walk' | 'phoneAway' | 'sameWake' | 'bed';
export type Precaution = 'joint' | 'walkingDifficult' | 'heart' | 'pregnancy' | 'fluidLimit' | 'sleepCondition';
export type Wake = { kind: 'time'; time: string } | { kind: 'varies' } | { kind: 'shift' };

/** Answers to the short exercise safety check (asked before an exercise prototype, never in the main quiz). */
export type CheckAnswer = 'yes' | 'no' | 'unsure';
export type ExerciseCheckKey = 'standUnaided' | 'fallsOrUnsteady' | 'dizziness' | 'recentSurgery' | 'clinicianLimit';
export type ExerciseCheck = Partial<Record<ExerciseCheckKey, CheckAnswer>>;

export type ProfileV2 = {
  age: AgeBand;
  goal: GoalV2;
  sleepHours: SleepHours;
  sleepTrouble: SleepTrouble;
  activeDays: ActiveDays;
  produce: Produce;
  /** Adults only; absent when not asked. */
  sugary?: Sugary;
  phone: PhoneHours;
  /** Asked when phone is 2–4 h or more, or not sure. */
  phonePull?: PhonePull;
  routines: Routine[];
  /** 'unknown' when the question was skipped: never treated as "no limitations". */
  precautions: Precaution[] | 'unknown';
  /** W1, when asked. Absent = not asked yet (selection assumes a regular time). */
  wake?: Wake;
  /** W2 (HH:MM, getting into bed), when asked. */
  inBed?: string;
  /** The exercise safety check, once answered (development prototypes only). */
  exerciseCheck?: ExerciseCheck;
};

export type Domain = 'foundation' | 'sleep' | 'activity' | 'nutrition' | 'digital' | 'focus' | 'mind' | 'social';
export type NeedDomain = 'sleep' | 'activity' | 'nutrition' | 'digital';
export type Mode = 'foundation' | 'auto' | 'choice' | 'add';
/**
 * candidate: may be used (subject to the release gate); held: never used; prototype: a development-only exercise
 * habit, usable only when a gate names it explicitly (the Exercise Preview), never in normal plans or swaps.
 */
export type Release = 'candidate' | 'held' | 'prototype';

export type HabitSpecV2 = {
  id: string;
  title: string;
  domain: Domain;
  mode: Mode;
  release: Release;
  /** Phone-limiting habit (at most 2 per plan). */
  phoneRule?: boolean;
  overlapGroup?: string;
  opportunityDependent?: boolean;
  /** Mandatory explanatory copy shown with the habit, if any. */
  note?: string;
};

/** A habit as generated for one person: its personal ladder and starting rung. */
export type Targets = { easy: string; medium: string; hard: string };

export type PickV2 = {
  id: string;
  title: string;
  /** Why it's in the plan. */
  source: 'foundation' | 'goal' | 'need' | 'fill';
  forGoal: boolean;
  /** Index of Easy in the personal ladder (Easy = r0). */
  startRung: number;
  targets: Targets;
  reason: string;
  /** Safety adaptations or notes attached to this habit. */
  notes: string[];
};

export type Alternative = { id: string; title: string; targets: Targets };

/** Choice step: required when the plan has fewer than 3 habits, optional at 3–4, absent at 5–6. */
export type ChoiceStep = null | { required: number; optional: boolean; alternatives: Alternative[]; ruleNote: string };

export type PlanResultV2 =
  | { status: 'not_eligible'; message: string }
  | {
      status: 'ok';
      picks: PickV2[];
      choice: ChoiceStep;
      planNotes: string[];
      /** W questions this plan needs (asked once, then the plan is recomputed with the answers). */
      needsWake: boolean;
      needsBedtime: boolean;
    };
