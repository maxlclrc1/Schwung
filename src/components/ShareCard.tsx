import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '../lib/constants';
import { ceremonyColors as c } from '../theme';

export type FinaleStats = { daysCompleted: number; bestStreak: number; mastered: number; checks: number };

/**
 * The image people post. Laid out at 4:5 and captured at 1080×1350.
 * Always dark so it looks the same in every feed.
 */
export function ShareCard({
  stats,
  width,
  ref,
}: {
  stats: FinaleStats;
  width: number;
  ref?: Ref<ComponentRef<typeof View>>;
}) {
  const s = width / 360; // design at 360pt wide, scale to fit
  const items = [
    { n: stats.daysCompleted, label: 'days done' },
    { n: stats.bestStreak, label: 'best streak' },
    { n: stats.checks, label: 'check-offs' },
  ];
  return (
    // Rounded on screen, square in the exported image (the ref'd view has no radius).
    <View style={{ borderRadius: 24 * s, overflow: 'hidden' }}>
      <View ref={ref} collapsable={false} style={{ width, height: width * 1.25, backgroundColor: '#060606' }}>
        <LinearGradient
          colors={['#18210A', '#0A0B08', '#060606']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.glow,
            { width: 340 * s, height: 340 * s, borderRadius: 170 * s, top: -80 * s, right: -110 * s },
          ]}
        />
        <View style={{ flex: 1, padding: 28 * s, justifyContent: 'space-between' }}>
          <Text style={{ color: c.accent, fontSize: 13 * s, fontWeight: '800', letterSpacing: 2 * s }}>
            {APP_NAME.toUpperCase()}
          </Text>
          <View>
            <Text
              style={{
                color: c.accent,
                fontSize: 132 * s,
                lineHeight: 136 * s,
                fontWeight: '900',
                letterSpacing: -7 * s,
              }}
            >
              66
            </Text>
            <Text
              style={{ color: c.text, fontSize: 34 * s, lineHeight: 38 * s, fontWeight: '800', letterSpacing: -1 * s }}
            >
              I reset my life{'\n'}in 66 days.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 * s }}>
            {items.map((it) => (
              <View key={it.label} style={[styles.stat, { borderRadius: 14 * s, padding: 12 * s }]}>
                <Text style={{ color: c.text, fontSize: 26 * s, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
                  {it.n}
                </Text>
                <Text style={{ color: c.textDim, fontSize: 11 * s, fontWeight: '600' }}>{it.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: 'rgba(198,255,61,0.10)' },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
});
