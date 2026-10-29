import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemePreference } from '../core/types';
import { debouncedStorage } from './storage';

/** App-wide preferences (the appearance), apart from the Life Reset's own save. */
export type Preferences = { themePreference: ThemePreference };

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];

export const usePreferences = create<Preferences & { setThemePreference: (t: ThemePreference) => void }>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (themePreference) => set({ themePreference }),
    }),
    {
      name: 'schwung-preferences',
      version: 1,
      storage: createJSONStorage(() => debouncedStorage),
      // Anything unexpected falls back to following the phone.
      merge: (persisted, current) => {
        const t = (persisted as Partial<Preferences> | undefined)?.themePreference;
        return { ...current, themePreference: t && THEMES.includes(t) ? t : 'system' };
      },
      partialize: (s): Preferences => ({ themePreference: s.themePreference }),
    },
  ),
);
