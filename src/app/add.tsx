import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Field } from '../components/Field';
import { SheetHeader } from '../components/SheetHeader';
import { TargetPath } from '../components/TargetPath';
import { Button, Screen, T } from '../components/ui';
import { shownText } from '../core/habits';
import { TimeQuestion } from '../components/TimeQuestion';
import {
  addableHabits,
  CATEGORIES,
  iconFor,
  PLAN_MAX,
  prepareAdd,
  type LibraryOption,
  type TimeAnswers,
} from '../core/v2/program';
import { haptic } from '../lib/haptics';
import { currentDay, useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;
type Mode = 'library' | 'own';

/**
 * Add a habit. A V2 program can pick from Schwung's reviewed habits (the same eligibility and fit rules as the plan,
 * so never a held or prototype habit) or make its own; a V1 program makes its own, as before.
 */
export default function AddHabit() {
  const { c } = useTheme();
  const programVersion = useApp((s) => s.programVersion);
  const profile = useApp((s) => s.profile);
  const library = programVersion === 2 && profile !== null;
  const [mode, setMode] = useState<Mode>(library ? 'library' : 'own');

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={library ? 'Add a habit' : 'Add your own habit'} action="Cancel" />
      {library ? (
        <View style={styles.segmentWrap}>
          <ThemedView style={[styles.segment, { backgroundColor: c.surface }]} accessibilityRole="tablist">
            {(
              [
                ['library', 'Schwung habits'],
                ['own', 'Your own'],
              ] as const
            ).map(([m, label]) => (
              <Pressable
                key={m}
                onPress={() => {
                  haptic.tap();
                  setMode(m);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                style={[styles.segmentItem, mode === m && { backgroundColor: c.surfaceHigh }]}
              >
                <T v="caption" color={mode === m ? c.text : c.textDim} style={{ fontWeight: '700' }}>
                  {label}
                </T>
              </Pressable>
            ))}
          </ThemedView>
        </View>
      ) : null}
      {library && mode === 'library' ? <Explore /> : <Own />}
    </Screen>
  );
}

/**
 * Reviewed habits that suit this person and fit next to their plan, goal habits first. A habit whose targets need
 * a wake-up or bed time the plan never asked for asks it when added, checks the habit again with the answer, and
 * only then adds it (Back or Cancel add nothing and change nothing).
 */
function Explore() {
  const { c } = useTheme();
  const profile = useApp((s) => s.profile)!;
  const plan = useApp((s) => s.plan);
  const [open, setOpen] = useState<string | null>(null);
  const [asking, setAsking] = useState<{
    id: string;
    title: string;
    question: 'wake' | 'bed';
    answers: TimeAnswers;
  } | null>(null);
  // Why the last answer ruled a habit out, shown in that habit's own card (which stays open).
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const full = plan.length >= PLAN_MAX;
  const options = addableHabits(profile, plan);
  const forGoal = options.filter((o) => o.forGoal);
  const rest = options.filter((o) => !o.forGoal);

  const done = () => {
    haptic.success();
    // Back to Today (or straight there when Add was opened on its own).
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  };

  /** One step of adding: add it, ask the next missing time, or explain why it no longer fits. */
  const step = (id: string, title: string, answers: TimeAnswers) => {
    const s = useApp.getState();
    const next = prepareAdd(profile, s.plan, id, answers, currentDay(s));
    if (next.status === 'ask') {
      setAsking({ id, title, question: next.question, answers });
      return;
    }
    setAsking(null);
    if (next.status === 'unsuitable') {
      haptic.warning();
      setNotice({ id, text: next.message });
      setOpen(id);
      return;
    }
    if (s.addLibraryHabit(id, answers)) done();
  };

  if (asking) {
    return (
      <ScrollView contentContainerStyle={[styles.scroll, styles.asking]}>
        <Pressable
          onPress={() => {
            haptic.tap();
            setAsking(null);
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`Back to the list. ${asking.title} isn’t added.`}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={22} color={c.text} />
          <T v="bodyStrong">Back</T>
        </Pressable>
        <TimeQuestion
          key={asking.question}
          question={asking.question}
          why={`${asking.title} sets its targets around your own day. Nothing else in your plan changes.`}
          onAnswer={(a) => {
            haptic.tap();
            step(asking.id, asking.title, { ...asking.answers, ...a });
          }}
        />
      </ScrollView>
    );
  }

  const group = (title: string, items: LibraryOption[]) =>
    items.length ? (
      <View key={title} style={{ gap: space.sm }}>
        <T v="overline" color={c.textDim} accessibilityRole="header">
          {title}
        </T>
        {items.map((o) => (
          <LibraryRow
            key={o.id}
            o={o}
            open={open === o.id}
            onOpen={() => {
              haptic.tap();
              setNotice(null);
              setOpen(open === o.id ? null : o.id);
            }}
            onAdd={() => step(o.id, o.title, {})}
            notice={notice?.id === o.id ? notice.text : null}
          />
        ))}
      </View>
    ) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {full ? (
        <ThemedView style={[styles.note, { backgroundColor: c.surface }]}>
          <T v="bodyStrong">Your plan has {PLAN_MAX} habits.</T>
          <T v="caption" color={c.textDim}>
            That’s the most a plan holds, so each one gets real attention. To try something new, swap a habit: hold it
            on Today and choose Swap.
          </T>
        </ThemedView>
      ) : (
        <T v="caption" color={c.textDim}>
          Reviewed habits that suit your answers and fit next to your plan. Each one starts at its Foundation level
          today and grows from there. Tap one to see its full path.
        </T>
      )}
      {!full && !options.length ? (
        <ThemedView style={[styles.note, { backgroundColor: c.surface }]}>
          <T v="caption" color={c.textDim}>
            Everything that suits your answers is already in your plan or wouldn’t fit next to it. You can still add
            your own.
          </T>
        </ThemedView>
      ) : null}
      {group('For your goal', forGoal)}
      {CATEGORIES.map((cat) =>
        group(
          cat,
          rest.filter((o) => o.category === cat),
        ),
      )}
    </ScrollView>
  );
}

function LibraryRow({
  o,
  open,
  onOpen,
  onAdd,
  notice,
}: {
  o: LibraryOption;
  open: boolean;
  onOpen: () => void;
  onAdd: () => void;
  notice: string | null;
}) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.row, { backgroundColor: c.surface }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${o.title}. Starts at ${shownText(o.targets.easy)}.`}
        accessibilityHint={open ? 'Hides the details' : 'Shows its path and the Add button'}
        style={({ pressed }) => [styles.rowHead, { opacity: pressed ? 0.75 : 1 }]}
      >
        <ThemedView style={[styles.icon, { backgroundColor: c.accentSoft }]}>
          <Ionicons name={iconFor(o.id) as IconName} size={20} color={c.accentInk} />
        </ThemedView>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{o.title}</T>
          <T v="caption" color={c.textDim}>
            Starts at: {shownText(o.targets.easy)}
          </T>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={c.textDim} />
      </Pressable>
      {open ? (
        <View style={{ gap: space.md }}>
          {notice ? (
            <ThemedView style={[styles.notice, { backgroundColor: c.surfaceHigh }]} accessibilityLiveRegion="polite">
              <Ionicons name="information-circle" size={18} color={c.accentInk} />
              <T v="caption" style={{ flex: 1 }}>
                {notice}
              </T>
            </ThemedView>
          ) : null}
          <T color={c.textDim}>{o.why}</T>
          {o.notes.map((n) => (
            <T key={n} v="caption" color={c.textFaint}>
              {shownText(n)}
            </T>
          ))}
          {o.needsTime ? (
            <T v="caption" color={c.textDim}>
              {o.needsTime === 'wake'
                ? 'Adding it asks for your usual wake-up time first, then sets its targets from your answer.'
                : 'Adding it asks what time you usually get into bed first, then sets its targets from your answer.'}
            </T>
          ) : null}
          <TargetPath targets={o.targets} />
          <Button label="Add to my plan" onPress={onAdd} />
        </View>
      ) : null}
    </ThemedView>
  );
}

/** Your own habit: a title and optional details, at one level (unchanged). */
function Own() {
  const { c } = useTheme();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const add = () => {
    if (!title.trim()) return;
    useApp.getState().addCustomHabit(title, desc);
    haptic.success();
    // Back to Today (or straight there when Add was opened on its own).
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Field
          label="Habit"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Call a friend"
          maxLength={60}
          autoFocus
          returnKeyType="next"
        />
        <Field
          label="Details (optional)"
          value={desc}
          onChangeText={setDesc}
          placeholder="e.g. 10 minutes, no texting"
          maxLength={120}
          returnKeyType="done"
          onSubmitEditing={add}
        />
        <T v="caption" color={c.textFaint}>
          Your own habits stay at one level. They count toward your streak and XP like any other.
        </T>
        <Button label="Add habit" onPress={add} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  segmentWrap: { paddingHorizontal: space.xl, paddingBottom: space.lg },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  row: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  asking: { flexGrow: 1 },
  notice: { flexDirection: 'row', gap: space.sm, borderRadius: radius.md, padding: space.md, alignItems: 'flex-start' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 44, alignSelf: 'flex-start' },
});
