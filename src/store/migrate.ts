import { validSchedule } from '../core/schedule';
import { repairSpec } from '../core/v2/program';
import type { ProfileV2 } from '../core/v2/types';
import type { PlanHabit } from '../core/types';

/** Saved-data version. 1 = V1 only (no program version); 2 = programVersion, profile and per-habit specs. */
export const STORAGE_VERSION = 2;

type Saved = Record<string, unknown>;

/**
 * Brings older saved data up to date without touching progress. A save from before V2 is always a V1
 * program and stays one: it is never converted. Anything unrecognised falls back to V1 behavior.
 */
export function migrateSaved(persisted: unknown, version: number): Saved {
  if (!persisted || typeof persisted !== 'object') return {};
  const s = { ...(persisted as Saved) };
  if (version < 2) {
    s.programVersion = 1;
    s.profile = null;
  }
  return sanitize(s);
}

/** Safe fallbacks for damaged or partial saves. Never drops logs, XP, streaks or plan habits. */
export function sanitize(s: Saved): Saved {
  const out = { ...s };
  if (out.programVersion !== 2) out.programVersion = 1;
  const profile = isProfile(out.profile) ? (out.profile as ProfileV2) : null;
  out.profile = profile;
  if (out.programVersion === 2 && Array.isArray(out.plan)) {
    out.plan = (out.plan as PlanHabit[]).map((h) => repairSpec(profile, h));
  }
  // A damaged schedule falls back to daily (always due), which never hides a habit or loses history.
  if (Array.isArray(out.plan)) {
    out.plan = (out.plan as PlanHabit[]).map((h) => {
      if (h.schedule === undefined || validSchedule(h.schedule)) return h;
      const rest = { ...h };
      delete rest.schedule;
      return rest;
    });
  }
  return out;
}

function isProfile(p: unknown): boolean {
  if (!p || typeof p !== 'object') return false;
  const x = p as Partial<ProfileV2>;
  return (
    typeof x.age === 'string' &&
    typeof x.goal === 'string' &&
    typeof x.sleepHours === 'string' &&
    typeof x.sleepTrouble === 'string' &&
    typeof x.activeDays === 'string' &&
    typeof x.produce === 'string' &&
    typeof x.phone === 'string' &&
    Array.isArray(x.routines) &&
    (x.precautions === 'unknown' || Array.isArray(x.precautions))
  );
}
