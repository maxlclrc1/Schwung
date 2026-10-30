import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { canEditYesterday, dayNumber, toDateKey } from '../core/dates';
import * as P from '../core/reset/pilot';
import type { Reflection, ReflectionAnswer } from '../core/reset/reflections';
import type { Feedback, Offer } from '../core/reset/readiness';
import type { SessionType } from '../core/reset/tracking';
import { channel, devTools, type Channel } from '../lib/flags';
import { CROP_COUNT } from '../components/habitArt';
import { useJourneys } from './journeys';
import { endRecovery, keepRaw, startRecovery, useRecovery } from './recovery';
import { debouncedStorage, deferredJSONStorage } from './storage';
import { t } from '../i18n';

/*
 * The Life Reset program's saved state: the app's one program. It began as the pilot's and keeps the pilot's key,
 * so a pilot program carries on as it was. Rules: core/reset/pilot.ts and SCHWUNG_LIFE_RESET_PROGRAM.md.
 */

/** Its key ('-internal' in Expo Go's internal channel, so trying that channel never touches the development save). */
export function resetPilotKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-reset-pilot-internal' : 'schwung-reset-pilot';
}

/** The save's version. Raise it only together with a step in SAVE_MIGRATIONS. */
export const RESET_PILOT_VERSION = 2;

/**
 * How to bring an older save up to date: one step per version, from that version to the next, each pure and
 * tested. A version with no way forward is never reset: it's kept and shown on the recovery screen.
 * Version 0: saves made before versioning had the same shape as version 1.
 * Version 1 → 2 (Beyond the Summit): a program may carry `after` (Keep My Momentum) and `carry` (a New Ascent).
 * Both are optional, so a version 1 program is already a valid version 2 one; the step makes that explicit. The
 * bump is what protects people: an older Schwung meeting a version 2 save keeps it for recovery (a "newer" save)
 * instead of misreading days past the summit.
 */
export const SAVE_MIGRATIONS: Record<number, (state: unknown) => unknown> = {
  0: (state) => state,
  1: (state) => state,
};

/** Runs the steps from `from` up to the current version; throws if a step is missing. */
export function migrateSave(state: unknown, from: number, to: number = RESET_PILOT_VERSION): unknown {
  let s = state;
  for (let v = from; v < to; v++) {
    const step = SAVE_MIGRATIONS[v];
    if (!step) throw new Error(`No migration from save version ${v}`);
    s = step(s);
  }
  return s;
}

export type ResetPilotData = {
  program: P.PilotProgram | null;
  /** Development builds only: moves the program's clock (time travel). */
  devDayOffset: number;
};

type Actions = {
  /** Starts a program. Never over a running one (end it first). */
  start: (answers: P.PilotAnswers, choices: P.PilotChoice[]) => boolean;
  /** Adds a habit from today (the set-up's rules); false if it can't join. */
  addHabit: (extra: Partial<P.PilotAnswers>, choice: P.PilotChoice) => boolean;
  /** Adds a habit of the person's own from today; false if it can't be added. */
  addCustomHabit: (def: { name: string; note?: string; perWeek: number }) => boolean;
  /** Takes a habit out from today (its past stays); the reason it can't be, or null when done. */
  removeHabit: (habitId: string) => string | null;
  /** Ends the program and deletes its data. */
  end: () => void;
  /** Today, or yesterday while it can still be corrected (until noon). */
  toggle: (habitId: string, day?: number) => P.PilotChange['event'];
  complete: (habitId: string) => P.PilotChange['event'];
  undo: (habitId: string) => P.PilotChange['event'];
  /** Get It Done / Stay Connected: +1 or −1 on today's counter. */
  count: (habitId: string, by: 1 | -1) => P.PilotChange['event'];
  setSkipped: (habitId: string, on: boolean) => void;
  setMinutes: (habitId: string, minutes: number | null) => void;
  setSession: (details: { type?: SessionType; minutes?: number }) => void;
  /** Less Scrolling's weekly Screen Time check (this week). */
  setScreenTime: (minutesPerDay: number) => void;
  accept: (habitId: string, offer: Offer) => void;
  decline: (habitId: string, offer: Offer) => void;
  feedback: (habitId: string, kind: Feedback['kind']) => void;
  easier: (habitId: string) => string | null;
  harder: (habitId: string) => string | null;
  setDevDayOffset: (n: number) => void;
  /** A ceremony has been seen through (or skipped): it never shows again in this Life Reset. */
  markCeremony: (kind: 'day1' | 'summit') => void;
  /** A week's reflection: its answer (and the habits changed from it), or put off with no answer ("Not now"). */
  reflect: (week: number, answer?: ReflectionAnswer, changed?: string[]) => void;
  /** An absence (by its first day) has been welcomed back: never again for it. */
  markComeback: (start: number) => void;
  /** Beyond the summit: the same habits go on past Day 66 (docs/BEYOND_THE_SUMMIT_PLAN.md). */
  keepMomentum: () => void;
  /** Objects reached by XP join the collection, for good (an undo never takes one back). */
  unlockCollectibles: (ids: string[]) => void;
  /** A milestone moment was seen through (or skipped); it and every earlier one never show again. */
  markMilestone: (day: number) => void;
};

