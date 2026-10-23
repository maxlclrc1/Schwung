import { describe, expect, it } from '@jest/globals';
import { ASCENT_ASPECT, DAY_POINTS, nearestDay } from '../ascent';
import { PARALLAX, trailPoint, WORLD, worldFrame } from '../world';

describe('world placement', () => {
  it('puts the painting exactly where the trail is drawn, on every phone width', () => {
    for (const width of [320, 375, 393, 402, 430, 440]) {
      for (const zoneTop of [28, 96, 140]) {
        const f = worldFrame(width, zoneTop);
        const scale = width / WORLD.width;
        // The painting inside the image: WORLD.paintingTop .. +width/1.5 (the 3:2 art at full width).
        expect(f.imageTop + WORLD.paintingTop * scale).toBeCloseTo(zoneTop, 6);
        expect(f.zoneHeight).toBeCloseTo(width / ASCENT_ASPECT, 6);
        expect((WORLD.width / ASCENT_ASPECT) * scale).toBeCloseTo(f.zoneHeight, 6);
        // The image always covers the top of the screen at these header heights.
        expect(f.imageTop).toBeLessThanOrEqual(0);
        expect(f.imageTop + f.imageHeight).toBeGreaterThan(zoneTop + f.zoneHeight);
      }
    }
  });

  it('the source image leaves room for the painting plus sky above and fog below', () => {
    expect(WORLD.paintingTop + WORLD.width / ASCENT_ASPECT).toBeLessThan(WORLD.height);
  });
});

describe('tapping the trail while the page is scrolled (parallax)', () => {
  it('maps a tap on the scrolled placeholder back to the day under the finger', () => {
    const width = 393;
    const height = width / ASCENT_ASPECT;
    for (const scrollY of [0, 40, 120]) {
      for (const day of [1, 7, 21, 30, 44, 66]) {
        const p = DAY_POINTS[day - 1];
        // The page (and the placeholder) moved up scrollY; the trail only PARALLAX * scrollY.
        // So the finger on the marker lands (1 - PARALLAX) * scrollY lower in the placeholder.
        const tap = { x: p.x * width, y: p.y * height + scrollY * (1 - PARALLAX) };
        expect(nearestDay(trailPoint(tap, scrollY), width, height, 16)).toBe(day);
      }
    }
  });

  it('without the correction, a scrolled tap would pick the wrong day', () => {
    const width = 393;
    const height = width / ASCENT_ASPECT;
    const p = DAY_POINTS[29];
    expect(nearestDay({ x: p.x * width, y: p.y * height + 120 * (1 - PARALLAX) }, width, height, 16)).not.toBe(30);
  });
});

describe('parallax', () => {
  it('moves the world slower than the page, so scrolling reveals what lies below', () => {
    expect(PARALLAX).toBeGreaterThan(0);
    expect(PARALLAX).toBeLessThan(1);
  });
});
