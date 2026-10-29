import type { ImageRequireSource } from 'react-native';

/*
 * The collectibles' illustrations, by collectible id (core/reset/collection.ts): one painting per object, used in
 * both themes (assets/collectibles/<id>-dark.webp, 1024 × 1024, transparent background). An object missing here
 * draws its vector placeholder instead (Collectible.tsx); a locked one is a silhouette of its painting.
 */
export const COLLECTIBLE_ART: Partial<Record<string, ImageRequireSource>> = {
  compass: require('../../../assets/collectibles/compass-dark.webp'),
  edelweiss: require('../../../assets/collectibles/edelweiss-dark.webp'),
  trail_journal: require('../../../assets/collectibles/trail_journal-dark.webp'),
  mountain_lantern: require('../../../assets/collectibles/mountain_lantern-dark.webp'),
  climbing_rope: require('../../../assets/collectibles/climbing_rope-dark.webp'),
  walking_staff: require('../../../assets/collectibles/walking_staff-dark.webp'),
  summit_pennant: require('../../../assets/collectibles/summit_pennant-dark.webp'),
};
