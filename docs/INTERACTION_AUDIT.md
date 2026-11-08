# Interaction and motion audit

- **Baseline:** `81d55e2` (main).
- **Scope:** audit only, with no production changes.
- **Method:**
  - I read the navigation config, every `Pressable`, every enter/exit animation, the shared motion constants and `lib/haptics.ts`.
  - I checked the findings in the web build (`npm run qa:build`, Playwright).
  - Native transitions (sheets, stack fades) can't be judged from the web build, so I judged them from their configuration only.

## 1. Interactions reviewed

| Area | Source |
|---|---|
| Tab switching and the shared panorama | `components/PagerTabs.tsx`, `WorldLayer.tsx` |
| Root navigation and sheets (Settings, Habit Details, Collection, Add, Reflection, Ascent, Past journeys, Privacy, Legal, Language, Restore) | `app/_layout.tsx` (native stack), `components/SheetHeader.tsx` |
| Onboarding pages, Continue/Back, answers, age bands, health, habits, levels | `pilot/PilotSetup.tsx`, `onboarding/kit.tsx`, `Choices.tsx`, `AgeBands.tsx`, `HealthList.tsx`, `Habits.tsx`, `Instruments.tsx` |
| Habit cards: swipe, complete, undo, long press | `components/HabitCard.tsx`, `pilot/PilotToday.tsx` |
| Habit Details, partial progress, difficulty, remove | `pilot/PilotHabit.tsx` |
| Insights rows and charts | `components/InsightsViz.tsx`, `app/(tabs)/insights.tsx` |
| Journey day selection and journal entry | `app/(tabs)/progress.tsx`, `journey/ChapterTrail.tsx`, `Ascent.tsx` |
| Weekly reflection | `reflection/WeeklyReflection.tsx`, `ReflectionInvite.tsx` |
| What's next, New Ascent, Since the summit, Past journeys | `beyond/*.tsx` |
| Ceremonies, unlocks, finale, story | `ceremony/Ceremonies.tsx`, `collection/UnlockMoment.tsx`, `onboarding/Finale.tsx`, `story/StoryKeepsake.tsx` |
| Confirmations, validation, empty states | `Alert.alert` (age limit, recovery, past journeys, settings), inline messages in `PilotHabit`, `NewAscent` |
| Haptics | `lib/haptics.ts` (one vocabulary: select, tick, complete, confirm, undo, success, warning, press, land) |

## 2. Already polished: keep unchanged

**Native (keep as they are):**
- **Sheets:** they're iOS modals (`presentation: 'modal'`), with the system slide-up, swipe-down to dismiss and spring.
- **Full-screen fades:** the story and What's next use a native fade, and the root stack uses a native fade of 200 ms.
- **Alerts:** confirmation dialogs are native `Alert.alert`.
- **Web limit:** the web build shows these sheets and fades as instant cuts. That's a limit of the web build, not a finding.

**Custom, already premium:**
- **Tab pager:** `PagerTabs` runs on the UI thread, settles with a critically damped spring (`duration 240`, `dampingRatio 1`, no overshoot) and plays one haptic on change.
- **Habit cards:** the swipe physics, threshold tick, completion and undo animation, and the "one interaction, one haptic" rule (`HabitCard.tsx`, `lib/haptics.ts`).
- **`Button`:**
  - **Press:** it presses in over 70 ms and eases out over 240 ms; its shape gives a little and its shadow settles. The label is never scaled.
  - **Order:** the action runs before the haptic.
  - **Header buttons:** `HeaderButton` and `ThemeToggle` follow the same 70/220 ms pattern.
- **Onboarding page transition:** the incoming page glides in from the side it comes from (360/520 ms) and the outgoing one eases out (180/220 ms). Navigation is never delayed for the animation.
- **Health and other onboarding answers:** they animate their selection on the shared `settle` curve (`IconTiles`, `HealthList`: 280 ms, with the icon turning into a tick).
- **Weekly reflection:** the answer symbol eases over 260 ms, the response fades in over 180 ms, and the targets list reflows with `LinearTransition` (220 ms). This is the model for expanding content.
- **Journey:** the selected day's entry fades in over 180 ms. The mist and discovery reveals stay as they are.
- **Ceremonies, the summit beacon, unlocks, the finale and the story keepsake:** all keep their own pacing.
- **Reduce Motion:** every Reanimated timing found passes `ReduceMotion.System`.

## 3. Abrupt or inconsistent

