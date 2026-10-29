import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { requireOptionalNativeModule } from 'expo';
import { useState } from 'react';
import { hapticsDiagnostic } from '../../modules/schwung-haptics-diagnostic';
import { Pressable, StyleSheet, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { T } from './ui';

/*
 * Development builds only (Settings, under __DEV__): where the app is running (Expo Go or a development build),
 * whether each native module is compiled in, and side-by-side haptics: UIKit directly (our own diagnostic module,
 * modules/schwung-haptics-diagnostic, independent of expo-haptics), Core Haptics (which reports its own errors),
 * expo-haptics directly, and lib/haptics. Also what on the device could be silencing them. Not in release builds.
 */

const NATIVE: { label: string; run: () => Promise<void> }[] = [
  { label: 'Selection', run: () => Haptics.selectionAsync() },
  { label: 'Light', run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) },
  { label: 'Medium', run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium) },
  { label: 'Heavy', run: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy) },
  { label: 'Success', run: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) },
];
const SHARED: { label: string; run: () => void }[] = [
  { label: 'select', run: haptic.select },
  { label: 'complete', run: haptic.complete },
  { label: 'confirm', run: haptic.confirm },
  { label: 'undo', run: haptic.undo },
  { label: 'success', run: haptic.success },
  { label: 'warning', run: haptic.warning },
];

export function HapticTest() {
  const { c } = useTheme();
  const [result, setResult] = useState('—');
  const present = requireOptionalNativeModule('ExpoHaptics') !== null;
  const goClient = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [env, setEnv] = useState<string | null>(null);
  const diag = async (label: string, run: () => Promise<unknown>) => {
    try {
      const r = await run();
      console.log(`[haptics] ${label}:`, r);
      setResult(`${label}: ${JSON.stringify(r)}`);
    } catch (e) {
      console.warn(`[haptics] ${label} failed:`, e);
      setResult(`${label}: failed (${String(e)})`);
    }
  };
  const native = async (label: string, run: () => Promise<void>) => {
    try {
      await run();
      setResult(`${label}: called (no error)`);
    } catch (e) {
      console.warn(`[haptics] direct ${label} failed:`, e);
      setResult(`${label}: failed (${String(e)})`);
    }
  };
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        Haptic check (development)
      </T>
      <View style={[styles.panel, { backgroundColor: c.surface }]}>
        <T v="caption" style={{ fontWeight: '700' }}>
          Running in: {goClient ? 'Expo Go' : `a ${Constants.executionEnvironment} build`}
        </T>
        <T v="caption" color={hapticsDiagnostic ? c.sageInk : c.danger} style={{ fontWeight: '700' }}>
          {hapticsDiagnostic
            ? 'Native UIKit diagnostic: in this build'
            : goClient
              ? 'Native UIKit diagnostic: unavailable in Expo Go (needs a development build: npx expo run:ios --device)'
              : 'Native UIKit diagnostic: not in this build (rebuild: npx expo run:ios --device)'}
        </T>
        {hapticsDiagnostic ? (
          <>
            <T v="caption" color={c.textDim}>
              UIKit directly (independent of expo-haptics)
            </T>
            <View style={styles.row}>
              <Btn
                label="Native Heavy"
                onPress={() => void diag('Native Heavy', () => hapticsDiagnostic!.nativeHeavy())}
              />
              <Btn
                label="Core Haptics Heavy"
                onPress={() => void diag('Core Haptics', () => hapticsDiagnostic!.coreHapticsHeavy())}
              />
              <Btn
                label="Environment"
                onPress={() =>
                  void hapticsDiagnostic!
                    .environment()
                    .then((e) => {
                      console.log('[haptics] environment:', e);
                      setEnv(
                        Object.entries(e)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join('\n'),
                      );
                    })
                    .catch((e: unknown) => setEnv(`failed: ${String(e)}`))
                }
              />
            </View>
            {env ? (
              <T v="caption" color={c.textDim} selectable>
                {env}
              </T>
            ) : null}
          </>
        ) : null}
        <T v="caption" color={present ? c.sageInk : c.danger} style={{ fontWeight: '700' }}>
          {present
            ? 'ExpoHaptics native module: in this build'
            : 'ExpoHaptics native module: missing (rebuild the app)'}
        </T>
        <T v="caption" color={c.textDim}>
          Direct, native expo-haptics
        </T>
        <View style={styles.row}>
          {NATIVE.map((b) => (
            <Btn key={b.label} label={b.label} onPress={() => void native(b.label, b.run)} />
          ))}
        </View>
        <T v="caption" color={c.textDim}>
          Through lib/haptics (the app’s own)
        </T>
        <View style={styles.row}>
          {SHARED.map((b) => (
            <Btn
              key={b.label}
              label={b.label}
              onPress={() => {
                b.run();
                setResult(`haptic.${b.label}()`);
              }}
            />
          ))}
        </View>
        <T v="caption" color={c.textFaint}>
          Last: {result}
        </T>
      </View>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View style={[styles.btn, { backgroundColor: c.surfaceHigh, opacity: pressed ? 0.6 : 1 }]}>
          <T v="caption" style={{ fontWeight: '700' }}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  btn: { minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
});
