import { describe, expect, it, jest } from '@jest/globals';
import { createNavGuard, destinationKey, STALE_MS } from '../navGuard';

function setup() {
  let t = 0;
  const guard = createNavGuard(() => t);
  const stack: string[] = ['/'];
  const push = (to: string) => guard.run(to, () => stack.push(to));
  return {
    guard,
    stack,
    push,
    advance: (ms: number) => (t += ms),
    /** The native stack: the new screen gains focus at once, then its transition ends. */
    arrive: () => guard.focused(),
    settle: () => guard.transitionEnded(),
    back: () => {
      stack.pop();
      guard.focused();
      guard.transitionEnded();
    },
  };
}

describe('navigation guard', () => {
  it('opens a screen once for a double tap', () => {
    const s = setup();
    expect(s.push('/settings')).toBe(true);
    s.arrive();
    s.advance(120);
    expect(s.push('/settings')).toBe(false);
    expect(s.stack).toEqual(['/', '/settings']);
  });

  it('navigates at once on the first tap', () => {
    const s = setup();
    const navigate = jest.fn();
    s.guard.run('/privacy', navigate);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('lets a later tap navigate once the transition has ended', () => {
    const s = setup();
    s.push('/life-reset/collection');
    s.arrive();
    s.settle();
    expect(s.push('/life-reset/collection')).toBe(true);
  });

  it('does not block a different destination', () => {
    const s = setup();
    s.push('/legal?doc=wellness');
    expect(s.push('/legal?doc=terms')).toBe(true);
    expect(s.push('/life-reset/a')).toBe(true);
    expect(s.push('/life-reset/b')).toBe(true);
    expect(s.stack).toEqual(['/', '/legal?doc=wellness', '/legal?doc=terms', '/life-reset/a', '/life-reset/b']);
  });

  it('lets the screen open again after going back or dismissing', () => {
    const s = setup();
    s.push('/settings');
    s.arrive();
    s.settle();
    s.back();
    expect(s.push('/settings')).toBe(true);
    expect(s.stack).toEqual(['/', '/settings']);
  });

  it('releases when a sheet is dismissed before it finished opening', () => {
    const s = setup();
    s.push('/settings');
    s.arrive();
    // Swiped away mid-transition: focus returns to the screen below, no opening transitionEnd.
    s.stack.pop();
    s.guard.focused();
    expect(s.push('/settings')).toBe(true);
  });

  it('releases at once when navigation fails', () => {
    const s = setup();
    expect(() =>
      s.guard.run('/settings', () => {
        throw new Error('no navigator');
      }),
    ).toThrow('no navigator');
    expect(s.guard.isPending()).toBe(false);
    expect(s.push('/settings')).toBe(true);
  });

  it('never stays locked when no lifecycle event arrives', () => {
    const s = setup();
    s.push('/settings'); // a push that changed nothing: no focus, no transition
    s.advance(STALE_MS - 1);
    expect(s.push('/settings')).toBe(false);
    s.advance(1);
    expect(s.push('/settings')).toBe(true);
  });

  it('keys destinations by path and params, in any order', () => {
    expect(destinationKey('/settings')).toBe('/settings');
    expect(destinationKey({ pathname: '/legal', params: { doc: 'terms' } })).toBe('/legal?doc=terms');
    expect(destinationKey({ pathname: '/x', params: { b: 2, a: 'y z', c: undefined } })).toBe('/x?a=y%20z&b=2');
    expect(destinationKey({ pathname: '/legal' })).toBe('/legal');
  });
});
