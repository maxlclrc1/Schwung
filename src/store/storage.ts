import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { PersistStorage, StateStorage, StorageValue } from 'zustand/middleware';

/**
 * AsyncStorage with coalesced writes. Rapid check-offs update memory instantly and hit disk once; anything pending
 * is flushed the moment the app leaves the foreground, which is always the step before iOS kills it.
 *
 * The stores save through `deferredJSONStorage`, which also defers the JSON itself: a change only records the new
 * state, and it's serialized when the write happens, a moment later, off the path of the gesture that made it.
 * Nothing is lost: until it's on disk the newest state stays pending (a failed write is retried at the next
 * flush), and reads see it.
 */
const DELAY_MS = 250;
/** A value to write: the text, or how to make it (serialized at write time). */
const pending = new Map<string, string | (() => string)>();
let timer: ReturnType<typeof setTimeout> | null = null;

const text = (v: string | (() => string)) => (typeof v === 'string' ? v : v());

async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const entries = [...pending.entries()];
  pending.clear();
  if (!entries.length) return;
  const writes = entries.map(([k, v]) => [k, text(v)] as [string, string]);
  try {
    await AsyncStorage.multiSet(writes);
  } catch (e) {
    // Not written: keep what failed (unless something newer replaced it) for the next try.
    for (const [k, v] of writes) if (!pending.has(k)) pending.set(k, v);
    // And try again shortly, without waiting for the next change.
    if (!timer) timer = setTimeout(() => flush().catch(() => {}), 2000);
    throw e;
  }
}

/** Drops pending (not yet written) values for these keys: used only by "Delete my data". */
export function discardPending(keys: string[]) {
  for (const k of keys) pending.delete(k);
}

/** Writes anything pending now; resolves once it is on disk (for moments that must not be lost). */
export const flushStorage = flush;

AppState.addEventListener('change', (s) => {
  if (s !== 'active') flush().catch(() => {});
});

const schedule = () => {
  if (!timer) timer = setTimeout(() => flush().catch(() => {}), DELAY_MS);
};

export const debouncedStorage: StateStorage = {
  getItem: async (name) => {
    const p = pending.get(name);
    return p !== undefined ? text(p) : AsyncStorage.getItem(name);
  },
  setItem: (name, value) => {
    pending.set(name, value);
    schedule();
  },
  removeItem: async (name) => {
    pending.delete(name);
    await AsyncStorage.removeItem(name);
  },
};

/** A zustand persist storage on top of debouncedStorage that serializes at write time, not at every change. */
export function deferredJSONStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name) => {
      const raw = await debouncedStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
    },
    setItem: (name, value) => {
      pending.set(name, () => JSON.stringify(value));
      schedule();
    },
    removeItem: (name) => debouncedStorage.removeItem(name),
  };
}
