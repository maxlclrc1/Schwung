import { Image as ArtImage } from 'expo-image';
import { Image, type ImageSourcePropType } from 'react-native';
import type { PilotProgram } from '../core/reset/pilot';
import { COLLECTIBLE_ART } from './collection/art';
import { habitScene } from './habitArt';
import { WORLD_ART } from './World';

/*
 * Warms the shared decoded cache (ThemedImage's ART_IMAGE) at launch with the artwork a person is about to see, so
 * it's on screen the moment a screen first appears, not a decode later. A few at a time, off the main thread
 * (expo-image's prefetcher), and only what this person uses: their own habits' scenes and the world painting
 * first, then the collection's objects. The panorama tiles need nothing here: the world behind the tabs mounts
 * them at launch, and every card cropping a tile then draws from the same cached bitmap.
 */

function uri(source: ImageSourcePropType | undefined): string | undefined {
  if (source === undefined || typeof Image.resolveAssetSource !== 'function') return undefined;
  return Image.resolveAssetSource(source)?.uri;
}

const uris = (sources: (ImageSourcePropType | undefined)[]) => sources.map(uri).filter((u): u is string => !!u);

export async function prefetchArt(program: PilotProgram | null): Promise<void> {
  try {
    const scenes = (program?.habits ?? []).flatMap((id) => [habitScene(id, 'dark'), habitScene(id, 'light')]);
    const essentials = uris([...scenes, WORLD_ART.dark, WORLD_ART.light]);
    if (essentials.length) await ArtImage.prefetch(essentials, 'memory-disk');
    if (program) await ArtImage.prefetch(uris(Object.values(COLLECTIBLE_ART)), 'memory-disk');
  } catch {
    // Only a head start: anything not prefetched simply loads when it's shown.
  }
}
