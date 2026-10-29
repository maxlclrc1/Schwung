import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme, type Colors } from '../../theme';
import { COLLECTIBLE_ART } from './art';

type Icon = ComponentProps<typeof Ionicons>['name'];

/** Each object's placeholder: a simple vector glyph on a soft disc in its own tint, until its art is in. */
const PLACEHOLDER: Record<string, { icon: Icon; tint: (c: Colors) => [string, string] }> = {
  compass: { icon: 'compass-outline', tint: (c) => [c.mistSoft, c.mistInk] },
  edelweiss: { icon: 'flower-outline', tint: (c) => [c.sageSoft, c.sageInk] },
  trail_journal: { icon: 'book-outline', tint: (c) => [c.peachSoft, c.peachInk] },
  mountain_lantern: { icon: 'flame-outline', tint: (c) => [c.peachSoft, c.peachInk] },
  climbing_rope: { icon: 'infinite-outline', tint: (c) => [c.indigoSoft, c.indigoInk] },
  walking_staff: { icon: 'trail-sign-outline', tint: (c) => [c.sageSoft, c.sageInk] },
  summit_pennant: { icon: 'flag-outline', tint: (c) => [c.accentSoft, c.accentInk] },
};

/**
 * A collectible, drawn at `size`: its painting (one, for both themes) once listed in art.ts (a locked one as a quiet silhouette of
 * the same art), or its vector placeholder (locked: a faint outline). Decorative; the screen names it.
 */
export function CollectibleArt({ id, size, locked }: { id: string; size: number; locked: boolean }) {
  const { c } = useTheme();
  const art = COLLECTIBLE_ART[id];
  if (art)
    return (
      <Image
        source={art}
        style={{ width: size, height: size, opacity: locked ? 0.5 : 1 }}
        tintColor={locked ? c.border : undefined}
        resizeMode="contain"
        accessible={false}
      />
    );
  const p = PLACEHOLDER[id] ?? { icon: 'sparkles-outline' as Icon, tint: (k: Colors) => [k.accentSoft, k.accentInk] };
  const [soft, ink] = p.tint(c);
  return (
    <View
      accessible={false}
      style={[
        styles.disc,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: locked ? 'transparent' : soft,
          borderColor: locked ? c.border : 'transparent',
        },
      ]}
    >
      <Ionicons name={p.icon} size={size * 0.46} color={locked ? c.border : ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  disc: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
});
