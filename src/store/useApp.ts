import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildPlan, MIN_HABITS, toPlan } from '../core/plan';
import { getHabit, levelUp } from '../core/habits';
import { dateForDay, dayNumber, toDateKey } from '../core/dates';
import { MILESTONES, phaseLevel, phaseOf, reconcile } from '../core/progression';
import type { Answers, DayLog, Level, Notice, PlanHabit, ThemePreference } from '../core/types';
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
};

type Actions = {
  setAnswers: (a: Answers) => void;
  startProgram: () => void;
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
        const planned = plan.map((p) => p.habitId);
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
          const { answers } = get();
          if (!answers) return;
          set({
            startedAt: toDateKey(appNow()),
            plan: toPlan(buildPlan(answers)),
            logs: {},
            seenCeremonies: [],
            appliedPhase: 1,
            notices: [],
          });
        },

        toggleHabit: (day, habitId) => {
          const { startedAt, logs, plan } = get();
          if (!startedAt) return;
          const date = dateForDay(startedAt, day);
          const prev = logs[date];
          const completed = prev?.completed ?? [];
          const next = completed.includes(habitId) ? completed.filter((id) => id !== habitId) : [...completed, habitId];
          // Yesterday keeps the plan it had; only a brand-new log takes today's plan.
          const planned = day === currentDay(get()) || !prev ? plan.map((p) => p.habitId) : prev.planned;
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
          const { reminderTime, notificationsEnabled, themePreference } = get();
          set({ ...initial, reminderTime, notificationsEnabled, themePreference });
        },

        setDevDayOffset: (devDayOffset) => set({ devDayOffset: __DEV__ ? devDayOffset : 0 }),
      };
    },
    {
      name: 'schwung-state',
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
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
  };
}
