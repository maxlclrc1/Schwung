import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildPlan, MIN_HABITS, toPlan } from '../core/plan';
import { getHabit, levelUp } from '../core/habits';
import { dateForDay, dayNumber, toDateKey } from '../core/dates';
import { MILESTONES, phaseLevel, phaseOf, reconcile } from '../core/progression';
import type { Answers, DayLog, Level, Notice, PlanHabit, ThemePreference, Weekday } from '../core/types';
import { assemblePlan, swappedHabit } from '../core/v2/program';
import type { ProfileV2 } from '../core/v2/types';
import { v2PreviewEnabled } from '../lib/flags';
import { migrateSaved, sanitize, STORAGE_VERSION } from './migrate';
import { coversEveryWeekday, dueOn, rescheduled, validDays } from '../core/schedule';
import { debouncedStorage } from './storage';

export type AppData = {
  startedAt: string | null; // date key of day 1
  answers: Answers | null;
  plan: PlanHabit[];
  logs: Record<string, DayLog>;
  reminderTime: string; // "HH:MM"
  notificationsEnabled: boolean;
  seenCeremonies: number[];
  appliedPhase: number;
  notices: Notice[];
  /** Appearance. Older saved data has no value and gets the default ('system') when it loads. */
  themePreference: ThemePreference;
  /** Dev-only time travel, in days. Always 0 in release builds. */
  devDayOffset: number;
  /**
   * Which plan engine the running program uses. Older saved data has none and loads as 1 (V1). Set only
   * when a program starts; nothing ever converts a running program.
   */
  programVersion: 1 | 2;
  /** V2 answers: the onboarding draft, then the profile the V2 program was built from. Null for V1. */
  profile: ProfileV2 | null;
  /** Dev-only switch for the V2 preview (see lib/flags). Always false in release builds. */
  devV2Preview: boolean;
};

type Actions = {
  setAnswers: (a: Answers) => void;
  /** Starts a new program from the saved answers. Does nothing if one is already running (returns false). */
  startProgram: () => boolean;
  toggleHabit: (day: number, habitId: string) => void;
  setLevel: (habitId: string, level: Level) => void;
  acceptLevelUp: (habitId: string) => void;
  declineLevelUp: (habitId: string) => void;
  swapHabit: (oldId: string, newId: string) => void;
  addCustomHabit: (title: string, description?: string) => void;
  editCustomHabit: (habitId: string, title: string, description?: string) => void;
  removeHabit: (habitId: string) => boolean;
  reconcileNow: (yesterdayEditable: boolean) => void;
  dismissNotice: (id: string) => void;
  markCeremonySeen: (milestone: number) => void;
  setReminder: (time: string, enabled: boolean) => void;
  setThemePreference: (preference: ThemePreference) => void;
  restart: () => void;
  setDevDayOffset: (n: number) => void;
  /** V2 onboarding draft (nothing is kept for under-16s: pass null). */
  setProfile: (p: ProfileV2 | null) => void;
  /** Starts a V2 program from the saved profile and the choice-step picks. False if not allowed. */
  startProgramV2: (chosen: string[]) => boolean;
  swapHabitV2: (oldId: string, newId: string) => boolean;
  setDevV2Preview: (on: boolean) => void;
  /** Changes the weekdays a scheduled habit is due (2–3 days; every weekday must keep a due habit). */
  setSchedule: (habitId: string, days: Weekday[]) => boolean;
  /** Development builds only: adds a synthetic scheduled habit to test the scheduler. Never a recommendation. */
  addDevScheduledHabit: (days: Weekday[], phaseLevelUps?: boolean) => string | null;
};

export type AppState = AppData & Actions;

const initial: AppData = {
  startedAt: null,
  answers: null,
  plan: [],
  logs: {},
  reminderTime: '20:00',
  notificationsEnabled: false,
  themePreference: 'system',
  seenCeremonies: [],
  appliedPhase: 1,
  notices: [],
  devDayOffset: 0,
  programVersion: 1,
  profile: null,
  devV2Preview: false,
};

/** "Now", honoring the dev time-travel offset. */
export function appNow(offset = useApp.getState().devDayOffset): Date {
  const d = new Date();
  if (__DEV__ && offset) d.setDate(d.getDate() + offset);
  return d;
}

export function currentDay(s: Pick<AppData, 'startedAt' | 'devDayOffset'> = useApp.getState()): number {
  if (!s.startedAt) return 0;
  return Math.max(1, dayNumber(s.startedAt, toDateKey(appNow(s.devDayOffset))));
}

/**
 * The habit ids planned for a day: those due that day, plus any already completed that day and still in the plan
 * (so changing a schedule never takes away a session already done). For daily plans this is the whole plan.
 */
