import type { ImageSourcePropType } from 'react-native';

/*
 * The collectibles' illustrations, by collectible id (core/reset/collection.ts), once they exist:
 * assets/collectibles/<id>-<dark|light>.png, 1024 × 1024, transparent background (assets/collectibles/README.md).
 * A require of a missing file would break the build, so each pair is listed only when its files are in, e.g.:
 *   compass: {
 *     dark: require('../../../assets/collectibles/compass-dark.png'),
 *     light: require('../../../assets/collectibles/compass-light.png'),
 *   },
 * Until then the collection draws the collectible's vector placeholder (Collectible.tsx).
 */
export const COLLECTIBLE_ART: Partial<Record<string, { dark: ImageSourcePropType; light: ImageSourcePropType }>> = {};
