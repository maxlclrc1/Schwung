import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dayNumber, toDateKey } from '../core/dates';
import * as P from '../core/reset/pilot';
import type { Feedback, Offer } from '../core/reset/readiness';
import type { SessionType } from '../core/reset/tracking';
import { channel, devTools, type Channel } from '../lib/flags';
import { debouncedStorage } from './storage';

/*
 * The Life Reset pilot's own saved state (a separate key from Schwung's and Field Notes'): starting, using or ending
 * the pilot never reads or writes the running Schwung program, which stays exactly as it was and can be returned to
 * at any time. Development and internal-testing builds only (resetPilotAvailable); the public release never shows or
 * saves it. Rules: core/reset/pilot.ts and SCHWUNG_LIFE_RESET_PILOT.md.
 */

export const resetPilotAvailable = (ch: Channel = channel()) => ch !== 'production';

/** Its own key, alongside Schwung's ('schwung-state', or 'schwung-state-internal' in Expo Go's internal channel). */
export function resetPilotKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-reset-pilot-internal' : 'schwung-reset-pilot';
}

/** The save's own version, separate from Schwung's STORAGE_VERSION. */
export const RESET_PILOT_VERSION = 1;

export type ResetPilotData = {
  /** Show the pilot on the Habits tab (the tester chose it); false returns to the existing program. */
  active: boolean;
  program: P.PilotProgram | null;
  /** Development builds only: moves the pilot's clock (never Schwung's). */
  devDayOffset: number;
};

type Actions = {
  setActive: (on: boolean) => void;
  /** Starts a pilot program. Never over a running pilot (end it first); never touches the Schwung program. */
  start: (answers: P.PilotAnswers, choices: P.PilotChoice[]) => boolean;
  /** Ends the pilot and deletes its data (only the pilot's). */
  end: () => void;
  toggle: (habitId: string) => P.PilotChange['event'];
  complete: (habitId: string) => P.PilotChange['event'];
  undo: (habitId: string) => P.PilotChange['event'];
  startTimer: (habitId: string) => void;
  pauseTimer: (habitId: string) => void;
  resetTimer: (habitId: string) => void;
  /** Saves timers that reached their target or the day's end while the app was away. */
  settleTimers: () => void;
  setMinutes: (habitId: string, minutes: number | null) => void;
  setSession: (details: { type?: SessionType; minutes?: number }) => void;
  accept: (habitId: string, offer: Offer) => void;
  decline: (habitId: string, offer: Offer) => void;
  feedback: (habitId: string, kind: Feedback['kind']) => void;
  easier: (habitId: string) => string | null;
  harder: (habitId: string) => string | null;
  setDevDayOffset: (n: number) => void;
};

const initial: ResetPilotData = { active: false, program: null, devDayOffset: 0 };

/** "Now" for the pilot, with its own development clock. */
export function pilotNow(offset = useResetPilot.getState().devDayOffset): Date {
  const d = new Date();
  if (devTools() && offset) d.setDate(d.getDate() + offset);
  return d;
}

/** The pilot's program day today (0 without a program). */
export function pilotToday(s: Pick<ResetPilotData, 'program' | 'devDayOffset'> = useResetPilot.getState()): number {
  return s.program ? Math.max(1, dayNumber(s.program.startedAt, toDateKey(pilotNow(s.devDayOffset)))) : 0;
}

export const useResetPilot = create<ResetPilotData & Actions>()(
  persist(
    (set, get) => {
      /** Runs a change on today's record; time is real time (timers measure durations, never the dev offset). */
      const change = (f: (p: P.PilotProgram, day: number, now: number) => P.PilotChange) => {
        const { program } = get();
        if (!program || !resetPilotAvailable()) return null;
        const r = f(program, pilotToday(get()), Date.now());
        if (r.program !== program) set({ program: r.program });
        return r.event;
      };
      const progress = (f: (p: P.PilotProgram, day: number) => P.PilotProgram) => {
        const { program } = get();
        if (!program || !resetPilotAvailable()) return;
        set({ program: f(program, pilotToday(get())) });
      };
      const manual = (f: (p: P.PilotProgram, day: number) => P.ManualChange) => {
        const { program } = get();
        if (!program || !resetPilotAvailable()) return 'Not available';
        const r = f(program, pilotToday(get()));
        if ('blocked' in r) return r.blocked;
        set({ program: r.program });
        return null;
      };
      return {
        ...initial,

        setActive: (active) => set({ active: active && resetPilotAvailable() && !!get().program }),

        start: (answers, choices) => {
          if (!resetPilotAvailable() || get().program) return false;
          const program = P.createPilot(answers, choices, toDateKey(pilotNow()));
          if (!program) return false;
          set({ program, active: true });
          return true;
        },

        end: () => set({ ...initial }),

        toggle: (id) => change((p, day) => P.toggle(p, id, day)),
        complete: (id) => change((p, day) => P.complete(p, id, day)),
        undo: (id) => change((p, day) => P.undo(p, id, day)),
        startTimer: (id) => void change((p, day, now) => P.startTimer(p, id, day, now)),
        pauseTimer: (id) => void change((p, day, now) => P.pauseTimer(p, id, day, now)),
        resetTimer: (id) => void change((p, day, now) => P.resetTimer(p, id, day, now)),
        settleTimers: () => {
          const { program } = get();
          if (!program) return;
          const today = pilotToday(get());
          const now = Date.now();
          let p = program;
          // Today's timers, and yesterday's (one left running at midnight stops there).
          for (const day of [today - 1, today])
            for (const id of p.habits) if (day >= 1) p = P.settleTimer(p, id, day, now, today).program;
          if (p !== program) set({ program: p });
        },
        setMinutes: (id, minutes) => void change((p, day) => P.setMinutes(p, id, day, minutes)),
        setSession: (details) => void change((p, day) => P.setSession(p, day, details)),

        accept: (id, offer) => progress((p, day) => P.accept(p, id, offer, day)),
        decline: (id, offer) => progress((p, day) => P.decline(p, id, offer, day)),
        feedback: (id, kind) => progress((p, day) => P.feedback(p, id, kind, day)),
        easier: (id) => manual((p, day) => P.easier(p, id, day)),
        harder: (id) => manual((p, day) => P.harder(p, id, day)),

        setDevDayOffset: (devDayOffset) => set({ devDayOffset: devTools() ? devDayOffset : 0 }),
      };
    },
    {
      name: resetPilotKey(),
      version: RESET_PILOT_VERSION,
      storage: createJSONStorage(() => debouncedStorage),
      merge: (persisted, current) => ({ ...current, ...sanitizeResetPilot(persisted) }),
      partialize: (s): ResetPilotData => ({
        active: s.active,
        program: s.program,
        devDayOffset: devTools() ? s.devDayOffset : 0,
      }),
    },
  ),
);

/** Keeps only well-formed parts of a saved pilot (a damaged program is dropped; Schwung's save is never read). */
export function sanitizeResetPilot(x: unknown): Partial<ResetPilotData> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  const p = x as Record<string, unknown>;
  const out: Partial<ResetPilotData> = {};
  const program = p.program === null || p.program === undefined ? null : P.sanitizePilotProgram(p.program);
  out.program = program;
  out.active = p.active === true && !!program;
  if (typeof p.devDayOffset === 'number' && Number.isInteger(p.devDayOffset)) out.devDayOffset = p.devDayOffset;
  return out;
}
