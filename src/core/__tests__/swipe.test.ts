import { describe, expect, it } from '@jest/globals';
import {
  dragOffset,
  FLICK_MIN,
  FLICK_SPEED,
  RESIST_FROM,
  swipeOutcome,
  SWIPE_THRESHOLD,
  thresholdTick,
  touchIntent,
} from '../swipe';

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

describe('a change of mind', () => {
  it('cancels a release while the finger is quickly heading back, even past the threshold', () => {
    const far = W * SWIPE_THRESHOLD + 20;
    expect(swipeOutcome(far, 0, W, false)).toBe('toggle');
    expect(swipeOutcome(far, -FLICK_SPEED, W, false)).toBe('cancel');
    // Slowly easing back past the threshold still counts.
    expect(swipeOutcome(far, -FLICK_SPEED / 3, W, false)).toBe('toggle');
    // Mirrored for undo.
    expect(swipeOutcome(-far, FLICK_SPEED, W, true)).toBe('cancel');
    expect(swipeOutcome(-far, 0, W, true)).toBe('toggle');
  });
});

describe('how the card follows the finger', () => {
  const reach = W * SWIPE_THRESHOLD;

  it('follows 1:1, then eases off near the threshold without a kink', () => {
    expect(dragOffset(0, reach)).toBe(0);
    expect(dragOffset(40, reach)).toBe(40);
    const knee = reach * RESIST_FROM;
    expect(dragOffset(knee, reach)).toBeCloseTo(knee);
    // Just past the knee it still moves almost 1:1 (a smooth start), at the threshold it trails a little.
    expect(dragOffset(knee + 1, reach) - dragOffset(knee, reach)).toBeGreaterThan(0.95);
    expect(dragOffset(reach, reach)).toBeGreaterThan(reach * 0.9);
    expect(dragOffset(reach, reach)).toBeLessThan(reach);
  });

  it('always moves with the finger, never past its limit', () => {
    let prev = 0;
    for (let d = 1; d <= 2000; d += 7) {
      const x = dragOffset(d, reach);
      expect(x).toBeGreaterThan(prev);
      expect(x).toBeLessThan(reach * 1.4);
      prev = x;
    }
  });

  it('gives only a little the wrong way', () => {
    expect(dragOffset(-10, reach)).toBeLessThan(0);
    expect(dragOffset(-10, reach)).toBeGreaterThan(-2);
    expect(dragOffset(-1000, reach)).toBeGreaterThan(-20);
  });
});

describe('the threshold haptic', () => {
  const reach = W * SWIPE_THRESHOLD;
  const run = (path: number[]) => {
    let ticked = false;
    let plays = 0;
    for (const d of path) {
      const r = thresholdTick(ticked, d, reach);
      ticked = r.ticked;
      if (r.play) plays++;
    }
    return plays;
  };

  it('plays once, the first time the finger reaches the threshold', () => {
    expect(run([10, 60, reach - 1, reach, reach + 40])).toBe(1);
  });

  it('never repeats while dragging back and forth across it', () => {
    expect(run([reach + 5, reach - 30, reach + 5, 20, reach + 60, reach - 1, reach + 1])).toBe(1);
  });

  it('never plays for a swipe that stays short (or goes the wrong way)', () => {
    expect(run([10, 50, reach - 1, 30, -80])).toBe(0);
  });
});
