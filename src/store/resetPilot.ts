import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canEditYesterday, dayNumber, toDateKey } from '../core/dates';
import * as P from '../core/reset/pilot';
import type { Reflection, ReflectionAnswer } from '../core/reset/reflections';
import type { Feedback, Offer } from '../core/reset/readiness';
import type { SessionType } from '../core/reset/tracking';
import { channel, devTools, type Channel } from '../lib/flags';
import { CROP_COUNT } from '../components/habitArt';
import { debouncedStorage } from './storage';

/*
 * The Life Reset program's saved state: the app's one program. It began as the pilot's and keeps the pilot's key,
 * so a pilot program carries on as it was. Rules: core/reset/pilot.ts and SCHWUNG_LIFE_RESET_PROGRAM.md.
 */

/** Its key ('-internal' in Expo Go's internal channel, so trying that channel never touches the development save). */
export function resetPilotKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-reset-pilot-internal' : 'schwung-reset-pilot';
}

/** The save's version. */
export const RESET_PILOT_VERSION = 1;

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
          const program = P.createPilot(answers, choices, toDateKey(pilotNow()));
          if (!program) return false;
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
      storage: createJSONStorage(() => debouncedStorage),
      merge: (persisted, current) => ({ ...current, ...sanitizeResetPilot(persisted) }),
      partialize: (s): ResetPilotData => ({
        program: s.program,
        devDayOffset: devTools() ? s.devDayOffset : 0,
      }),
    },
  ),
);

/** Keeps only well-formed parts of a save (a damaged program is dropped; an older save's extra fields are ignored). */
export function sanitizeResetPilot(x: unknown): Partial<ResetPilotData> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  const p = x as Record<string, unknown>;
  const out: Partial<ResetPilotData> = {};
  const program = p.program === null || p.program === undefined ? null : P.sanitizePilotProgram(p.program);
  out.program = program;
  if (typeof p.devDayOffset === 'number' && Number.isInteger(p.devDayOffset)) out.devDayOffset = p.devDayOffset;
  return out;
}
