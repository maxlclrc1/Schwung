import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DayStrip } from '../../components/FieldNotes';
import { SheetHeader } from '../../components/SheetHeader';
import { Button, Screen, T } from '../../components/ui';
import { dateForDay } from '../../core/dates';
import { GOALS, OBSERVATION } from '../../core/fieldnotes/catalog';
import { CAVEAT, PATTERN_HEADING, summarize } from '../../core/fieldnotes/insights';
import { FN_DAYS } from '../../core/fieldnotes/journey';
import type { FieldNote } from '../../core/fieldnotes/types';
import { haptic } from '../../lib/haptics';
import { rescheduleReminders } from '../../lib/notifications';
import { fieldNotesAvailable, fnToday, useFieldNotes } from '../../store/fieldNotes';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

const CHOICE: Record<FieldNote['decision'], string> = {
  keep: 'Keep it',
  easier: 'Make it easier',
  different: 'Try something different',
};

/** The personal field note: development and internal-testing builds only. */
export default function FieldNoteScreen() {
  if (!(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') || !fieldNotesAvailable()) {
    return <Redirect href="/" />;
  }
  return <Note />;
}

const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function Note() {
  const { c } = useTheme();
  const { i } = useLocalSearchParams<{ i?: string }>();
  const run = useFieldNotes((s) => s.run);
  const archive = useFieldNotes((s) => s.archive);
  const offset = useFieldNotes((s) => s.devDayOffset);

  // An archived note, or the current one once day 14 is reached and a choice is made.
  const archived = i !== undefined ? archive[Number(i)] : undefined;
  const today = run ? fnToday({ run, devDayOffset: offset }) : 0;
  const note: Omit<FieldNote, 'finishedOn'> | undefined =
    archived ??
    (run && run.decision && run.next && today >= FN_DAYS
      ? {
          goal: run.goal,
          experiment: run.experiment,
          startedAt: run.startedAt,
          days: run.days,
          checkIn: run.checkIn,
          decision: run.decision,
          next: run.next,
        }
      : undefined);
  if (!note) return <Redirect href="/fieldnotes" />;

  const s = summarize(note, FN_DAYS);
  const noun = OBSERVATION[note.goal].noun;
  const goalTitle = GOALS.find((g) => g.id === note.goal)!.title;
  const range = `${longDate(note.startedAt)} – ${longDate(dateForDay(note.startedAt, FN_DAYS))}`;

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Field note" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk}>
            {range}
          </T>
          <T v="title" accessibilityRole="header">
            {goalTitle}
          </T>
          <T color={c.textDim}>{note.experiment.question}</T>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
            <T v="overline" color={c.textDim}>
              What you tried
            </T>
            <T v="bodyStrong">{note.experiment.action}</T>
            <View style={styles.stats}>
              <View
                style={styles.stat}
                accessible
                accessibilityLabel={`Tried on ${s.tried} of ${s.experimentDays} experiment days`}
              >
                <T v="title">{s.tried}</T>
                <T v="caption" color={c.textDim}>
                  of {s.experimentDays} days tried
                </T>
              </View>
              <View
                style={styles.stat}
                accessible
                accessibilityLabel={`${noun} noted on ${s.notesGiven} of ${FN_DAYS} days`}
              >
                <T v="title">{s.notesGiven}</T>
                <T v="caption" color={c.textDim}>
                  of {FN_DAYS} days noted
                </T>
              </View>
            </View>
            <DayStrip run={note} today={FN_DAYS} />
          </ThemedView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
            <View style={styles.headRow}>
              <Ionicons name="bulb" size={20} color={c.accentInk} />
              <T v="overline" color={c.accentInk}>
                What you noticed
              </T>
            </View>
            <T v="heading" accessibilityRole="header">
              {PATTERN_HEADING[s.pattern]}
            </T>
            {s.lines.map((l) => (
              <T key={l}>{l}</T>
            ))}
            {note.checkIn ? <T>On day 7, it felt {note.checkIn}.</T> : null}
            <T v="caption" color={c.textDim}>
              {CAVEAT}
            </T>
          </ThemedView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).duration(400)}>
          <ThemedView
            style={[styles.card, { backgroundColor: c.accentSoft, borderColor: c.accentInk, borderWidth: 1 }]}
          >
            <View style={styles.headRow}>
              <Ionicons name="bookmark" size={20} color={c.accentInk} />
              <T v="overline" color={c.accentInk}>
                Carrying forward
              </T>
            </View>
            <T v="heading">{CHOICE[note.decision]}</T>
            <T>{note.next.action}</T>
          </ThemedView>
        </Animated.View>

        <View style={{ gap: space.sm }}>
          <Button
            label="Review your notes"
            kind="secondary"
            onPress={() => router.push(i !== undefined ? `/fieldnotes/history?i=${i}` : '/fieldnotes/history')}
          />
          {!archived ? (
            <Button
              label="Start your next 14 days"
              onPress={() => {
                haptic.success();
                // This note is kept in the archive; Schwung is untouched.
                useFieldNotes.getState().finish();
                void rescheduleReminders().catch(() => {});
                router.replace('/fieldnotes/setup');
              }}
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  stats: { flexDirection: 'row', gap: space.lg },
  stat: { flex: 1, gap: 2 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
