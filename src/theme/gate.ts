import { create } from 'zustand';
import type { Scheme } from './index';

/*
 * Theme switches that wait for their paintings. A toggle asks for a scheme; the app keeps showing
 * the current one while every themed painting on screen (the world tiles, the habit cards' scenes; see ThemedImage)
 * loads and decodes the incoming one, hidden. Once all of them have it (or after THEME_READY_TIMEOUT_MS, so a slow
 * image never blocks the switch) the new scheme is shown, and the UI colours and the paintings fade together.
 */

/** The longest a switch waits for a painting that is still loading (both themes are normally decoded already). */
export const THEME_READY_TIMEOUT_MS = 300;

type Loaded = Record<string, readonly Scheme[]>;
type Gate = {
  /** The scheme on screen (null until the first request). */
  shown: Scheme | null;
  /** The scheme asked for; the paintings load it while it differs from `shown`. */
  target: Scheme | null;
  /** Per mounted painting: the schemes it has loaded and holds. */
  loaded: Loaded;
};

export const useThemeGate = create<Gate>(() => ({ shown: null, target: null, loaded: {} }));

/** Whether every mounted painting has the scheme loaded (true when there are none). */
export function allLoaded(loaded: Loaded, scheme: Scheme): boolean {
  return Object.values(loaded).every((l) => l.includes(scheme));
}

let timeout: ReturnType<typeof setTimeout> | undefined;
let frame: ReturnType<typeof requestAnimationFrame> | undefined;

function show() {
  clearTimeout(timeout);
  timeout = undefined;
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  const { shown, target } = useThemeGate.getState();
  if (target && target !== shown) useThemeGate.setState({ shown: target });
}

function check() {
  const { shown, target, loaded } = useThemeGate.getState();
  if (!target || target === shown || !allLoaded(loaded, target) || frame !== undefined) return;
  // One more frame, so the last painting to load is on screen (still hidden) before the fade starts.
  frame = requestAnimationFrame(show);
}

/** Asks for a scheme. The first request shows it at once (app start); later ones wait for the paintings. */
export function requestScheme(scheme: Scheme) {
  const { shown } = useThemeGate.getState();
  if (shown === null) {
    useThemeGate.setState({ shown: scheme, target: scheme });
    return;
  }
  useThemeGate.setState({ target: scheme });
  clearTimeout(timeout);
  timeout = undefined;
  if (frame !== undefined) cancelAnimationFrame(frame);
  frame = undefined;
  // Toggled back before the switch showed: nothing changes on screen.
  if (scheme === shown) return;
  timeout = setTimeout(show, THEME_READY_TIMEOUT_MS);
  check();
}

/** A painting reports the schemes it has loaded (and still holds). */
export function reportLoaded(key: string, schemes: readonly Scheme[]) {
  useThemeGate.setState((s) => ({ loaded: { ...s.loaded, [key]: schemes } }));
  check();
}

/** A painting left the screen: the switch no longer waits for it. */
export function forgetPainting(key: string) {
  useThemeGate.setState((s) => {
    const loaded = { ...s.loaded };
    delete loaded[key];
    return { loaded };
  });
  check();
}
