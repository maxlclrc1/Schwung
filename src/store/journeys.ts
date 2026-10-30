import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import { inspectPilotProgram, type ArchivedJourney, type PilotProgram } from '../core/reset/pilot';
import { channel, type Channel } from '../lib/flags';
import { keepRaw } from './recovery';
import { deferredJSONStorage, debouncedStorage } from './storage';

export type { ArchivedJourney };

/*
 * Past journeys: each finished Life Reset kept as it was when a New Ascent began (docs/BEYOND_THE_SUMMIT_PLAN.md).
 * Immutable: a journey is appended once and never changed; the only other change is removing one the person chose
 * to remove. Saved apart from the current program (its own key), written together with it by store/ascent.ts.
 *
 * Like the program's save, nothing here is ever guessed at: a save that can't be fully read is copied into a
 * recovery slot first and held (`held`): it's never overwritten, no New Ascent can start, and it's included in
 * Export my data, until the person deletes their data.
 */

export const JOURNEYS_VERSION = 1;

export function journeysKey(ch: Channel = channel(), dev: boolean = __DEV__): string {
  return dev && ch === 'internal' ? 'schwung-journeys-internal' : 'schwung-journeys';
}

/** Every journey fully readable, or null (nothing is dropped or repaired quietly). */
export function sanitizeJourneys(x: unknown): ArchivedJourney[] | null {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x)) return null;
  const out: ArchivedJourney[] = [];
  const ids = new Set<string>();
  for (const j of x) {
    if (!j || typeof j !== 'object') return null;
    const { v, id, archivedAt, program } = j as Record<string, unknown>;
    if (v !== 1 || typeof id !== 'string' || !id || ids.has(id) || typeof archivedAt !== 'string') return null;
    const read = inspectPilotProgram(program);
    if (!read.program || read.lost.length) return null;
    ids.add(id);
    out.push({ v: 1, id, archivedAt, program: read.program });
  }
  return out;
}

type JourneysData = { journeys: ArchivedJourney[] };
type Journeys = JourneysData & {
  /** The saved journeys couldn't be fully read: they're kept (a recovery copy) and nothing may replace them. */
  held: boolean;
  remove: (id: string) => void;
};

const deferred = deferredJSONStorage<JourneysData>();
let lastRaw: string | null = null;

const guarded: PersistStorage<JourneysData> = {
  getItem: async (name) => {
    const raw = await debouncedStorage.getItem(name);
    lastRaw = raw;
    if (raw === null) return null;
    let value: StorageValue<JourneysData> | null = null;
    try {
      value = JSON.parse(raw) as StorageValue<JourneysData>;
    } catch {
      value = null;
    }
    // Unreadable, or from a newer Schwung: kept as it is, never rewritten here.
    if (
      !value ||
      typeof value !== 'object' ||
      (typeof value.version === 'number' && value.version > JOURNEYS_VERSION)
    ) {
      await hold(name, raw);
      return null;
    }
    return value;
  },
  setItem: (name, value) => {
    if (useJourneys.getState().held) return;
    deferred.setItem(name, value);
  },
  removeItem: (name) => deferred.removeItem(name),
};

async function hold(name: string, raw: string) {
  useJourneys.setState({ held: true });
  await keepRaw(name, raw);
}

export const useJourneys = create<Journeys>()(
  persist(
    (set, get) => ({
      journeys: [],
      held: false,
      remove: (id) => {
        if (get().held) return;
        set({ journeys: get().journeys.filter((j) => j.id !== id) });
      },
    }),
    {
      name: journeysKey(),
      version: JOURNEYS_VERSION,
      storage: guarded,
      merge: (persisted, current) => {
        const journeys = sanitizeJourneys((persisted as Partial<JourneysData> | undefined)?.journeys);
        if (journeys === null) {
          if (lastRaw !== null) void hold(journeysKey(), lastRaw);
          else useJourneys.setState({ held: true });
          return { ...current, held: true };
        }
        return { ...current, journeys };
      },
      migrate: (state) => state as JourneysData,
      partialize: (s): JourneysData => ({ journeys: s.journeys }),
    },
  ),
);

/** The archive entry for a program that has just been finished. */
export function archiveEntry(program: PilotProgram, now: Date): ArchivedJourney {
  return {
    v: 1,
    id: `ascent-${program.carry?.ascent ?? 1}-${program.startedAt}`,
    archivedAt: now.toISOString(),
    program,
  };
}
