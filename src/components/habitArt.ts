import type { ImageSourcePropType } from 'react-native';
import type { Theme, TileName } from './worldTiles';

/*
 * The full-card scene behind each habit card, by stable habit id (the same id in V1 and V2 plans; never matched by
 * display name). Spec: SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md — 1290 × 800 px per theme, opaque, painted in the
 * Schwung world's language, the subject in the top 40% and the lower 40% kept calm for the title, target and track.
 *
 * Final art goes in assets/habits/<id>-<theme>.webp and is listed here once the files exist (a require of a
 * missing file would break the build), for example:
 *   mind_read: { light: require('../../assets/habits/mind_read-light.webp'),
 *                dark: require('../../assets/habits/mind_read-dark.webp') },
 */
const HABIT_SCENES: Readonly<Record<string, Record<Theme, ImageSourcePropType>>> = {};

/** The final scene for a habit in a theme, once it has one. */
export function habitScene(habitId: string, theme: Theme): ImageSourcePropType | undefined {
  return HABIT_SCENES[habitId]?.[theme];
}

/**
 * Until a habit has its own scene: a window onto a part of the world panorama (the same tiles as the world behind
 * the tabs, so nothing extra is loaded), picked by the habit id so a habit keeps its scene. Temporary: these are
 * crops of the landscape, not pictures of the habit.
 */
export type WorldCrop = { tile: TileName; cx: number; cy: number; width: number };

const CROPS: WorldCrop[] = [
  { tile: 'journey', cx: 850, cy: 1000, width: 900 }, // the summit at first light
  { tile: 'fieldnotes', cx: 515, cy: 2140, width: 640 }, // the camp on the lakeshore
  { tile: 'habits', cx: 600, cy: 1150, width: 900 }, // the valley's misty ridges
  { tile: 'fieldnotes', cx: 760, cy: 1150, width: 900 }, // the upper lake
  { tile: 'journey', cx: 780, cy: 2050, width: 800 }, // the forest in mist
  { tile: 'fieldnotes', cx: 420, cy: 980, width: 700 }, // ridgelines and the glow
  { tile: 'habits', cx: 650, cy: 1950, width: 800 }, // slopes and pines
];

export function placeholderCrop(habitId: string): WorldCrop {
  let h = 0;
  for (let i = 0; i < habitId.length; i++) h = (h * 31 + habitId.charCodeAt(i)) >>> 0;
  return CROPS[h % CROPS.length];
}