const initial: ResetPilotData = { program: null, devDayOffset: 0 };

/** "Now" for the program, with its development clock. */
export function pilotNow(offset: number = useResetPilot.getState().devDayOffset): Date {
  const d = new Date();
  if (devTools() && offset) d.setDate(d.getDate() + offset);
  return d;
}

/** The program day today (0 without a program). */
export function pilotToday(s: Pick<ResetPilotData, 'program' | 'devDayOffset'> = useResetPilot.getState()): number {
  return s.program ? Math.max(1, dayNumber(s.program.startedAt, toDateKey(pilotNow(s.devDayOffset)))) : 0;
}

/** The text last read from the save, and where a copy of it is kept (for the recovery screen). */
let lastRaw: string | null = null;
let lastKept: string | null = null;
let lastName = '';

/**
 * The Life Reset's storage, guarded: a save that can't be parsed, or comes from a newer Schwung, is kept as it is
 * (a recovery copy first) and never handed on to be replaced; and while recovery is pending, no save is written.
 */
const deferred = deferredJSONStorage<ResetPilotData>();
const guardedStorage: PersistStorage<ResetPilotData> = {
  getItem: async (name) => {
    const raw = await debouncedStorage.getItem(name);
    lastRaw = raw;
    lastKept = null;
    if (raw === null) return null;
    let value: StorageValue<ResetPilotData> | null = null;
    try {
      value = JSON.parse(raw) as StorageValue<ResetPilotData>;
    } catch {
      value = null;
    }
    const version = value && typeof value === 'object' ? value.version : undefined;
    const unreadable = !value || typeof value !== 'object' || !('state' in value);
    const newer = !unreadable && typeof version === 'number' && version > RESET_PILOT_VERSION;
    const noWay =
      !unreadable && !newer && typeof version === 'number' && version < RESET_PILOT_VERSION && !canMigrate(version);
    lastName = name;
    if (unreadable || newer || noWay) {
      // Kept before anything else may happen to it (a new save replacing it).
      lastKept = await keepRaw(name, raw);
      startRecovery(
        {
          reason: newer ? 'newer' : 'unreadable',
          recovered: null,
          lost: newer ? [] : [t('engine.lost.whole')],
          raw,
        },
        lastKept,
      );
      return null;
    }
    return value;
  },
  setItem: (name, value) => {
    // Held back while the person hasn't decided what to do with a save that couldn't be fully read.
    if (useRecovery.getState().pending) return;
    deferred.setItem(name, value);
  },
  removeItem: (name) => deferred.removeItem(name),
};

const canMigrate = (from: number) => {
  for (let v = from; v < RESET_PILOT_VERSION; v++) if (!SAVE_MIGRATIONS[v]) return false;
  return true;
};

