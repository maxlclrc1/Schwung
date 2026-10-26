import { describe, expect, it } from '@jest/globals';
import { EDGE_RESISTANCE, PAGE_FLICK_MIN, PAGE_THRESHOLD, pageOffset, pageTarget } from '../pager';

const W = 390;

describe('swiping between tabs', () => {
  it('goes to the next tab on a swipe left, and back on a swipe right, once far enough', () => {
    expect(pageTarget(-W * PAGE_THRESHOLD, 0, W, 0, 3)).toBe(1);
    expect(pageTarget(-W * PAGE_THRESHOLD, 0, W, 1, 3)).toBe(2);
    expect(pageTarget(W * PAGE_THRESHOLD, 0, W, 2, 3)).toBe(1);
    expect(pageTarget(W * PAGE_THRESHOLD, 0, W, 1, 3)).toBe(0);
  });

  it('springs back from a partial swipe', () => {
    expect(pageTarget(-W * PAGE_THRESHOLD + 1, 0, W, 0, 3)).toBe(0);
    expect(pageTarget(40, 0.2, W, 1, 3)).toBe(1);
    expect(pageTarget(0, 0, W, 1, 3)).toBe(1);
  });

  it('goes on a quick flick from a shorter swipe, but not a tiny one', () => {
    expect(pageTarget(-W * PAGE_FLICK_MIN, -0.8, W, 0, 3)).toBe(1);
    expect(pageTarget(-W * PAGE_FLICK_MIN + 5, -2, W, 0, 3)).toBe(0);
  });

  it('cancels when the finger flicks back the other way at the end', () => {
    expect(pageTarget(-W * 0.6, 0.9, W, 0, 3)).toBe(0);
  });

  it('never goes past the first or last tab', () => {
    expect(pageTarget(W, 2, W, 0, 3)).toBe(0);
    expect(pageTarget(-W, -2, W, 2, 3)).toBe(2);
    // Without Field Notes, Journey is the last.
    expect(pageTarget(-W, -2, W, 1, 2)).toBe(1);
  });

  it('moves pages with the finger, and only a little past the ends', () => {
    expect(pageOffset(-100, 0, 3)).toBe(-100);
    expect(pageOffset(100, 1, 3)).toBe(100);
    expect(pageOffset(100, 0, 3)).toBeCloseTo(100 * EDGE_RESISTANCE);
    expect(pageOffset(-100, 2, 3)).toBeCloseTo(-100 * EDGE_RESISTANCE);
  });
});
