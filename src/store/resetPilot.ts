import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canEditYesterday, dayNumber, toDateKey } from '../core/dates';
import * as P from '../core/reset/pilot';
import type { Feedback, Offer } from '../core/reset/readiness';
import type { SessionType } from '../core/reset/tracking';
import { channel, devTools, lifeResetForNewPrograms, type Channel } from '../lib/flags';
import { debouncedStorage } from './storage';

/*
 * The Life Reset program's own saved state (a separate key from Schwung's and Field Notes'; it began as the pilot's
 * and keeps the pilot's key, so a pilot program carries on as it was). Starting, using or ending it never reads or
 * writes a V1/V2 program, which stays exactly as it was and can be returned to at any time. The default experience
 * in development and internal builds (lib/flags lifeResetForNewPrograms); the public release never shows or saves
 * it. Rules: core/reset/pilot.ts and SCHWUNG_LIFE_RESET_PROGRAM.md.
 */

export const resetPilotAvailable = (ch: Channel = channel()) => lifeResetForNewPrograms(ch);

/**
 * Which program the app shows: the Life Reset when there is one and its owner chose it (starting one chooses it),
 * or when there's no V1/V2 program to show instead; otherwise the V1/V2 program. One rule for Habits, Journey,
 * Insights, Settings and the start screen. A V1/V2 program is never shown over a chosen Life Reset, and never
 * hidden unless its owner switched.
 */
export function lifeResetShown(s: Pick<ResetPilotData, 'active' | 'program'>, legacyStarted: boolean): boolean {
  return s.program !== null && (s.active || !legacyStarted);
}

/** Its own key, alongside Schwung's ('schwung-state', or 'schwung-state-internal' in Expo Go's internal channel). */
export function resetPilotKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-reset-pilot-internal' : 'schwung-reset-pilot';
}

/** The save's own version, separate from Schwung's STORAGE_VERSION. */
export const RESET_PILOT_VERSION = 1;

export type ResetPilotData = {
  /** The person chose the Life Reset as the program shown (lifeResetShown); false returns to a V1/V2 program. */
  active: boolean;
  /** The "Start the Life Reset" card on a V1/V2 program's Habits screen was put away ("Not now"). */
  inviteHidden?: boolean;
  program: P.PilotProgram | null;
  /** Development builds only: moves the pilot's clock (never Schwung's). */
  devDayOffset: number;
};

type Actions = {
  setActive: (on: boolean) => void;
  hideInvite: () => void;
  /** Starts a pilot program. Never over a running pilot (end it first); never touches the Schwung program. */
  start: (answers: P.PilotAnswers, choices: P.PilotChoice[]) => boolean;
  /** Ends the pilot and deletes its data (only the pilot's). */
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
};

const initial: ResetPilotData = { active: false, program: null, devDayOffset: 0 };

/** "Now" for the pilot, with its own development clock. */
export function pilotNow(offset: number = useResetPilot.getState().devDayOffset): Date {
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
      /** Runs a change on today's record. */
      const change = (f: (p: P.PilotProgram, day: number) => P.PilotChange) => {
        const { program } = get();
        if (!program || !resetPilotAvailable()) return null;
        const r = f(program, pilotToday(get()));
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
        hideInvite: () => set({ inviteHidden: true }),

        start: (answers, choices) => {
          if (!resetPilotAvailable() || get().program) return false;
          const program = P.createPilot(answers, choices, toDateKey(pilotNow()));
          if (!program) return false;
          set({ program, active: true });
          return true;
        },

        // Only the Life Reset's own program goes; the invite stays put away if it was.
        end: () => set({ ...initial, inviteHidden: get().inviteHidden }),

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
      };
    },
    {
      name: resetPilotKey(),
      version: RESET_PILOT_VERSION,
      storage: createJSONStorage(() => debouncedStorage),
      merge: (persisted, current) => ({ ...current, ...sanitizeResetPilot(persisted) }),
      partialize: (s): ResetPilotData => ({
        active: s.active,
        ...(s.inviteHidden ? { inviteHidden: true } : {}),
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
  if (p.inviteHidden === true) out.inviteHidden = true;
  return out;
}
