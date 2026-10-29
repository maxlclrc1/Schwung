import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

/**
 * AsyncStorage with coalesced writes. Rapid check-offs update memory instantly and
 * hit disk once; anything pending is flushed the moment the app leaves the foreground,
 * which is always the step before iOS kills it.
 */
const DELAY_MS = 250;
const pending = new Map<string, string>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (timer) clearTimeout(timer);
  timer = null;
  const entries = [...pending.entries()];
  pending.clear();
  if (!entries.length) return;
  try {
    await AsyncStorage.multiSet(entries);
  } catch (e) {
    // Not written: keep what failed (unless something newer replaced it) for the next try.
    for (const [k, v] of entries) if (!pending.has(k)) pending.set(k, v);
    throw e;
  }
}

/** Writes anything pending now; resolves once it is on disk (for moments that must not be lost). */
export const flushStorage = flush;

AppState.addEventListener('change', (s) => {
  if (s !== 'active') flush().catch(() => {});
});

export const debouncedStorage: StateStorage = {
  getItem: async (name) => pending.get(name) ?? AsyncStorage.getItem(name),
  setItem: (name, value) => {
    pending.set(name, value);
    if (!timer) timer = setTimeout(() => flush().catch(() => {}), DELAY_MS);
  },
  removeItem: async (name) => {
    pending.delete(name);
    await AsyncStorage.removeItem(name);
  },
};
