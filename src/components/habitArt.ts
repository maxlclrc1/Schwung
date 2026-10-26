import type { ImageSourcePropType } from 'react-native';

/*
 * Habit illustrations, by stable habit id (the same id in V1 and V2 plans; never matched by display name).
 * Spec: SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md — 384 × 384 px, transparent, one image for both themes, subject in the
 * central 70%, shown at about 104 × 104 pt on the right of the card (cropped from the sides when a card grows
 * taller with larger text).
 *
 * The three pilot illustrations go in assets/habits/ as:
 *   mind_read.webp       (Read)
 *   focus_deepwork.webp  (Focused work)
 *   move_walk.webp       (Walk)
 * and are listed here once they exist (a require of a missing file would break the build):
 *   mind_read: require('../../assets/habits/mind_read.webp'),
 * Habits without an entry show their icon instead; custom habits never have an illustration.
 */
const HABIT_ART: Readonly<Record<string, ImageSourcePropType>> = {};

export function habitArt(habitId: string): ImageSourcePropType | undefined {
  return HABIT_ART[habitId];
}
