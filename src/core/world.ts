import { ASCENT_ASPECT } from './ascent';

/*
 * The full-screen world: assets/world-*.jpg are the Ascent painting with sky added above and fog below.
 * The painting itself (where the trail is drawn) sits untouched at a fixed place inside the tall image,
 * so lining the trail up with it is just a matter of scale.
 */
export const WORLD = {
  /** Source image size in px (see design/artwork-guides/tools/extend_tall.py). */
  width: 1536,
  height: 2560,
  /** Where the 3:2 painting starts inside the tall image, in px. */
  paintingTop: 800,
} as const;

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
 * Today's trail stays still while the page scrolls over it. A tap lands on the scrolling placeholder, so
 * its position there is shifted back by the scroll distance to find the point on the trail.
 */
export function trailPoint(tap: { x: number; y: number }, scrollY: number): { x: number; y: number } {
  return { x: tap.x, y: tap.y - scrollY };
}
