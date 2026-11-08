import type { ImageRequireSource } from 'react-native';

/*
 * The weekly discoveries' paintings (core/journeyDiscoveries.ts), by id: one watercolour per scene, used in both
 * themes (assets/discoveries/<id>.webp, transparent background, trimmed to the painting).
 */
export const DISCOVERY_ART: Record<string, ImageRequireSource> = {
  gentians: require('../../../assets/discoveries/gentians.webp'),
  cairn: require('../../../assets/discoveries/cairn.webp'),
  signpost: require('../../../assets/discoveries/signpost.webp'),
  streamlet: require('../../../assets/discoveries/streamlet.webp'),
  footbridge: require('../../../assets/discoveries/footbridge.webp'),
  lantern: require('../../../assets/discoveries/lantern.webp'),
  ice_axe: require('../../../assets/discoveries/ice_axe.webp'),
  pine: require('../../../assets/discoveries/pine.webp'),
  rope: require('../../../assets/discoveries/rope.webp'),
  pennant: require('../../../assets/discoveries/pennant.webp'),
};
