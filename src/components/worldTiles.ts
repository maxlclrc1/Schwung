import type { ImageSourcePropType } from 'react-native';

/*
 * The continuous world panorama as shipped: three tiles per theme, cut from design/canvas/panorama-<theme>-v2.jpg
 * (4096 x 3584 here), each placed at its x in panorama px. Used by the world behind the tabs, and for the habit
 * cards' temporary scenes.
 */
export type Theme = 'light' | 'dark';
export type TileName = 'habits' | 'journey' | 'fieldnotes';
export type Tile = { x: number; width: number; source: ImageSourcePropType };

export const TILE_HEIGHT = 3584;

export const TILES: Record<Theme, Record<TileName, Tile>> = {
  dark: {
    habits: { x: 0, width: 1296, source: require('../../assets/world/pano-dark-habits.webp') },
    journey: { x: 1264, width: 1568, source: require('../../assets/world/pano-dark-journey.webp') },
    fieldnotes: { x: 2800, width: 1296, source: require('../../assets/world/pano-dark-fieldnotes.webp') },
  },
  light: {
    habits: { x: 0, width: 1296, source: require('../../assets/world/pano-light-habits.webp') },
    journey: { x: 1264, width: 1568, source: require('../../assets/world/pano-light-journey.webp') },
    fieldnotes: { x: 2800, width: 1296, source: require('../../assets/world/pano-light-fieldnotes.webp') },
  },
};

/** The panorama row at the top of the lakeside band (Insights' camp and lake; the Journey painting's is row 800). */
export const LAKESIDE_BAND_TOP = 1300;