function plannedFor(plan: PlanHabit[], startKey: string, day: number, completed: string[] = []): string[] {
  const due = new Set(dueOn(plan, startKey, day).map((h) => h.habitId));
  return plan.filter((h) => due.has(h.habitId) || completed.includes(h.habitId)).map((h) => h.habitId);
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Keep today's log in sync with plan edits so ratios and XP stay honest. */
      const syncTodayLog = (plan: PlanHabit[], logs: Record<string, DayLog>) => {
        const { startedAt } = get();
        if (!startedAt) return logs;
        const day = currentDay(get());
        const date = dateForDay(startedAt, day);
        const log = logs[date];
        if (!log) return logs;
        const planned = plannedFor(plan, startedAt, day, log.completed);
        return { ...logs, [date]: { ...log, planned, completed: log.completed.filter((id) => planned.includes(id)) } };
      };

      const updatePlan = (fn: (plan: PlanHabit[]) => PlanHabit[]) => {
        const plan = fn(get().plan);
        set({ plan, logs: syncTodayLog(plan, get().logs) });
      };

      return {
        ...initial,

        setAnswers: (answers) => set({ answers }),

        startProgram: () => {
          const { answers, startedAt } = get();
          // Never overwrite a running program (e.g. after navigating back into onboarding).
          // Starting over is only ever explicit: Settings → Restart clears it first.
          if (!answers || startedAt) return false;
          set({
            startedAt: toDateKey(appNow()),
            plan: toPlan(buildPlan(answers)),
            logs: {},
            seenCeremonies: [],
            appliedPhase: 1,
            notices: [],
            programVersion: 1,
            profile: null,
          });
          return true;
        },

        startProgramV2: (chosen) => {
          const s = get();
          // Same rule as V1: never over a running program. And only while the preview flag is on.
          if (s.startedAt || !s.profile || !v2PreviewEnabled(s.devV2Preview)) return false;
          const plan = assemblePlan(s.profile, chosen);
          if (!plan) return false;
          set({
            startedAt: toDateKey(appNow()),
            plan,
            logs: {},
            seenCeremonies: [],
            appliedPhase: 1,
            notices: [],
            programVersion: 2,
            answers: null,
          });
          return true;
        },

        toggleHabit: (day, habitId) => {
          const { startedAt, logs, plan } = get();
          if (!startedAt) return;
          const date = dateForDay(startedAt, day);
          const prev = logs[date];
          const completed = prev?.completed ?? [];
          const next = completed.includes(habitId) ? completed.filter((id) => id !== habitId) : [...completed, habitId];
          // Yesterday keeps the plan it had; only a brand-new log takes the habits due that day.
          const planned =
            day === currentDay(get()) || !prev ? plannedFor(plan, startedAt, day, completed) : prev.planned;
          set({ logs: { ...logs, [date]: { day, date, completed: next, planned } } });
        },

        setLevel: (habitId, level) =>
          updatePlan((plan) =>
            plan.map((h) => (h.habitId === habitId ? { ...h, level, levelSince: currentDay(get()) } : h)),
          ),

        acceptLevelUp: (habitId) =>
          updatePlan((plan) =>
            plan.map((h) =>
              h.habitId === habitId ? { ...h, level: levelUp(h.level), levelSince: currentDay(get()) } : h,
            ),
          ),

        declineLevelUp: (habitId) =>
          updatePlan((plan) => plan.map((h) => (h.habitId === habitId ? { ...h, levelSince: currentDay(get()) } : h))),

        swapHabit: (oldId, newId) => {
          // V2 programs swap within the V2 library (swapHabitV2); V1 swaps stay legacy.
          if (get().programVersion === 2) return;
          if (!getHabit(newId) || get().plan.some((h) => h.habitId === newId)) return;
          const day = currentDay(get());
          updatePlan((plan) =>
            plan.map((h) =>
              h.habitId === oldId
                ? { habitId: newId, level: phaseLevel(phaseOf(day)), addedOnDay: day, levelSince: day - 1 }
                : h,
            ),
          );
        },

        swapHabitV2: (oldId, newId) => {
          const { programVersion, profile, plan } = get();
          if (programVersion !== 2 || !profile || !plan.some((h) => h.habitId === oldId)) return false;
          const day = currentDay(get());
          const habit = swappedHabit(profile, plan, oldId, newId, day);
          if (!habit) return false;
          updatePlan((p) => p.map((h) => (h.habitId === oldId ? habit : h)));
          return true;
        },

        addCustomHabit: (title, description) => {
          const day = currentDay(get());
          updatePlan((plan) => [
            ...plan,
            {
              habitId: `custom_${uid()}`,
              custom: { title: title.trim(), description: description?.trim() || undefined },
              level: 'easy',
              addedOnDay: day,
              levelSince: day - 1,
            },
          ]);
        },

        editCustomHabit: (habitId, title, description) =>
          updatePlan((plan) =>
            plan.map((h) =>
              h.habitId === habitId
                ? { ...h, custom: { title: title.trim(), description: description?.trim() || undefined } }
                : h,
            ),
          ),

        removeHabit: (habitId) => {
          if (get().plan.length <= MIN_HABITS) return false;
          // Never leave a weekday with nothing due (see coversEveryWeekday).
          if (!coversEveryWeekday(get().plan.filter((h) => h.habitId !== habitId))) return false;
          updatePlan((plan) => plan.filter((h) => h.habitId !== habitId));
          return true;
        },

        reconcileNow: (yesterdayEditable) => {
          const s = get();
          if (!s.startedAt) return;
          const r = reconcile({
            plan: s.plan,
            appliedPhase: s.appliedPhase,
            startKey: s.startedAt,
            logs: s.logs,
            today: currentDay(s),
            yesterdayEditable,
          });
          if (!r.events.length && r.appliedPhase === s.appliedPhase) return;
          const notices: Notice[] = r.events.map((e) => ({ ...e, id: uid() }));
          set({ plan: r.plan, appliedPhase: r.appliedPhase, notices: [...s.notices, ...notices] });
        },

        dismissNotice: (id) => set({ notices: get().notices.filter((n) => n.id !== id) }),

        markCeremonySeen: (milestone) => {
          const seen = new Set(get().seenCeremonies);
          MILESTONES.filter((m) => m <= milestone).forEach((m) => seen.add(m));
          set({ seenCeremonies: [...seen] });
        },

        setReminder: (reminderTime, notificationsEnabled) => set({ reminderTime, notificationsEnabled }),

        // Touches nothing else: theme changes never affect the program or progress.
        setThemePreference: (themePreference) => set({ themePreference }),

        restart: () => {
          const { reminderTime, notificationsEnabled, themePreference, devV2Preview } = get();
          set({ ...initial, reminderTime, notificationsEnabled, themePreference, devV2Preview });
        },

        setDevDayOffset: (devDayOffset) => set({ devDayOffset: __DEV__ ? devDayOffset : 0 }),

        setProfile: (profile) => set({ profile: profile?.age === 'u16' ? null : profile }),

        setDevV2Preview: (on) => set({ devV2Preview: __DEV__ ? on : false }),

        setSchedule: (habitId, days) => {
          const { plan } = get();
          const h = plan.find((x) => x.habitId === habitId);
          if (!h?.schedule || !validDays(days)) return false;
          // Applies from today on; the earlier days are kept as history for the days before.
          const schedule = rescheduled(h.schedule, days, currentDay(get()), h.addedOnDay);
          const next = plan.map((x) => (x.habitId === habitId ? { ...x, schedule } : x));
          if (!coversEveryWeekday(next)) return false;
          // Past logs keep the lists they had; today's is re-synced (a session already done today stays counted).
          updatePlan(() => next);
          return true;
        },

        addDevScheduledHabit: (days, phaseLevelUps) => {
          if (!__DEV__ || !get().startedAt || !validDays(days)) return null;
          const day = currentDay(get());
          const habitId = `devsched_${uid()}`;
          updatePlan((plan) => [
            ...plan,
            {
              habitId,
              level: 'easy',
              addedOnDay: day,
              levelSince: day - 1,
              spec: {
                title: 'Test session (dev)',
                icon: 'flask',
                why: 'A synthetic habit for testing scheduled days. Not a recommendation, and not an exercise.',
                targets: {
                  easy: 'Test session · level 1',
                  medium: 'Test session · level 2',
                  hard: 'Test session · level 3',
                },
                notes: ['Development test only.'],
              },
              schedule: { days: [...days], ...(phaseLevelUps ? { phaseLevelUps: true } : {}) },
            },
          ]);
          return habitId;
        },
      };
    },
    {
      name: 'schwung-state',
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => debouncedStorage),
      migrate: (persisted, version) => migrateSaved(persisted, version) as unknown as AppState,
      // Every load, whatever its version, gets the same safe fallbacks.
      merge: (persisted, current) => ({ ...current, ...sanitize((persisted ?? {}) as Record<string, unknown>) }),
      partialize: (s): AppData => ({
        startedAt: s.startedAt,
        answers: s.answers,
        plan: s.plan,
        logs: s.logs,
        reminderTime: s.reminderTime,
        notificationsEnabled: s.notificationsEnabled,
        themePreference: s.themePreference,
        seenCeremonies: s.seenCeremonies,
        appliedPhase: s.appliedPhase,
        notices: s.notices,
        devDayOffset: __DEV__ ? s.devDayOffset : 0,
        programVersion: s.programVersion,
        profile: s.profile,
        devV2Preview: __DEV__ ? s.devV2Preview : false,
      }),
    },
  ),
);

export function exportData(): AppData {
  const {
    startedAt,
    answers,
    plan,
    logs,
    reminderTime,
    notificationsEnabled,
    themePreference,
    seenCeremonies,
    appliedPhase,
    notices,
    programVersion,
    profile,
  } = useApp.getState();
  return {
    startedAt,
    answers,
    plan,
    logs,
    reminderTime,
    notificationsEnabled,
    themePreference,
    seenCeremonies,
    appliedPhase,
    notices,
    devDayOffset: 0,
    programVersion,
    profile,
    devV2Preview: false,
  };
}
