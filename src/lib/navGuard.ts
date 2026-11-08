/*
 * Stops a quick double tap from opening the same screen twice (docs/INTERACTION_AUDIT.md, finding A).
 *
 * A push marks its destination as "on the way". Until that navigation settles, another push to the same destination
 * is ignored; a push somewhere else always goes through. The first push is never delayed.
 *
 * It settles on the navigator's own lifecycle, reported by the root stack (app/_layout.tsx):
 * - `transitionEnd`: the new screen finished opening, or a screen finished closing;
 * - a second `focus` after the push: focus moved on (the new screen was dismissed, or something else opened).
 * A failed push releases at once. Last, in case no event ever comes (a push that changed nothing, or a platform that
 * reports no transitions, as on the web), a mark older than STALE_MS no longer blocks anything. That is only the
 * fallback, and it never delays a tap: it only decides whether a repeat counts as a duplicate.
 *
 * Plain module (no router imports) so the rules are unit-tested; lib/navigation.ts wires it to expo-router.
 */

/** Longer than any native sheet or stack transition; only matters if the navigator never reports one ending. */
export const STALE_MS = 1000;

type Pending = { target: string; since: number; arrived: boolean };

/** A destination as a stable string: the path plus its params in a fixed order. */
export function destinationKey(href: string | { pathname: string; params?: Record<string, unknown> }): string {
  if (typeof href === 'string') return href;
  const params = Object.entries(href.params ?? {})
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length > 0 ? `${href.pathname}?${params.join('&')}` : href.pathname;
}

export function createNavGuard(now: () => number = Date.now) {
  let pending: Pending | null = null;

  const blocks = (target: string) => pending !== null && pending.target === target && now() - pending.since < STALE_MS;

  return {
    /** Runs `navigate` unless the same destination is still on the way. Returns whether it navigated. */
    run(target: string, navigate: () => void): boolean {
      if (blocks(target)) return false;
      pending = { target, since: now(), arrived: false };
      try {
        navigate();
      } catch (error) {
        pending = null;
        throw error;
      }
      return true;
    },
    /** A screen of the root stack gained focus. */
    focused() {
      if (!pending) return;
      // The first focus after a push is the new screen arriving; any later one means navigation moved on.
      if (!pending.arrived) pending.arrived = true;
      else pending = null;
    },
    /** A screen of the root stack finished opening or closing. */
    transitionEnded() {
      pending = null;
    },
    /** Whether a destination is still on the way (for tests and diagnostics). */
    isPending(target?: string) {
      return target === undefined ? pending !== null && now() - pending.since < STALE_MS : blocks(target);
    },
    reset() {
      pending = null;
    },
  };
}

export type NavGuard = ReturnType<typeof createNavGuard>;

/** The app's one guard. */
export const navGuard = createNavGuard();
