import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { haptic } from '../../lib/haptics';
import { useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Button, T } from '../ui';

/**
 * On a previous (V1/V2) program's Habits screen, development and internal builds: the clearly labelled way to start
 * the Life Reset, or to switch to one already saved. Nothing changes until it's pressed; "Not now" puts it away
 * (Settings → Your program keeps the same choice).
 */
export function LifeResetInvite() {
  const { c } = useTheme();
  const saved = useResetPilot((s) => s.program !== null);
  const hidden = useResetPilot((s) => !!s.inviteHidden);
  if (hidden) return null;
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface, borderColor: c.accentInk }]}>
      <T v="overline" color={c.accentInk}>
        The 66-day Life Reset
      </T>
      <T v="bodyStrong">{saved ? 'Your Life Reset is saved' : 'Start the Life Reset'}</T>
      <T v="caption" color={c.textDim}>
        {saved
          ? 'Switch to it any time. This program stays saved, with all its history, and you can come back to it in Settings.'
          : 'A few habits you choose, growing with you over 66 days. This program stays saved, with all its history, and you can switch back to it in Settings.'}
      </T>
      <View style={styles.actions}>
        <Button
          label={saved ? 'Switch to my Life Reset' : 'Start Life Reset'}
          style={{ flex: 1 }}
          onPress={() => {
            haptic.tap();
            if (saved) {
              useResetPilot.getState().setActive(true);
              router.replace('/today');
            } else router.push('/life-reset/setup');
          }}
        />
        <Button
          label="Not now"
          kind="ghost"
          onPress={() => {
            haptic.tap();
            useResetPilot.getState().hideInvite();
          }}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.lg, gap: space.sm },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
});
