import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SheetHeader } from '../../components/SheetHeader';
import { Screen, T } from '../../components/ui';
import { dateForDay } from '../../core/dates';
import { GOALS, OBSERVATION } from '../../core/fieldnotes/catalog';
import { BASELINE, dayRecord, FN_DAYS } from '../../core/fieldnotes/journey';
import { fieldNotesAvailable, fnToday, useFieldNotes } from '../../store/fieldNotes';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/** Every day's note, as recorded (blank days stay blank): development and internal-testing builds only. */
export default function FieldNotesHistory() {
  if (!(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') || !fieldNotesAvailable()) {
    return <Redirect href="/" />;
  }
  return <History />;
}

function History() {
  const { c } = useTheme();
  const { i } = useLocalSearchParams<{ i?: string }>();
  const run = useFieldNotes((s) => s.run);
  const archive = useFieldNotes((s) => s.archive);
  const offset = useFieldNotes((s) => s.devDayOffset);
  const source = i !== undefined ? archive[Number(i)] : run;
  if (!source) return <Redirect href="/fieldnotes" />;
  const today = i !== undefined || !run ? FN_DAYS : Math.min(fnToday({ run, devDayOffset: offset }), FN_DAYS);
  const o = OBSERVATION[source.goal];
  const label = (r: number) => (r === 1 ? `1 · ${o.low}` : r === 5 ? `5 · ${o.high}` : String(r));

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Your notes" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T color={c.textDim}>{source.experiment.question}</T>
        {Array.from({ length: today }, (_, k) => today - k).map((day) => {
          const r = dayRecord(source, day);
          const date = new Date(`${dateForDay(source.startedAt, day)}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const tried =
            day <= BASELINE.to
              ? 'Starting day'
              : r?.tried === true
                ? `Tried it${r.when ? ` · ${r.when}` : ''}`
                : r?.tried === false
                  ? 'Not that day'
                  : 'No answer';
          return (
            <ThemedView key={day} style={[styles.row, { backgroundColor: c.surface }]}>
              <View style={{ width: 64 }}>
                <T v="bodyStrong">Day {day}</T>
                <T v="caption" color={c.textFaint}>
                  {date}
                </T>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T>{tried}</T>
                <T v="caption" color={c.textDim}>
                  {r?.rating !== undefined
                    ? `${o.noun[0].toUpperCase() + o.noun.slice(1)}: ${label(r.rating)}`
                    : 'No note'}
                </T>
              </View>
            </ThemedView>
          );
        })}
        {i === undefined && archive.length ? (
          <View style={{ gap: space.sm, marginTop: space.lg }}>
            <T v="overline" color={c.textDim}>
              Earlier field notes
            </T>
            {archive.map((n, k) => (
              <Pressable
                key={`${n.startedAt}-${k}`}
                onPress={() => router.push(`/fieldnotes/note?i=${k}`)}
                accessibilityRole="button"
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <ThemedView style={[styles.row, { backgroundColor: c.surface }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyStrong">{GOALS.find((g) => g.id === n.goal)?.title}</T>
                    <T v="caption" color={c.textDim}>
                      {n.experiment.action}
                    </T>
                  </View>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.sm },
  row: { flexDirection: 'row', gap: space.md, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
});