| # | What | Where (source) | Seen as |
|---|---|---|---|
| A | **Double tap opens a screen twice.** There are 25 `router.push` calls with no guard. In the build, a double tap on Settings stacked two Settings sheets, so one Done still left Settings open. Native `push` behaves the same way. | `app/(tabs)/*`, `HeaderButton`, `PilotToday`, `progress.tsx`, `InsightsViz`, `beyond/*`, `settingsRows.tsx` | A duplicate screen, and a second dismissal needed |
| B | **Press feedback snaps.** About 40 raw `Pressable`s jump to opacity 0.5, 0.6, 0.7 or 0.75 with no easing in or out. The values differ from screen to screen. | `PilotHabit` (`TextLink`, `Option`, `Stepper`), `InsightsViz` rows and links, `settingsRows`, `LanguagePicker`, `RemindersSettings`, `NewAscent`, `WhatsNext`, `PastJourneys`, `SinceSummit`, `TodayHero`, `ChapterTrail`, `Ascent`, Journey's story card in `progress.tsx`, set-up's Back | A flicker instead of a press |
| C | **No press feedback at all** on every sheet's Done/Close button. | `SheetHeader.tsx` | The tap seems ignored until the sheet moves |
| D | **Habit Details swaps blocks instantly.** These all appear or disappear in one frame, and the content below jumps: <br>• Mark done ↔ Undo<br>• the done check<br>• the partial-minutes stepper (Add effort ↔ Remove partial)<br>• the remove confirmation<br>• difficulty feedback messages<br>• `removeError` | `pilot/PilotHabit.tsx`, which has no enter or exit animation | Abrupt on the most-used sheet |
| E | **Expanding rows are one-sided.** An Insights habit row fades its details in over 200 ms, but the rows below jump down at once and collapsing is instant. | `InsightsViz.tsx` (`open` row, about line 603) | A jump-cut on open and close |
| F | **Selection timing differs.** Some answers change instantly while others ease over 260–280 ms. Continue's disabled-to-enabled change also snaps (a static `opacity: 0.4`). <br>• Instant: age bands (the wash), `SoftChoice` (phone, wake, active, strength answers), `Divided` and `CheckRow` in New Ascent. <br>• Eased: Health, icon tiles, the reflection rows. | `AgeBands.tsx`, `Choices.tsx` (`SoftChoice`), `NewAscent.tsx`, `ui.tsx` (`Button` disabled) | Inconsistent from one question to the next |
| G | **Durations are scattered.** About 30 distinct values are in use between 60 ms and 3,200 ms. Only onboarding has a shared scale (`kit.tsx DURATION`). | Repo-wide | Small, accumulating inconsistency |
| H | **Small instant changes.** The selected marker ring on Journey appears at once. Inline validation text (`NewAscent` problems, `PilotHabit` errors) pops in at once. | `ChapterTrail.tsx` marker, `NewAscent.tsx` | Minor |

Haptics are already consistent: every select, confirm and complete goes through `lib/haptics.ts`. The one gap is the Done buttons in C, which play none; a quiet `select` would match the rest of the app.

## 4. Recommended motion vocabulary

Build on what exists by putting one small token file next to the theme (for example `theme/motion.ts`). The easing stays the app's one curve, `bezier(0.22, 1, 0.36, 1)` (`kit.tsx settle`), and every token passes `ReduceMotion.System`.

| Token | Value | Use |
|---|---|---|
| `press.in` / `press.out` | 70 ms / 200 ms (ease out) | Every tappable control. Rows and links dim to 0.6; filled controls use `Button`'s give. |
| `select` | 180 ms | A choice's wash, mark and label weight. Continue enabling and disabling. |
| `reveal` / `conceal` | fade 200 ms / 150 ms | Inline content appearing or going (messages, a confirmation, a stepper) |
| `reflow` | `LinearTransition` 240 ms | Siblings moving when something above opens or closes |
| `page` | 360 / 520 ms in, 180 / 220 ms out | Onboarding pages (unchanged) |
| `settle` (spring) | `dampingRatio 1`, no overshoot | Pager and drags (unchanged) |
| Native | the system's | Sheets, stack fades and alerts (never replaced) |

**Rules:**
- **Response:** respond on press-in, and run the action first, then the haptic.
- **Navigation:** never delay navigation for an animation.
- **Motion types:** animate opacity and layout only. Use no scale above about 3%, no bounce, pulse or glow.
- **One thing at a time:** content reveals, then its siblings reflow, never everything at once.
- **Navigation guard:** one guard for navigation (`pushOnce`: ignore a second push while a transition is under way).

## 5. Five highest-impact improvements

Ranked by how often each is met and by how it feels.

1. **Guard navigation against double taps (A).** It affects every sheet and screen opened from Habits, Journey, Insights and Settings, and it's a real defect, not just polish. One shared helper fixes it.
2. **One press feedback for every tappable control (B and C).** Replace the instant opacity snaps with the `press` token in a shared `PressableRow` / `TextLink`, and give `SheetHeader` Done its press feedback and haptic. It's met on almost every tap.
3. **Habit Details reveals and reflows (D).** It's the most-used sheet: `reveal`/`conceal` for done/undo, the partial stepper, confirmations and messages, and `reflow` for what follows.
4. **Expanding rows that open and close as one motion (E).** Insights habit rows (and any future expanding row) get `reveal` + `conceal` + `reflow`, as the weekly reflection already does.
5. **Consistent selection (F).** Age bands, `SoftChoice`, New Ascent's choices and Continue's enabled state all move to `select` (180 ms), matching Health and the reflection rows.

Lower priority: G (adopt the tokens as screens are touched) and H (the marker ring, inline validation).

## 6. Suggested implementation order

Each step is one focused change, grouping interactions that can share one treatment safely:

1. **Motion tokens and navigation guard.** Add `theme/motion.ts` (the values above) and `pushOnce`, and apply them to all `router.push` calls. There's no visual change, and tests can cover the guard.
2. **Press feedback.** Add a shared animated press wrapper (from `Press` / `Button`), then move the raw `Pressable` rows and links and `SheetHeader` Done onto it. This is mechanical and screen-neutral.
3. **Selection.** Bring the age bands, `SoftChoice`, New Ascent's `Divided` and `CheckRow`, and `Button`'s disabled transition onto `select`.
4. **Reveal and reflow in sheets.** Habit Details first, then New Ascent's validation and What's next.
5. **Expand and collapse.** Insights habit rows, then the Journey marker ring.

**Keep throughout:**
- **Leave untouched:** native sheet and stack transitions, the pager, habit-card physics and haptics, the ceremonies, the beacon, the mist and discovery reveals, and the onboarding page transition.
- **Every step must:**
  - respect Reduce Motion;
  - keep `accessibilityLiveRegion` and the announcements;
  - add no dependency (Reanimated's layout animations are already in use);
  - be checked on an iPhone, since the web build can't show native transitions or haptics.
