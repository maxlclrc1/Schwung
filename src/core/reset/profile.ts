/*
 * What the Life Reset knows about the person: only the answers its habits' rules need (age, health precautions,
 * phone time, wake time, active days). Answers stay on the phone.
 */

export type AgeBand = 'u16' | '16_17' | '18_29' | '30_49' | '50_64' | '65p';
export type ActiveDays = '0' | '1_2' | '3_4' | '5p';
export type PhoneHours = 'lt1' | '1_2' | '2_4' | '4_6' | '6p' | 'unknown';
export type Precaution = 'joint' | 'walkingDifficult' | 'heart' | 'pregnancy' | 'fluidLimit' | 'sleepCondition';
export type Wake = { kind: 'time'; time: string } | { kind: 'varies' } | { kind: 'shift' };

export type Profile = {
  age: AgeBand;
  /** 'unknown' when the question was skipped: never treated as "no limitations". */
  precautions: Precaution[] | 'unknown';
  phone?: PhoneHours;
  wake?: Wake;
  activeDays?: ActiveDays;
};

export const isTeen = (p: Pick<Profile, 'age'>) => p.age === '16_17';
export const precautionsUnknown = (p: Pick<Profile, 'precautions'>) => p.precautions === 'unknown';
export const hasPrecaution = (p: Pick<Profile, 'precautions'>, t: Precaution) =>
  p.precautions !== 'unknown' && p.precautions.includes(t);

/** The longest single focus block offered to 16–17-year-olds (Focus Time and Practice a Skill blocks). */
export const TEEN_FOCUS_MAX_MIN = 60;
