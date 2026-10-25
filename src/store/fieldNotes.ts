import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dateForDay, toDateKey } from '../core/dates';
import { experimentById, experimentOptions } from '../core/fieldnotes/catalog';
import { dayOf, FN_DAYS, stageOf } from '../core/fieldnotes/journey';
import type {
  Decision,
  Feeling,
  FieldNote,
  FnDay,
  FnGoal,
  FnProfile,
  FnRun,
  Rating,
  TimeOfDay,
} from '../core/fieldnotes/types';
import type { ProfileV2 } from '../core/v2/types';
import { channel, devTools, type Channel } from '../lib/flags';
import { debouncedStorage } from './storage';

/*
 * Field Notes' own saved state (a separate key from Schwung's): starting, recording or restarting it never reads
 * or writes a Schwung program. Available only in development and internal-testing builds (fieldNotesAvailable).
 */

export const fieldNotesAvailable = (ch: Channel = channel()) => ch !== 'production';

/** Its own key, alongside Schwung's (which is 'schwung-state' or 'schwung-state-internal'). */
export function fieldNotesKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-fieldnotes-internal' : 'schwung-fieldnotes';
}

export type FieldNotesData = {
  /** Open Field Notes when the app opens (the tester chose it). */
  active: boolean;
  run: FnRun | null;
  /** Finished field notes, newest last. */
  archive: FieldNote[];
  /** Optional evening reminder, replacing Schwung's while Field Notes is active. */
  reminder: { on: boolean; time: string };
  /** Local only: when the app was opened and in which experience ("<ISO time> fieldnotes|schwung"), for the study. */
  opens: string[];
  /** Development builds only: moves Field Notes' clock to test all 14 days. */
  devDayOffset: number;
};

type Actions = {
  setActive: (on: boolean) => void;
  start: (goal: FnGoal, profile: FnProfile, experimentId: string, schwung: ProfileV2 | null) => boolean;
  /** Records today's answers (only today: past days stay as they were). */
  record: (patch: FnDay) => void;
  clearRating: () => void;
  setCheckIn: (f: Feeling) => void;
  decide: (d: Decision, nextExperimentId?: string) => boolean;
  /** Ends the run into the archive (after day 14 and a decision) or discards it; Schwung is never touched. */
  finish: () => void;
  reset: () => void;
  setReminder: (on: boolean, time: string) => void;
  /** Local study log: an app open, tagged with the experience in use. */
  noteOpen: (mode: 'fieldnotes' | 'schwung') => void;
  setDevDayOffset: (n: number) => void;
};

const initial: FieldNotesData = {
  active: false,
  run: null,
  archive: [],
  reminder: { on: false, time: '20:00' },
  opens: [],
  devDayOffset: 0,
};

/** "Now" for Field Notes, with its own development clock. */
export function fnNow(offset = useFieldNotes.getState().devDayOffset): Date {
  const d = new Date();
  if (devTools() && offset) d.setDate(d.getDate() + offset);
  return d;
}

export function fnToday(s: Pick<FieldNotesData, 'run' | 'devDayOffset'> = useFieldNotes.getState()): number {
  return s.run ? dayOf(s.run.startedAt, toDateKey(fnNow(s.devDayOffset))) : 0;
}

