import { router, type Href } from 'expo-router';
import { destinationKey, navGuard } from './navGuard';

/**
 * `router.push`, safe against a double tap: a second push to the same screen while the first is still opening is
 * ignored (lib/navGuard.ts). Navigation itself is unchanged: the same push, at once, with the same transition.
 */
export function pushOnce(href: Href): void {
  navGuard.run(destinationKey(href as Parameters<typeof destinationKey>[0]), () => router.push(href));
}

/** For the root stack's `screenListeners`: the lifecycle that tells the guard a navigation has settled. */
export const navGuardListeners = {
  focus: () => navGuard.focused(),
  transitionEnd: () => navGuard.transitionEnded(),
};
