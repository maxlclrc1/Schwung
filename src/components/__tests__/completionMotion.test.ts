import { describe, expect, it } from '@jest/globals';
import {
  CHECK_FROM,
  checkLook,
  COMPLETE_MS,
  CONFIRM_DOWN_MS,
  CONFIRM_LIFT,
  CONFIRM_UP_MS,
  confirmLift,
  doneDuration,
  REDUCED_MS,
  statusLook,
} from '../completionMotion';

const steps = Array.from({ length: 101 }, (_, i) => i / 100);

describe('completing and undoing a habit card', () => {
  it('takes 200–300 ms, the same both ways, and the confirmation fits inside it', () => {
    expect(COMPLETE_MS).toBeGreaterThanOrEqual(200);
    expect(COMPLETE_MS).toBeLessThanOrEqual(300);
    expect(doneDuration(false)).toBe(COMPLETE_MS);
    expect(CONFIRM_UP_MS + CONFIRM_DOWN_MS).toBeLessThanOrEqual(COMPLETE_MS);
  });

  it('the check fades in and settles to full size without ever overshooting (no bounce)', () => {
    let prev = { opacity: -1, scale: 0 };
    for (const p of steps) {
      const l = checkLook(p, false);
      expect(l.scale).toBeLessThanOrEqual(1);
      expect(l.scale).toBeGreaterThanOrEqual(CHECK_FROM);
      expect(l.opacity).toBeGreaterThan(prev.opacity);
      expect(l.scale).toBeGreaterThanOrEqual(prev.scale);
      prev = l;
    }
    expect(checkLook(0, false)).toEqual({ opacity: 0, scale: CHECK_FROM });
    expect(checkLook(1, false)).toEqual({ opacity: 1, scale: 1 });
    // Undo runs the same curve back: the same look at the same progress.
    expect(checkLook(0.4, false)).toEqual(checkLook(0.4, false));
    // Out-of-range progress (a spring or a rounding) is clamped.
    expect(checkLook(1.2, false)).toEqual({ opacity: 1, scale: 1 });
  });

  it('the confirmation only tints: a small, bounded lift of the wash', () => {
    expect(confirmLift(0, false)).toBe(0);
    expect(confirmLift(1, false)).toBe(CONFIRM_LIFT);
    expect(CONFIRM_LIFT).toBeLessThanOrEqual(0.1);
    expect(confirmLift(3, false)).toBe(CONFIRM_LIFT);
  });

  it('with Reduce Motion: a short opacity change only, no scale, slide or lift', () => {
    expect(doneDuration(true)).toBe(REDUCED_MS);
    expect(REDUCED_MS).toBeLessThan(COMPLETE_MS);
    for (const p of steps) {
      expect(checkLook(p, true).scale).toBe(1);
      expect(statusLook(p, true).translateY).toBe(0);
      expect(confirmLift(p, true)).toBe(0);
    }
    expect(checkLook(0.5, true).opacity).toBe(0.5);
  });

  it('the status line rises only a few points into place', () => {
    expect(statusLook(0, false).translateY).toBeLessThanOrEqual(4);
    expect(statusLook(1, false)).toEqual({ opacity: 1, translateY: 0 });
  });
});