export const useFieldNotes = create<FieldNotesData & Actions>()(
  persist(
    (set, get) => {
      const todayKey = () => {
        const { run } = get();
        return run ? dateForDay(run.startedAt, fnToday(get())) : toDateKey(fnNow());
      };
      return {
        ...initial,

        setActive: (active) => set({ active }),

        start: (goal, profile, experimentId, schwung) => {
          const o = experimentOptions(goal, profile, schwung).find((x) => x.id === experimentId);
          if (!o) return false;
          set({
            active: true,
            run: {
              startedAt: toDateKey(fnNow()),
              goal,
              profile,
              experiment: { id: o.id, habitId: o.habitId, question: o.question, action: o.action },
              days: {},
            },
          });
          return true;
        },

        record: (patch) => {
          const { run } = get();
          if (!run) return;
          const day = fnToday(get());
          if (day > FN_DAYS) return;
          const key = todayKey();
          const prev = run.days[key] ?? {};
          const next: FnDay = { ...prev, ...patch };
          // "Tried" belongs to experiment days only; "when" only to a day it was tried.
          if (stageOf(day) === 'baseline') {
            delete next.tried;
            delete next.when;
          }
          if (next.tried !== true) delete next.when;
          set({ run: { ...run, days: { ...run.days, [key]: next } } });
        },

        clearRating: () => {
          const { run } = get();
          if (!run) return;
          const key = todayKey();
          const prev = run.days[key];
          if (!prev) return;
          const next = { ...prev };
          delete next.rating;
          set({ run: { ...run, days: { ...run.days, [key]: next } } });
        },

        setCheckIn: (checkIn) => {
          const { run } = get();
          if (run) set({ run: { ...run, checkIn } });
        },

        decide: (decision, nextExperimentId) => {
          const { run } = get();
          if (!run || fnToday(get()) < 11) return false;
          const def = experimentById(run.experiment.id);
          if (decision === 'different') {
            const o = experimentOptions(run.goal, run.profile, null).find(
              (x) => x.id === nextExperimentId && x.id !== run.experiment.id,
            );
            if (!o) return false;
            set({ run: { ...run, decision, next: { action: o.action, experimentId: o.id } } });
            return true;
          }
          const action = decision === 'easier' && def ? def.easier : run.experiment.action;
          set({ run: { ...run, decision, next: { action } } });
          return true;
        },

        finish: () => {
          const { run, archive } = get();
          if (!run) return;
          const done = fnToday(get()) >= FN_DAYS && run.decision && run.next;
          set({
            run: null,
            archive: done
              ? [
                  ...archive,
                  {
                    goal: run.goal,
                    experiment: run.experiment,
                    startedAt: run.startedAt,
                    days: run.days,
                    checkIn: run.checkIn,
                    decision: run.decision!,
                    next: run.next!,
                    finishedOn: todayKey(),
                  },
                ]
              : archive,
          });
        },

        reset: () => {
          const { reminder, opens } = get();
          set({ ...initial, reminder, opens });
        },

        setReminder: (on, time) => set({ reminder: { on, time } }),

        noteOpen: (mode) => {
          const stamp = `${new Date().toISOString()} ${mode}`;
          // One entry per minute is plenty; capped so the save stays small.
          const opens = get().opens;
          if (opens.length && opens[opens.length - 1].slice(0, 16) === stamp.slice(0, 16)) return;
          set({ opens: [...opens, stamp].slice(-500) });
        },

        setDevDayOffset: (devDayOffset) => set({ devDayOffset: devTools() ? devDayOffset : 0 }),
      };
    },
    {
      name: fieldNotesKey(),
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      // A damaged save starts Field Notes fresh rather than breaking it; Schwung's own save is a different key.
      merge: (persisted, current) => ({ ...current, ...sanitizeFieldNotes(persisted) }),
      partialize: (s): FieldNotesData => ({
        active: s.active,
        run: s.run,
        archive: s.archive,
        reminder: s.reminder,
        opens: s.opens,
        devDayOffset: devTools() ? s.devDayOffset : 0,
      }),
    },
  ),
);

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Keeps only well-formed parts of a saved Field Notes state. */
export function sanitizeFieldNotes(p: unknown): Partial<FieldNotesData> {
  if (!isObj(p)) return {};
  const out: Partial<FieldNotesData> = {};
  if (typeof p.active === 'boolean') out.active = p.active;
  if (isObj(p.reminder) && typeof p.reminder.on === 'boolean' && typeof p.reminder.time === 'string') {
    out.reminder = { on: p.reminder.on, time: p.reminder.time };
  }
  if (Array.isArray(p.opens)) out.opens = p.opens.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(p.archive)) out.archive = p.archive.filter(isObj) as FieldNote[];
  if (typeof p.devDayOffset === 'number') out.devDayOffset = p.devDayOffset;
  const run = p.run;
  if (run === null) out.run = null;
  else if (
    isObj(run) &&
    typeof run.startedAt === 'string' &&
    DATE_KEY.test(run.startedAt) &&
    typeof run.goal === 'string' &&
    isObj(run.experiment) &&
    typeof run.experiment.action === 'string' &&
    isObj(run.profile) &&
    isObj(run.days)
  ) {
    const days: Record<string, FnDay> = {};
    for (const [k, v] of Object.entries(run.days)) {
      if (!DATE_KEY.test(k) || !isObj(v)) continue;
      const d: FnDay = {};
      if (typeof v.tried === 'boolean') d.tried = v.tried;
      if (v.when === 'morning' || v.when === 'afternoon' || v.when === 'evening') d.when = v.when as TimeOfDay;
      if (typeof v.rating === 'number' && Number.isInteger(v.rating) && v.rating >= 1 && v.rating <= 5) {
        d.rating = v.rating as Rating;
      }
      days[k] = d;
    }
    out.run = { ...(run as unknown as FnRun), days };
  }
  return out;
}
