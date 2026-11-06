import type { ImageRequireSource } from 'react-native';
import type { Theme, TileName } from './worldTiles';

/*
 * The full-card scene behind each habit card, by stable habit id (never matched by
 * display name). Spec: SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md — 1290 × 800 px per theme, opaque, painted in the
 * Schwung world's language, the subject in the top 40% and the lower 40% kept calm for the title, target and track.
 *
 * Final art goes in assets/habits/<id>-<theme>.webp and is listed here once the files exist (a require of a
 * missing file would break the build), for example:
 *   mind_read: { light: require('../../assets/habits/mind_read-light.webp'),
 *                dark: require('../../assets/habits/mind_read-dark.webp') },
 */
const HABIT_SCENES: Readonly<Record<string, Record<Theme, ImageRequireSource>>> = {
  // Pilots, from design/artwork-candidates/scene-<id>-<theme>-v1.png (1536 × 1024, trimmed from the bottom to the
  // card's 1.61 : 1 and scaled to 1290 × 800).
  mind_read: {
    light: require('../../assets/habits/mind_read-light.webp'),
    dark: require('../../assets/habits/mind_read-dark.webp'),
  },
  move_walk: {
    light: require('../../assets/habits/move_walk-light.webp'),
    dark: require('../../assets/habits/move_walk-dark.webp'),
  },
  // The Life Reset's other habits, from design/artwork-candidates/scene-<id>-<theme>-v1.png (same conversion).
  sleep_wake: {
    light: require('../../assets/habits/sleep_wake-light.webp'),
    dark: require('../../assets/habits/sleep_wake-dark.webp'),
  },
  focus_top3: {
    light: require('../../assets/habits/focus_top3-light.webp'),
    dark: require('../../assets/habits/focus_top3-dark.webp'),
  },
  screen_app_limit: {
    light: require('../../assets/habits/screen_app_limit-light.webp'),
    dark: require('../../assets/habits/screen_app_limit-dark.webp'),
  },
  strength_log: {
    light: require('../../assets/habits/strength_log-light.webp'),
    dark: require('../../assets/habits/strength_log-dark.webp'),
  },
  skill_practice: {
    light: require('../../assets/habits/skill_practice-light.webp'),
    dark: require('../../assets/habits/skill_practice-dark.webp'),
  },
  // The catalog refinement's three, from scene-<id>-<theme>-v1.png: a 1400 × 868 window from y 110 (the subjects sit
  // low in these masters) scaled to 1290 × 800; dark deepened toward the set's indigo, light given the mist grade.
  mind_meditation: {
    light: require('../../assets/habits/mind_meditation-light.webp'),
    dark: require('../../assets/habits/mind_meditation-dark.webp'),
  },
  eat_well: {
    light: require('../../assets/habits/eat_well-light.webp'),
    dark: require('../../assets/habits/eat_well-dark.webp'),
  },
  outdoor_time: {
    light: require('../../assets/habits/outdoor_time-light.webp'),
    dark: require('../../assets/habits/outdoor_time-dark.webp'),
  },
  social_reach_out: {
    light: require('../../assets/habits/social_reach_out-light.webp'),
    dark: require('../../assets/habits/social_reach_out-dark.webp'),
  },
};

/** The final scene for a habit in a theme, once it has one. */
export function habitScene(habitId: string, theme: Theme): ImageRequireSource | undefined {
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

/** How many parts of the panorama a card can show. */
export const CROP_COUNT = CROPS.length;

/** One of the views, by number (a habit of the person's own keeps the one it was given). */
export const cropAt = (i: number): WorldCrop => CROPS[((i % CROPS.length) + CROPS.length) % CROPS.length];

export function placeholderCrop(habitId: string): WorldCrop {
  let h = 0;
  for (let i = 0; i < habitId.length; i++) h = (h * 31 + habitId.charCodeAt(i)) >>> 0;
  return CROPS[h % CROPS.length];
}
