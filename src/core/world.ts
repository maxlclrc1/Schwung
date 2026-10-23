import { ASCENT_ASPECT } from './ascent';

/*
 * The full-screen world: assets/world-*.jpg are the Ascent painting with sky above and the descent below it
 * (slopes, treeline, forest), fading into the app background (design/canvas/assemble_canvas.py).
 * The painting itself (where the trail is drawn) sits untouched at a fixed place inside the tall image,
 * so lining the trail up with it is just a matter of scale.
 */
export const WORLD = {
  /** Source image size in px. */
  width: 1536,
  height: 2816,
  /** Where the 3:2 painting starts inside the tall image, in px. */
  paintingTop: 800,
} as const;

/** On Today the world moves at this fraction of the page's scroll speed, revealing the slopes below. */
export const PARALLAX = 0.4;

export type WorldFrame = {
  /** The tall image's top edge, relative to whatever `zoneTop` is measured from (usually the screen). */
  imageTop: number;
  imageHeight: number;
  /** The painting (trail) area: same left edge and width as the image, starting at `zoneTop`. */
  zoneHeight: number;
};

/** Places the world so its painting starts exactly at `zoneTop`, spanning `width`. */
export function worldFrame(width: number, zoneTop: number): WorldFrame {
  const scale = width / WORLD.width;
  return {
    imageTop: zoneTop - WORLD.paintingTop * scale,
    imageHeight: WORLD.height * scale,
    zoneHeight: width / ASCENT_ASPECT,
  };
}

/**
 * Today's trail moves with the world, slower than the page. A tap lands on the page's placeholder, which has
 * moved `scrollY` while the trail moved `scrollY * PARALLAX`, so the difference is shifted back out.
 */
export function trailPoint(tap: { x: number; y: number }, scrollY: number): { x: number; y: number } {
  return { x: tap.x, y: tap.y - scrollY * (1 - PARALLAX) };
}