export const useResetPilot = create<ResetPilotData & Actions>()(
  persist(
    (set, get) => {
      /** Runs a change on today's record. */
      const change = (f: (p: P.PilotProgram, day: number) => P.PilotChange) => {
        const { program } = get();
        if (!program) return null;
        const r = f(program, pilotToday(get()));
        if (r.program !== program) set({ program: r.program });
        return r.event;
      };
      const progress = (f: (p: P.PilotProgram, day: number) => P.PilotProgram) => {
        const { program } = get();
        if (!program) return;
        set({ program: f(program, pilotToday(get())) });
      };
      const manual = (f: (p: P.PilotProgram, day: number) => P.ManualChange) => {
        const { program } = get();
        if (!program) return 'Not available';
        const r = f(program, pilotToday(get()));
        if ('blocked' in r) return r.blocked;
        set({ program: r.program });
        return null;
      };
      return {
        ...initial,

        start: (answers, choices) => {
          if (get().program) return false;
          const fresh = P.createPilot(answers, choices, toDateKey(pilotNow()));
          if (!fresh) return false;
          // After a Life Reset kept in Past journeys, a new one through set-up still carries what's the person's:
          // lifetime XP and the collection (never the streak: it didn't begin the next day from a running one).
          const last = useJourneys.getState().journeys.at(-1)?.program;
          const program: P.PilotProgram = last
            ? {
                ...fresh,
                carry: { ascent: P.ascentOf(last) + 1, xp: P.lifetimeXp(last), streak: 0 },
                ...(last.collection ? { collection: last.collection } : {}),
              }
            : fresh;
          set({ program });
          return true;
        },

        addHabit: (extra, choice) => {
          const { program } = get();
          if (!program) return false;
          const next = P.addHabit(program, extra, choice, pilotToday(get()));
          if (!next) return false;
          set({ program: next });
          return true;
        },

        addCustomHabit: (def) => {
          const { program } = get();
          if (!program) return false;
          const r = P.addCustomHabit(program, def, pilotToday(get()), CROP_COUNT);
          if (!r) return false;
          set({ program: r.program });
          return true;
        },

        removeHabit: (id) => {
          const { program } = get();
          if (!program) return 'There’s no program.';
          const problem = P.removeProblem(program, id);
          if (problem) return problem;
          set({ program: P.removeHabit(program, id, pilotToday(get())) });
          return null;
        },

        end: () => set({ ...initial }),

        toggle: (id, on) =>
          change((p, today) => {
            const day = on ?? today;
            const editable = day === today || (day === today - 1 && canEditYesterday(pilotNow(get().devDayOffset)));
            return editable ? P.toggle(p, id, day) : { program: p, event: null };
          }),
        complete: (id) => change((p, day) => P.complete(p, id, day)),
        undo: (id) => change((p, day) => P.undo(p, id, day)),
        count: (id, by) => change((p, day) => P.count(p, id, day, by)),
        setSkipped: (id, on) => void change((p, day) => P.setSkipped(p, id, day, on)),
        setMinutes: (id, minutes) => void change((p, day) => P.setMinutes(p, id, day, minutes)),
        setSession: (details) => void change((p, day) => P.setSession(p, day, details)),
        setScreenTime: (minutes) => progress((p, day) => P.setScreenTime(p, day, minutes)),

        accept: (id, offer) => progress((p, day) => P.accept(p, id, offer, day)),
        decline: (id, offer) => progress((p, day) => P.decline(p, id, offer, day)),
        feedback: (id, kind) => progress((p, day) => P.feedback(p, id, kind, day)),
        easier: (id) => manual((p, day) => P.easier(p, id, day)),
        harder: (id) => manual((p, day) => P.harder(p, id, day)),

        setDevDayOffset: (devDayOffset) => set({ devDayOffset: devTools() ? devDayOffset : 0 }),

        reflect: (week, answer, changed) => {
          const { program } = get();
          if (!program) return;
          const prev = program.reflections?.[week];
          const entry: Reflection = {
            week,
            day: pilotToday(get()),
            // Putting it off never erases an answer already given.
            ...((answer ?? prev?.answer) ? { answer: answer ?? prev?.answer } : {}),
            ...(changed?.length || prev?.changed?.length
              ? { changed: [...new Set([...(prev?.changed ?? []), ...(changed ?? [])])] }
              : {}),
          };
          set({ program: { ...program, reflections: { ...program.reflections, [week]: entry } } });
        },

        markMilestone: (day) => {
          const { program } = get();
          if (!program) return;
          const seen = program.ceremonies?.milestones ?? [];
          const all = P.MILESTONE_DAYS.filter((m) => m <= day || seen.includes(m));
          if (all.length === seen.length) return;
          set({ program: { ...program, ceremonies: { ...program.ceremonies, milestones: [...all] } } });
        },

        unlockCollectibles: (ids) => {
          const { program } = get();
          if (!program) return;
          const have = program.collection?.unlocked ?? [];
          const add = ids.filter((id) => !have.includes(id));
          if (!add.length) return;
          set({ program: { ...program, collection: { unlocked: [...have, ...add] } } });
        },

        keepMomentum: () => {
          const { program } = get();
          if (!program || program.after) return;
          set({ program: P.keepMomentum(program, Math.max(pilotToday(get()), 1)) });
        },

        markComeback: (start) => {
          const { program } = get();
          if (!program || program.comeback?.seen === start) return;
          set({ program: { ...program, comeback: { seen: start } } });
        },

        markCeremony: (kind) => {
          const { program } = get();
          if (!program || program.ceremonies?.[kind]) return;
          set({ program: { ...program, ceremonies: { ...program.ceremonies, [kind]: true } } });
        },
      };
    },
    {
      name: resetPilotKey(),
      version: RESET_PILOT_VERSION,
      storage: guardedStorage,
      // The saved state as far as it can be understood. If anything couldn't be (a damaged habit, a whole program
      // that can't be read), the app starts without a program and the recovery screen offers what was found; the
      // original is kept (getItem) and saves are held back until the person decides.
      merge: (persisted, current) => {
        const read = sanitizeResetPilot(persisted);
        if (read.lost?.length) {
          startRecovery(
            {
              reason: read.program ? 'partial' : 'unreadable',
              recovered: read.program ?? null,
              lost: read.lost,
              raw: lastRaw,
            },
            null,
          );
          // The original is copied into a recovery slot; saves are held back meanwhile, so nothing can replace it.
          if (lastRaw !== null) void keepRaw(lastName, lastRaw).then((keptAt) => useRecovery.setState({ keptAt }));
          return { ...current, ...(read.devDayOffset !== undefined ? { devDayOffset: read.devDayOffset } : {}) };
        }
        return { ...current, ...read };
      },
      migrate: (state, version) => migrateSave(state, version) as ResetPilotData,
      partialize: (s): ResetPilotData => ({
        program: s.program,
        devDayOffset: devTools() ? s.devDayOffset : 0,
      }),
    },
  ),
);

