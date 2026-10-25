import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatTime } from '../core/dates';
import type { TimeAnswers } from '../core/v2/program';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { TimePicker } from './TimePicker';
import { Button, T } from './ui';

/**
 * The wake-up (W1) or bedtime (W2) question with the native time picker: the same question in onboarding and when
 * a habit added later needs it. Answers come back as `TimeAnswers`; the caller decides what to do with them.
 */
export function TimeQuestion({
  question,
  onAnswer,
  why = 'Your plan uses it to set targets around your own day.',
}: {
  question: 'wake' | 'bed';
  onAnswer: (a: TimeAnswers) => void;
  why?: string;
}) {
  const { c } = useTheme();
  const wake = question === 'wake';
  const [time, setTime] = useState(wake ? '07:00' : '23:00');
  return (
    <View style={styles.wrap}>
      <Animated.View key={question} entering={FadeInDown.duration(400)} style={{ gap: space.md }}>
        <ThemedView style={[styles.icon, { backgroundColor: c.accentSoft }]}>
          <Ionicons name={wake ? 'alarm' : 'bed'} size={26} color={c.accentInk} />
        </ThemedView>
        <T v="overline" color={c.textDim}>
          One more thing
        </T>
        <T v="title" accessibilityRole="header">
          {wake
            ? 'What time do you usually get up on school or work days?'
            : 'What time do you usually get into bed on those nights?'}
        </T>
        <T color={c.textDim}>{why}</T>
      </Animated.View>
      <View style={styles.picker}>
        <TimePicker value={time} onChange={setTime} />
      </View>
      <View style={{ gap: space.sm }}>
        <Button
          label={`${wake ? 'Usually up at' : 'Usually in bed by'} ${formatTime(time)}`}
          onPress={() => onAnswer(wake ? { wake: { kind: 'time', time } } : { inBed: time })}
        />
        {wake ? (
          <>
            <Button label="It changes a lot" kind="secondary" onPress={() => onAnswer({ wake: { kind: 'varies' } })} />
            <Button
              label="I work shifts or nights"
              kind="ghost"
              onPress={() => onAnswer({ wake: { kind: 'shift' } })}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: space.xl, justifyContent: 'space-between' },
  icon: { width: 52, height: 52, borderRadius: radius.md + 4, alignItems: 'center', justifyContent: 'center' },
  picker: { alignItems: 'center' },
});
