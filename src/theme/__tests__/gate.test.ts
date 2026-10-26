import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { allLoaded, forgetPainting, reportLoaded, requestScheme, THEME_READY_TIMEOUT_MS, useThemeGate } from '../gate';

const shown = () => useThemeGate.getState().shown;
const flush = () => jest.advanceTimersByTime(20); // past the one frame before a switch shows

beforeEach(() => {
  jest.useFakeTimers();
  useThemeGate.setState({ shown: null, target: null, loaded: {} });
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('theme switches that wait for their paintings', () => {
  it('shows the first scheme at once (app start)', () => {
    requestScheme('dark');
    expect(shown()).toBe('dark');
  });

  it('switches straight away when nothing needs loading', () => {
    requestScheme('dark');
    requestScheme('light');
    flush();
    expect(shown()).toBe('light');
  });

  it('waits until every painting has the incoming theme, then switches', () => {
    requestScheme('dark');
    reportLoaded('world', ['dark']);
    reportLoaded('card', ['dark']);
    requestScheme('light');
    flush();
    expect(shown()).toBe('dark');
    reportLoaded('world', ['dark', 'light']);
    flush();
    expect(shown()).toBe('dark');
    reportLoaded('card', ['dark', 'light']);
    flush();
    expect(shown()).toBe('light');
  });

  it('never waits for a painting that has left the screen', () => {
    requestScheme('dark');
    reportLoaded('card', ['dark']);
    requestScheme('light');
    flush();
    expect(shown()).toBe('dark');
    forgetPainting('card');
    flush();
    expect(shown()).toBe('light');
  });

  it('switches anyway after the timeout, so a slow image never blocks it', () => {
    requestScheme('dark');
    reportLoaded('world', ['dark']);
    requestScheme('light');
    jest.advanceTimersByTime(THEME_READY_TIMEOUT_MS - 10);
    expect(shown()).toBe('dark');
    jest.advanceTimersByTime(20);
    expect(shown()).toBe('light');
  });

  it('handles rapid toggles: toggling back before the switch shows changes nothing', () => {
    requestScheme('dark');
    reportLoaded('world', ['dark']);
    requestScheme('light');
    requestScheme('dark');
    jest.advanceTimersByTime(THEME_READY_TIMEOUT_MS * 2);
    expect(shown()).toBe('dark');
    // …and a later switch still waits for its paintings.
    requestScheme('light');
    flush();
    expect(shown()).toBe('dark');
    reportLoaded('world', ['dark', 'light']);
    flush();
    expect(shown()).toBe('light');
  });

  it('knows when every painting has a scheme', () => {
    expect(allLoaded({}, 'light')).toBe(true);
    expect(allLoaded({ a: ['dark'], b: ['dark', 'light'] }, 'light')).toBe(false);
    expect(allLoaded({ a: ['light'], b: ['dark', 'light'] }, 'light')).toBe(true);
  });
});
