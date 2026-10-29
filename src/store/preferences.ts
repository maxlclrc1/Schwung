import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_REMINDERS, sanitizeReminders, type ReminderSettings } from '../core/reminders';
import type { ThemePreference } from '../core/types';
import { debouncedStorage } from './storage';

/** App-wide preferences (the appearance and the optional daily reminder), apart from the Life Reset's own save. */
export type Preferences = {
  themePreference: ThemePreference;
  reminders: ReminderSettings;
  /** The welcome back on returning after time away (on unless turned off). */
  comebacks: boolean;
};

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export const usePreferences = create<
  Preferences & {
    setThemePreference: (t: ThemePreference) => void;
    setReminders: (r: Partial<ReminderSettings>) => void;
    setComebacks: (on: boolean) => void;
  }
>()(
  persist(
    (set) => ({
      themePreference: 'system',
      reminders: DEFAULT_REMINDERS,
      comebacks: true,
      setThemePreference: (themePreference) => set({ themePreference }),
      setComebacks: (comebacks) => set({ comebacks }),
      setReminders: (r) => set((s) => ({ reminders: sanitizeReminders({ ...s.reminders, ...r }) })),
    }),
    {
      name: 'schwung-preferences',
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      // Anything unexpected falls back to following the phone, and reminders off.
      merge: (persisted, current) => {
        const p = persisted as Partial<Preferences> | undefined;
        const t = p?.themePreference;
        return {
          ...current,
          themePreference: t && THEMES.includes(t) ? t : 'system',
          reminders: sanitizeReminders(p?.reminders),
          comebacks: p?.comebacks !== false,
        };
      },
      partialize: (s): Preferences => ({
        themePreference: s.themePreference,
        reminders: s.reminders,
        comebacks: s.comebacks,
      }),
    },
  ),
);
