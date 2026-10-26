import { describe, expect, it } from '@jest/globals';
import { FLICK_MIN, swipeOutcome, SWIPE_THRESHOLD, touchIntent } from '../swipe';

const W = 343; // the card on a 375pt iPhone

describe('touch intent on a habit card', () => {
  it('stays undecided for small movements', () => {
    expect(touchIntent(0, 0)).toBe('undecided');
    expect(touchIntent(8, 3)).toBe('undecided');
    expect(touchIntent(-6, 9)).toBe('undecided');
  });

  it('reads a vertical or diagonal drag as the page scrolling', () => {
    expect(touchIntent(0, 10)).toBe('scroll');
    expect(touchIntent(2, -40)).toBe('scroll');
    expect(touchIntent(14, -14)).toBe('scroll'); // 45°
    expect(touchIntent(-18, 12)).toBe('scroll'); // ~34°: still not clearly sideways
  });

  it('reads only a clearly sideways drag as a swipe', () => {
    expect(touchIntent(12, 0)).toBe('swipe');
    expect(touchIntent(20, 9)).toBe('swipe'); // under ~27°
    expect(touchIntent(-30, 5)).toBe('swipe');
    // A sideways start that hasn't gone far enough waits.
    expect(touchIntent(11, 2)).toBe('undecided');
  });
});

describe('releasing a swipe', () => {
  it('completes past the threshold and springs back short of it', () => {
    expect(swipeOutcome(W * SWIPE_THRESHOLD, 0, W, false)).toBe('toggle');
    expect(swipeOutcome(W * SWIPE_THRESHOLD - 1, 0, W, false)).toBe('cancel');
    expect(swipeOutcome(30, 0, W, false)).toBe('cancel');
  });

  it('completes on a quick flick from a shorter drag, but not a tiny one', () => {
    expect(swipeOutcome(W * FLICK_MIN, 0.8, W, false)).toBe('toggle');
    expect(swipeOutcome(W * FLICK_MIN, 0.3, W, false)).toBe('cancel');
    expect(swipeOutcome(W * FLICK_MIN - 5, 2, W, false)).toBe('cancel');
  });

  it('never completes by swiping left, and undoes a done card only by swiping left', () => {
    expect(swipeOutcome(-W, -2, W, false)).toBe('cancel');
    expect(swipeOutcome(-W * SWIPE_THRESHOLD, 0, W, true)).toBe('toggle');
    expect(swipeOutcome(-W * FLICK_MIN, -0.8, W, true)).toBe('toggle');
    expect(swipeOutcome(W, 2, W, true)).toBe('cancel');
  });

  it('does not count a flick that is moving back the other way', () => {
    expect(swipeOutcome(W * 0.3, -1, W, false)).toBe('cancel');
  });
});
