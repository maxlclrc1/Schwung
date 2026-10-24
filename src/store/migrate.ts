import { addDays, dayNumber } from '../core/dates';
import { MILESTONES, phaseOf } from '../core/progression';
import { validDays, validHistory, validSchedule } from '../core/schedule';
import { isExercise } from '../core/v2/exercise';
import { repairSpec } from '../core/v2/program';
import type { ProfileV2 } from '../core/v2/types';
import type { DayLog, Level, PlanHabit } from '../core/types';

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

/**
 * Safe fallbacks for damaged or partial saves. Never drops logs, XP or streaks, nor any plan habit except the
 * development-only ones in a release build.
 */
export function sanitize(s: Saved, release = !__DEV__): Saved {
  const out = repairShapes(s);
  // Development-only habits never reach a release build, even from a development build's save on the same
  // device: the synthetic scheduler test habit and the exercise prototypes leave the plan (their past days stay).
  if (release) {
    out.plan = (out.plan as PlanHabit[]).filter((h) => !h.habitId.startsWith('devsched_') && !isExercise(h.habitId));
  }
  if (out.programVersion !== 2) out.programVersion = 1;
  const profile = isProfile(out.profile) ? (out.profile as ProfileV2) : null;
  out.profile = profile;
  if (out.programVersion === 2 && Array.isArray(out.plan)) {
    out.plan = (out.plan as PlanHabit[]).map((h) => repairSpec(profile, h));
  }
  // A damaged schedule: valid days are kept, and only the damaged parts are dropped. A bad phase flag means no
  // automatic Day 22/45 level-up; bad history means the current days apply to every past day without a log, as
  // in saves from before schedule history existed. Invalid days fall back to daily (always due), which never
  // hides a habit or loses history.
  if (Array.isArray(out.plan)) {
    out.plan = (out.plan as PlanHabit[]).map((h) => {
      if (h.schedule === undefined || validSchedule(h.schedule)) return h;
      const raw = h.schedule as { days?: unknown; phaseLevelUps?: unknown; history?: unknown };
      if (validDays(raw.days)) {
        return {
          ...h,
          schedule: {
            days: raw.days,
            ...(typeof raw.phaseLevelUps === 'boolean' ? { phaseLevelUps: raw.phaseLevelUps } : {}),
            ...(validHistory(raw.history) ? { history: raw.history } : {}),
          },
        };
      }
      const rest = { ...h };
      delete rest.schedule;
      return rest;
    });
  }
  // A damaged rest record is dropped (the day keeps its planned and completed lists, which decide everything).
  if (out.logs && typeof out.logs === 'object') {
    const logs = { ...(out.logs as Record<string, DayLog>) };
    for (const [date, log] of Object.entries(logs)) {
      if (
        log &&
        log.rested !== undefined &&
        !(Array.isArray(log.rested) && log.rested.every((x) => typeof x === 'string'))
      ) {
        const fixed = { ...log };
        delete fixed.rested;
        logs[date] = fixed;
      }
    }
    out.logs = logs;
  }
  return out;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const LEVELS: Level[] = ['easy', 'medium', 'hard'];
const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const isDay = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 1;
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.filter((v): v is string => typeof v === 'string') : []);

/**
 * The basic shapes every screen relies on. A field with the wrong type falls back to its default (it is
 * deleted, so the store's initial value applies); damaged entries are repaired from what is left rather than
 * dropped wherever that is possible, so a damaged save never blanks the app and never costs a valid day.
 */