/** Keeps only well-formed parts of a save (a damaged program is dropped; an older save's extra fields are ignored). */
export function sanitizeResetPilot(x: unknown): Partial<ResetPilotData> & { lost?: string[] } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  const p = x as Record<string, unknown>;
  const out: Partial<ResetPilotData> & { lost?: string[] } = {};
  if (p.program === null || p.program === undefined) out.program = null;
  else {
    const read = P.inspectPilotProgram(p.program);
    out.program = read.program;
    if (read.lost.length) out.lost = read.lost;
  }
  if (typeof p.devDayOffset === 'number' && Number.isInteger(p.devDayOffset)) out.devDayOffset = p.devDayOffset;
  return out;
}
/** Recovery: continue with what could be recovered. Saves resume (the original stays in its recovery slot). */
export function restoreFromRecovery(): boolean {
  const { recovered, keptAt, pending } = useRecovery.getState();
  if (!pending || !recovered || !keptAt) return false;
  endRecovery();
  useResetPilot.setState({ program: recovered });
  return true;
}

/**
 * Recovery: start over (after the person confirmed). Only once the original is safely kept in a recovery slot, so
 * starting over never destroys the only copy.
 */
export function startOverFromRecovery(): boolean {
  const { keptAt, pending } = useRecovery.getState();
  if (!pending || !keptAt) return false;
  endRecovery();
  useResetPilot.setState({ program: null });
  return true;
}
