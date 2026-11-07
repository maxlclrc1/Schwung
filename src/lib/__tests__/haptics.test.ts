import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Platform } from 'react-native';
import { completionHaptic, haptic } from '../haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy', Soft: 'soft', Rigid: 'rigid' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

type HapticsMock = { selectionAsync: jest.Mock; impactAsync: jest.Mock; notificationAsync: jest.Mock };
const H = () => jest.requireMock('expo-haptics') as HapticsMock;
const played = () => [
  ...H().selectionAsync.mock.calls.map(() => 'selection'),
  ...H().impactAsync.mock.calls.map((c) => `impact:${String(c[0])}`),
  ...H().notificationAsync.mock.calls.map((c) => `notification:${String(c[0])}`),
];

// The module remembers the last haptic's time: each test starts well after the previous one.
let now = 1_000_000;
beforeEach(() => {
  now += 10_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.clearAllMocks();
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('habit completion haptics', () => {
  it('a completion plays one quiet Light impact, never the Success pattern', () => {
    completionHaptic({ kind: 'completed' });
    expect(played()).toEqual(['impact:light']);
  });

  it('an undo plays one light selection', () => {
    completionHaptic({ kind: 'uncompleted' });
    expect(played()).toEqual(['selection']);
  });

  it('nothing changed (a cancelled swipe, a repeat, a blocked change): no haptic', () => {
    completionHaptic(null);
    completionHaptic(undefined);
    expect(played()).toEqual([]);
  });

  it('one interaction, one haptic: a button’s own select right after a completion or undo is dropped', () => {
    completionHaptic({ kind: 'completed' });
    now += 10;
    haptic.select();
    now += 1000;
    completionHaptic({ kind: 'uncompleted' });
    now += 10;
    haptic.select();
    expect(played()).toEqual(['selection', 'impact:light']);
    expect(H().selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('the threshold tick and the completion on release both play: they are separate moments', () => {
    haptic.tick();
    now += 300;
    completionHaptic({ kind: 'completed' });
    expect(played()).toEqual(['selection', 'impact:light']);
  });

  it('separate completions always play', () => {
    completionHaptic({ kind: 'completed' });
    now += 400;
    completionHaptic({ kind: 'completed' });
    expect(H().impactAsync).toHaveBeenCalledTimes(2);
  });

  it('never plays on the web', () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    try {
      completionHaptic({ kind: 'completed' });
      haptic.tick();
      haptic.select();
      expect(played()).toEqual([]);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});
