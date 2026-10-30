import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushStorage } from './storage';

/*
 * Several saves replaced as one (a backup restore, a New Ascent): nothing in memory changes until all of them are on
 * disk, written in one write and read back. If that fails, `keepCurrent` saves the current state again (an empty
 * change makes a store save itself), so the disk never keeps a part of the new state. Closed mid-way, the app opens
 * on the old state or the new one, never on a mix.
 */
export async function commitTogether(writes: [key: string, text: string][], keepCurrent: () => void): Promise<boolean> {
  try {
    await AsyncStorage.multiSet(writes);
    for (const [k, text] of writes) if ((await AsyncStorage.getItem(k)) !== text) throw new Error('Not written');
    return true;
  } catch {
    keepCurrent();
    await flushStorage().catch(() => {});
    return false;
  }
}

/** The text a zustand persist store saves, so the next launch reads a committed state like any other save. */
export const persisted = (state: unknown, version: number) => JSON.stringify({ state, version });
