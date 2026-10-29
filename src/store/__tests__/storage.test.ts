import { describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debouncedStorage, flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const multiSet = AsyncStorage.multiSet as jest.Mock<typeof AsyncStorage.multiSet>;

describe('deferred saves', () => {
  it('keeps a failed write for the next try', async () => {
    debouncedStorage.setItem('k1', 'one');
    multiSet.mockRejectedValueOnce(new Error('disk'));
    await expect(flushStorage()).rejects.toThrow('disk');
    await flushStorage();
    expect(await AsyncStorage.getItem('k1')).toBe('one');
  });

  it('never brings back an older value when a newer one was written meanwhile', async () => {
    let fail!: (e: Error) => void;
    multiSet.mockImplementationOnce(() => new Promise<void>((_, reject) => (fail = reject)));
    debouncedStorage.setItem('k2', 'old');
    const first = flushStorage(); // in flight, will fail
    debouncedStorage.setItem('k2', 'new');
    await flushStorage(); // the newer value reaches disk
    fail(new Error('disk'));
    await expect(first).rejects.toThrow('disk');
    await flushStorage(); // nothing older may be retried over it
    expect(await AsyncStorage.getItem('k2')).toBe('new');
    expect(await debouncedStorage.getItem('k2')).toBe('new');
  });
});