function repairShapes(s: Saved): Saved {
  const out = { ...s };
  for (const [k, ok] of [
    ['reminderTime', (v: unknown) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)],
    ['notificationsEnabled', (v: unknown) => typeof v === 'boolean'],
    ['themePreference', (v: unknown) => v === 'system' || v === 'light' || v === 'dark'],
    ['devDayOffset', (v: unknown) => typeof v === 'number' && Number.isInteger(v)],
    ['devV2Preview', (v: unknown) => typeof v === 'boolean'],
    ['answers', (v: unknown) => v === null || isObject(v)],
  ] as const) {
    if (k in out && !ok(out[k])) delete out[k];
  }

  // Logs: each day keeps the lists it has; its day number and date come from its key.
  const rawLogs = isObject(out.logs) ? out.logs : {};
  const logs: Record<string, DayLog> = {};
  for (const [date, l] of Object.entries(rawLogs)) {
    if (!isObject(l)) continue;
    const rested = l.rested;
    logs[date] = {
      ...(l as Partial<DayLog>),
      day: isDay(l.day) ? l.day : 0,
      date: DATE_KEY.test(date) || typeof l.date !== 'string' ? date : l.date,
      completed: strings(l.completed),
      planned: strings(l.planned),
      ...(rested === undefined ? {} : { rested: rested as string[] }),
    };
  }
  // A damaged start date is recovered from any day that recorded its number.
  if (out.startedAt !== null && !(typeof out.startedAt === 'string' && DATE_KEY.test(out.startedAt))) {
    const known = Object.values(logs).find((l) => l.day >= 1 && DATE_KEY.test(l.date));
    out.startedAt = known ? addDays(known.date, 1 - known.day) : null;
  }
  const start = typeof out.startedAt === 'string' ? out.startedAt : null;
  for (const l of Object.values(logs)) {
    if (l.day < 1) l.day = start && DATE_KEY.test(l.date) ? Math.max(1, dayNumber(start, l.date)) : 1;
  }
  out.logs = logs;
  const lastDay = Math.max(0, ...Object.values(logs).map((l) => l.day));

  // Plan: entries without an id are dropped (nothing can be shown for them); the rest are repaired. A plan that
  // is missing altogether is rebuilt, at Easy, from the most recent day's list.
  let plan: unknown[] = Array.isArray(out.plan) ? out.plan : [];
  if (!Array.isArray(out.plan) && start) {
    const latest = Object.values(logs).sort((a, b) => b.day - a.day)[0];
    plan = (latest?.planned ?? []).map((habitId) => ({ habitId }));
  }
  const ids = new Set<string>();
  out.plan = plan.flatMap((h) => {
    if (!isObject(h) || typeof h.habitId !== 'string' || ids.has(h.habitId)) return [];
    ids.add(h.habitId);
    const addedOnDay = isDay(h.addedOnDay) ? h.addedOnDay : 1;
    const fixed = {
      ...h,
      level: LEVELS.includes(h.level as Level) ? h.level : 'easy',
      addedOnDay,
      levelSince: typeof h.levelSince === 'number' && Number.isInteger(h.levelSince) ? h.levelSince : addedOnDay - 1,
    } as PlanHabit & Record<string, unknown>;
    if (h.custom !== undefined && !(isObject(h.custom) && typeof h.custom.title === 'string')) {
      fixed.custom = { title: 'Your habit' };
    }
    return [fixed];
  });

  // Ceremonies already reached aren't replayed; a damaged phase is the one the logged days had reached, so no
  // level-up is applied twice.
  if (!(Array.isArray(out.seenCeremonies) && out.seenCeremonies.every((m) => typeof m === 'number'))) {
    out.seenCeremonies = MILESTONES.filter((m) => m <= lastDay);
  }
  if (out.appliedPhase !== 1 && out.appliedPhase !== 2 && out.appliedPhase !== 3) {
    out.appliedPhase = lastDay ? phaseOf(lastDay) : 1;
  }
  out.notices = (Array.isArray(out.notices) ? out.notices : []).filter(
    (n) =>
      isObject(n) &&
      typeof n.id === 'string' &&
      typeof n.day === 'number' &&
      ((n.kind === 'stepDown' && Array.isArray(n.habitIds) && n.habitIds.every((x) => typeof x === 'string')) ||
        (n.kind === 'phaseUp' && (n.phase === 2 || n.phase === 3))),
  );
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
