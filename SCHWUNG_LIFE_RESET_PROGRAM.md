# Schwung — The Life Reset Program (development and internal builds)

**Stage 7:** the Life Reset is the default Schwung experience in development and internal builds: every new
program is a Life Reset, with all 11 illustrated habits, three tabs (Habits, Journey, Insights) and no timers. An
existing V1/V2 program is kept exactly as it was, and shown until its owner chooses to switch. The public release
(V1) is unchanged, and its bundle doesn't contain the Life Reset.

Supersedes `SCHWUNG_LIFE_RESET_PILOT.md` (the three-habit pilot this grew from).

## Where it lives

| Part                   | File                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Rules (pure)           | `src/core/reset/pilot.ts` (catalog, weekly, tracking, readiness and measures joined)                  |
| Insights for V1/V2     | `src/core/insights.ts`                                                                                |
| Saved state            | `src/store/resetPilot.ts` (its own key)                                                               |
| The only door in       | `src/store/pilotGate.ts`                                                                              |
| Screens                | `src/components/pilot/` (Habits, Setup, Habit details, Insights, Settings section, Journey data)      |
| Tabs                   | `src/app/(tabs)/today.tsx`, `progress.tsx` (Journey), `insights.tsx`                                  |
| Shared Insights pieces | `src/components/Insights.tsx`                                                                         |
| Journey's data         | `src/components/journeySource.ts`                                                                     |
| Tests                  | `src/core/__tests__/resetPilot.test.ts`, `insights.test.ts`, `src/store/__tests__/resetPilot.test.ts` |

The code keeps the pilot's names (`pilot.ts`, `PilotProgram`, the `schwung-reset-pilot` key), so a pilot program
carries on without any migration.

## Isolation and saves

- **Testing builds only.** `store/pilotGate.ts` loads the Life Reset behind the literal check
  `__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal'`, which a production bundle folds to false.
  - **Production bundle:** checked on a production web export, it has none of the Life Reset's text, screens or
    save key.
  - **Production app:** checked in a browser, it shows the V1 Today screen with the mountain, the rows and no tabs,
    exactly as before.
- **Its own save.**
  - **Key:** `schwung-reset-pilot` (`-internal` in Expo Go's internal channel), version 1 (`v: 1` per program).
  - **Separate:** it never reads or writes the V1/V2 program's `schwung-state` (tested on disk, and checked in a
    browser).
  - **No conversions:** no program is converted or migrated.
- **Pilot programs carry on.** A three-habit pilot save loads unchanged, including its saved timer data, which is
  kept but never shown. Tested with a real pilot-shaped save, and checked in a browser.
- **Damaged saves.** A damaged program is dropped, never trusted.
- **Switching programs:** see "The default experience" below. Logs, XP and streaks never mix.

## The default experience (development and internal builds)

**New installation, or no program at all:** the app opens on the start screen (the mountain, "Get your momentum
back."). "Start my reset" goes straight into the Life Reset set-up, which offers only the 11 Life Reset habits,
with their age, eligibility and health-precaution rules. "Begin Day 1" starts the program and opens Habits; Journey
and Insights show it. Nothing needs activating in Settings.

- **Retired for new programs:** the V1/V2 onboarding (quiz, plan, time, start, reveal) and its recommendations,
  including habits such as Phone-Free Wind-Down. Their screens send anyone who reaches them back to the start, and
  "Pick up where you left off" (a half-finished V1/V2 onboarding) isn't offered. Their definitions stay, for
  existing programs.
- **Interrupted set-up:** nothing is saved until "Begin Day 1"; reopening the app starts set-up again from the
  start screen.
- **No duplicates:** with a Life Reset saved, set-up never runs again (its route sends you home), and the store
  refuses to start a second one.

**Which program is shown** — one rule (`lifeResetShown`, `store/resetPilot.ts`), followed by Habits, Journey,
Insights, Settings and the start screen:

| Life Reset saved | Chosen (`active`) | V1/V2 program | Shown                             |
| ---------------- | ----------------- | ------------- | --------------------------------- |
| no               | –                 | no            | start screen → set-up             |
| no               | –                 | yes           | the V1/V2 program                 |
| yes              | yes               | either        | the Life Reset                    |
| yes              | no                | no            | the Life Reset (only one)         |
| yes              | no                | yes           | the V1/V2 program (switched back) |

**Existing V1/V2 program:** it stays the one shown, untouched. Its Habits screen has a card, "Start the Life
Reset", which says the program stays saved with all its history and can be switched back to in Settings ("Not now"
puts the card away, remembered). Settings → **Your program** offers the same, says which program is on, and:

- **On the Life Reset:** "Switch to my previous program" (also at the foot of Habits) and "End the Life Reset"
  (confirmed; deletes only the Life Reset).
- **On a previous program with a Life Reset saved:** "Switch to my Life Reset" (also on the Habits card).
- **Never wiped from here:** the V1 "Restart program" row is hidden where the Life Reset is the default, so a
  previous program can't be deleted by accident.

**The choice persists:** it's `active` in the Life Reset's own save (`schwung-reset-pilot`), so it holds across
restarts; switching only flips it. Neither program's data is read or written by a switch.

**Older pilot saves** load as the Life Reset unchanged (progress, readiness, timer and tracking details). One saved
before this change keeps its choice: chosen, it's shown; not chosen, it's shown only if there's no V1/V2 program.

**Wording:** nothing a person reads says "pilot" or "testing" (tested). Routes are `/life-reset/setup` and
`/life-reset/[id]`. The code keeps the pilot's names (`pilot.ts`, `PilotProgram`, the save key) so saves carry on.

### Releasing the Life Reset to production (a future, explicit decision)

Production stays on V1: `LIFE_RESET_IN_PRODUCTION` in `src/lib/flags.ts` is `false`. Making the Life Reset the
public default takes, together:

1. `LIFE_RESET_IN_PRODUCTION = true` (this turns on `lifeResetForNewPrograms` and `resetPilotAvailable`);
2. letting `store/pilotGate.ts` load it in production (its literal `__DEV__ || … === 'internal'` check), so the
   Life Reset's code is in the public bundle;
3. `tabs()` in `src/lib/flags.ts` for the three tabs and the world (the release keeps Today alone now);
4. a release review of the public bundle, existing V1 users (they keep V1, with the card), and the tests in
   `src/store/__tests__/channel.test.ts` and `resetPilot.test.ts` that pin today's production behaviour.

Held exercise-instruction programmes stay held either way: they aren't Life Reset habits, and set-up refuses
anything outside the 11 (tested).

## Setup (stepped, about a minute)

1. **About you:** age (under 16 is refused) and the existing precautions question (None, or Skip = unknown).
   Prefilled from the program's V2 profile when there is one.
2. **Habits:** all 11, each with a line describing it.
   - **Unavailable habits:** shown disabled with the reason, from the existing eligibility rules.
   - **Limit:** up to 6 (the existing limit).
   - **Suggested start:** "Start with a suggested three" (Read Daily, Daily Movement, Sleep Routine) and a "Suggested"
     tag. Nothing is pre-selected.
3. **Only what those habits need** (skipped when none apply):

   | Habit             | Question                                                       |
   | ----------------- | -------------------------------------------------------------- |
   | Less Scrolling    | Phone time, then main-app minutes                              |
   | Sleep Routine     | Usual wake time (or "it varies" / "I work shifts")             |
   | Daily Movement    | Active days                                                    |
   | Practice a Skill  | Which skill                                                    |
   | Strength Training | Starting point, then sessions a week already done at Challenge |

4. **How hard to start:** Starter, Standard or Challenge per habit.
   - **Suggestions:** Starter by default; Movement from active days, Strength from its starting point, Less Scrolling
     from main-app time.
   - **Blocked intensities:** greyed out (for example, 16–17 can't pick Strength Challenge).
   - **Preview:** each habit shows its target.
   - **Time:** the time available (20 min to 3 h), with the time check on a day all habits fall on.
   - **Exclusions:** a habit excluded by a baseline answer (say, shift work for Sleep Routine) says why and can be
     removed.
5. **Review:** each habit's target and frequency, then **Begin Day 1**.

No projects, journals, missions or check-ins.

## The 11 habits

| Habit             | Card says (Starter Foundation)                   | How often                   | Extra on the card              |
| ----------------- | ------------------------------------------------ | --------------------------- | ------------------------------ |
| Focus Time        | Focus for 15 minutes, phone in another room      | Any 4 days a week           | Week progress                  |
| Less Scrolling    | Keep your main app under 1 h 45 today (from 2 h) | Every day                   |                                |
| Get It Done       | Finish your #1 task                              | Any 3 workdays a week       | Tasks counter, week progress   |
| Read Daily        | Read for 10 minutes                              | Every day                   |                                |
| Social Confidence | Today's step (from the action library)           | Any 3 days a week           | Week progress                  |
| Daily Movement    | Move for 10 minutes, any way you like            | Every day                   |                                |
| Sleep Routine     | Up by 08:00 (from a 07:00 wake time)             | Every day                   |                                |
| Tidy Up           | Tidy up for 5 minutes                            | Every day                   |                                |
| Practice a Skill  | Practise language for 10 minutes                 | Any 4 days a week           | Week progress                  |
| Stay Connected    | Reach out to 1 person (more than a like)         | Any 4 days a week           | People counter, week progress  |
| Strength Training | 2 sessions a week, about 30 min (Standard)       | Any days, one session a day | Session details, week progress |

- **Timers are gone from the interface.** Targets are just shown and a swipe confirms; nothing asks for minutes.
  - **Optional minutes:** they can be noted in a habit's details (never needed, never affecting completion).
  - **Kept:** timer data saved by the pilot, and `timer.ts` (still used to show 16–17 Focus blocks, for example
    "2 × 45 minutes").
- **Counters:** Get It Done and Stay Connected have a small "+ 0 of 2" button on the card.
  - **Completing:** reaching the number completes the habit (once), and a swipe works too.
  - **Correcting:** −1 is in the details.
- **Social Confidence:** the card shows the day's suggested step; any step at that level counts (listed in details),
  and "Skip today" is never a failure.
- **Strength Training:**
  - **Logging:** a swipe logs a session (one counts a day).
  - **Details:** "Add details" (type, minutes) and undo.
  - **Recovery note:** shown after back-to-back days.
  - **Held programmes:** stay held.
- **Get It Done at weekends:** "Not a workday · rest".
- **Art:** the existing Reading, Focused Work and Walking scenes. The other eight use temporary crops of the world
  panorama (`placeholderCrop`); no new artwork.
- **Details** (long-press a card, or Insights → "Details, corrections & difficulty"):
  - **Today:** today's state, counter, skip, and the session details.
  - **Corrections:** a correction for yesterday, until noon.
  - **Minutes:** optional.
  - **Difficulty:** Make it easier / harder, and "too easy" / "too hard".
  - **Notes:** the safety notes.

## Rules for XP, days and streaks

Life Reset rules, unchanged from the pilot and tested; V1/V2 rules are untouched.

- **Completion** is only `log.completed`. Swipe, check button and counter all use the same idempotent completion,
  so XP is never awarded twice.
- **The day's list:** daily habits every day; weekly habits only on a day they're done (`countsTowardDay`).
- **XP:** the existing rule over the Life Reset's own logs: 10 a done habit on the list, plus 20 for a full list.
- **Streak:** consecutive days meeting the existing 80% rule. A day with nothing due (weekly habits resting) is
  neutral: it neither counts nor breaks the streak.
- **Ceremonies:** none for the Life Reset (not added in this stage).

## Insights (the third tab, at the lakeside camp)

Insights shows the program on screen (Life Reset or V1/V2), from its saved days only.

| Number          | How it's counted                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Consistency** | Done ÷ eligible opportunities so far (rules below)                                                                                 |
| **Habits done** | Every completed habit action on record (each habit once a day)                                                                     |
| **Day streak**  | As above (V1/V2: the existing streak)                                                                                              |
| **Days**        | Today's day of 66                                                                                                                  |
| **This week**   | From Monday: each daily-habit day up to today (today included, still possible), plus each weekly habit's goal; done is what's done |

**Opportunities** never invent a miss:

- **Daily habits:** each day from Day 1 to yesterday is one; today counts only once it's done.
- **Weekly habits:** each finished week contributes its goal; the current week counts only what's already credited.
- **V1/V2:** each due day since the habit joined, and today once done. Rest days of scheduled habits never count.

**Per habit:** a compact bar (its consistency), this week ("2 of 4") and, for a weekly habit, how many finished
weeks met their goal. Tap a habit for:

- **Its history:** the last 14 days as small marks, or a weekly habit's weeks as small bars.
- **Its target.**
- **Strength:** sessions per week against the target.
- **A link to its details:** corrections and difficulty.

### Insights charts

Plain views, no chart library (`components/InsightCharts.tsx`); the numbers are pure functions with tests
(`core/charts.ts`, `core/reset/charts.ts`, and `core/insights.ts` for V1/V2).

- **Weekly consistency:** one bar per program week (Monday to Sunday, so the first and last can be short).
  - **Value:** done ÷ eligible with exactly the overall consistency's opportunities, added up week by week; the
    weeks always sum to the overall number (tested). Rest days are never opportunities; weekly habits count by
    their goal.
  - **This week:** an outlined bar, "so far" (today and open weekly goals aren't counted yet).
  - **A finished week with no record at all:** a dashed gap, "no days recorded", never a 0% bar. Within a week that
    has records, an unrecorded day still counts as a missed opportunity, as in the overall consistency.
  - **A week with nothing due:** a dot, "nothing was due".
  - **Too little data:** before the first week ends, and with only one finished week, a note says so.
  - **Interaction:** tap a bar for its numbers; the last finished week is selected at first.
- **The 66-day heatmap:** one column per calendar week, Monday on top, each day on its real date and weekday.
  - **Day states:** all done (solid), some (lighter, by the share done), none done on a day with a record (a ring),
    skipped (faint fill), rest (a small dot: nothing was due), no record (dashed), today (accent ring), not yet
    reached (faint).
  - **Each state has a shape too**, not only a colour; a legend is always shown.
  - **Tap a day** for its date, Day number and what was recorded ("1 of 3 done: Read Daily. Skipped: Daily
    Movement."). VoiceOver reads the same for every cell.
- **Personal records:**
  - the most consistent **full** finished week (a short first week never counts);
  - total habit actions done;
  - the longest streak, by the program's own rule;
  - reading days (if Read Daily is in the program);
  - strength sessions (if Strength Training is).
  - Never minutes or hours.
- **Empty states:** "—" with what's needed ("after your first full week"); records start at 0.
- **Performance:**
  - the charts mount only once Insights is first shown, a frame after it comes into focus, never during the slide
    (and never at all for someone who doesn't open it);
  - while another tab is shown they keep the numbers they had, and recompute when Insights is shown again (a habit
    checked off on Habits doesn't recompute charts behind the page);
  - everything is memoized per change, nothing is computed per animation frame, and the only animation is one
    200 ms fade-in (instant with Reduce Motion).

**Less Scrolling:** an optional weekly Screen Time check. The person's own daily average, saved per week as
self-reported, never affecting a day or a streak.

**Design:**

- **Layout:** one overview card (the big number first), then restrained habit cards.
- **Look:** the Schwung surfaces over the lakeside band of the panorama, with no bright dashboard colours.
- **The world:** it stays still while the page scrolls, and is placed so the painting fills the page and its edge
  never shows.

No reflection or journaling was added: nothing optional of that kind could reuse saved data without bringing back
a Field Notes-like program.

## Journey

The Journey tab and its 66-day calendar show the program on screen (`journeySource.ts`). The mountain, trail and
alignment are unchanged.

- **Life Reset:**
  - its own Day 1–66 position, logs and stats (days done, streak, best, with rest days neutral);
  - a day with nothing due shows as a **rest** day: a small walked mark and a bordered calendar cell, never "missed".
- **V1/V2:** exactly as before.

## Field Notes, retired

- **Tab:** Insights took Field Notes' tab and its lakeside place in the panorama, unchanged in both themes.
- **Gone from the app:** Field Notes' screens, its welcome/Settings entries and its reminders.
  `fieldNotesAvailable()` is false in every build.
- **Data kept:**
  - **Saved data** (`schwung-fieldnotes`): kept exactly as it was, loaded and never deleted (tested).
  - **Export:** it's included in **Export my data** when present, beside the program and the Life Reset.

## Performance: what was found, what changed, what needs an iPhone

**Theme switch delay.** `ThemedImage` held only the theme on screen.

- **What that caused:**
  - every switch first loaded and decoded the other theme of all six large panorama tiles (each up to
    1568 × 3584 px) and every card scene;
  - the theme gate waited for that, up to 600 ms, before anything faded;
  - on a phone that wait is the delay people felt.
- **Change: both themes of every painting stay mounted.** They're decoded once, when the painting first appears.
  - **Effect:** a switch never loads or decodes; the light version fades over the dark one as before.
  - **Gate:** it only waits for a painting that is still loading (a card that just appeared), now at most 300 ms.
  - **Cost:** memory, about 65 MB for the six tiles at screen resolution and about 6 MB per card scene.
- **Not changed:** a theme switch still re-renders every component that reads the theme. All three tabs stay
  mounted, so that's three pages of React work on the JS thread at the moment of the switch. Reducing it needs the
  colour system to move off React context (a larger change); it's the next suspect if the switch still feels late
  on a device.

**Tab swiping lag (the cause).** Before this change, a swipe ran through two animation systems and the JS thread:

- **The finger:** the pager used React Native's responder system, so every finger move went through the JS thread,
  then set the pages' offset (React Native `Animated`) and the panorama's camera (Reanimated) separately. Any JS
  work (a re-render, a timer, a save) delayed the drag, and the page trailed the finger by about a frame.
- **The release:** navigating re-rendered the tab layout and its pages before js-tabs' slide started, and the
  panorama only started moving from an effect after React committed. At 6× CPU slowdown that showed as an 83 ms
  frame at the moment of release.
- **Not the cause:** image decoding (pages stay mounted and decoded), mounted pages (kept, for scroll positions),
  and the world tiles (memoized, never re-rendered by a swipe).

**Tab swiping (the change).** One value on the UI thread, `worldCamera`, now moves everything:

- **Navigator:** a small Expo Router navigator (`components/PagerTabs.tsx`, built on its tab router) lays the three
  pages side by side in one row that is translated by the camera; the panorama reads the same camera. Page and
  landscape move in the same frame by construction, and the Journey trail and the Insights lake stay aligned.
- **Gesture:** a react-native-gesture-handler pan with worklet callbacks (UI thread). It activates on a clearly
  sideways drag (14 pt), fails on a vertical one (10 pt), and gives only a little past the first and last tab.
- **Release:** a critically damped spring from the finger's position **and speed** to the target tab, so there's no
  jump and a flick carries through. The tab bar highlights the new tab at once; the navigator's state, which
  re-renders more, is updated only after the page has landed, so no React work competes with the slide.
- **Rules unchanged:** `core/pager.ts` (the 30% distance, the flick, cancelling) now runs as worklets.
- **Ownership:**
  - a habit card stamps the moment a touch begins on it (a gesture that fails at once and never waits on anything);
    the pager activates itself only after its own checks (manual activation), and never for a touch that began on
    a card, so the card's own swipe always wins;
  - the gesture's setup is created once and never re-sent to the native handler on a render (an earlier version
    re-sent it on every tab change and had each card's gesture block the pager until it ended, which on iOS could
    leave the app unresponsive after a few swipes);
  - a sheet over a tab and the keyboard (text entry) switch the pager off through a shared value;
  - the stack's modals (Settings, a habit's details) sit above the tabs and get no tab swipes.
- **Reduce Motion:** nothing follows the finger; a swipe or a tap changes tab at once.
- **Trade-offs:**
  - react-native-gesture-handler (~3.3.0, the SDK 58 version, also in Expo Go) is a new native dependency: a new
    development or internal build is needed. The public release's JavaScript doesn't use it (Today alone, js-tabs,
    as before), but its next native build will contain the module.
  - The tab bar is the navigator's own (it looks like the js-tabs bar it replaces).
  - When the page lands, the navigator's re-render still happens on the JS thread (about 100 ms at 6× slowdown in
    the browser), but after the slide, not during it.

**Before and after** (browser, internal web export, 390 × 844, 6× CPU slowdown via Chrome DevTools Protocol, median
of 5 runs, a 240 pt swipe from Habits to Journey, measured in the page with `requestAnimationFrame` frame times, a
long-task observer and DevTools memory metrics; the same script ran against both builds):

| Measure                           | Before (`5adc6f2`) | After      |
| --------------------------------- | ------------------ | ---------- |
| Input to visual movement          | 15 ms              | ≈ 0 ms     |
| Worst frame while the page slides | 67 ms              | 17–33 ms   |
| Dropped frames during the slide   | 1                  | 0–1        |
| Release to page at rest           | 423 ms             | 276–283 ms |
| JS heap after the swipe           | 22.5 MB            | 22.1 MB    |
| Long tasks after release (total)  | 82 ms              | 114–132 ms |

At normal speed (1×): latency 16 ms → about 0 ms; settle 363 ms → 263 ms; no dropped frames either way. The longer
long tasks after the change are the navigator's update, which now runs once the page has landed. On a phone the
slide itself runs on the UI thread, so JS work can't stall it at all; the browser runs everything on one thread, so
these numbers measure JS-side work, not the iPhone's frame rate.

**Browser checks** (internal web export, iPhone-sized viewport):

- the three tabs swipe in order and back; a cancelled drag springs back; a vertical or diagonal drag scrolls and
  never changes tab; a flick changes tab exactly as before (same distances and speeds); tab taps work;
- a swipe over a modal (Settings) never moves the tabs;
- a drag that starts on a card stays the card's;
- Reduce Motion still changes tab;
- light and dark both render, and the switch is immediate in the browser.

A browser can't show the iPhone's image decoding or JS-thread timing, so **none of this proves the lag is fixed on a
device.**

**Needs a physical iPhone:**

- **Theme switch:** how long light ↔ dark takes, on all three tabs, and right after launch (before every painting
  has loaded).
- **Swiping between tabs (a reproducible test):** a new development or internal build (the gesture handler is
  native). In Settings → Accessibility → Display & Text Size, turn **Reduce Motion off**. With a Life Reset of 5 or
  more habits:
  1. On Habits, drag slowly right-to-left and back without lifting: the page and the landscape must stay under the
     finger with no visible lag, and nothing moves vertically.
  2. Release at about a third of the way: the page settles on Journey without a jump. Release before that: it
     springs back.
  3. Flick quickly (a short, fast drag): it changes tab.
  4. Swipe Habits → Journey → Insights → back, ten times quickly: no stutter, and the Journey trail and Insights lake
     stay attached to their pages.
  5. Start a drag on a habit card: only the card swipes. Scroll Habits vertically, then diagonally: no tab change.
  6. Open a habit's details and Settings, and type in a text field: no tab swipes.
  7. Turn Reduce Motion on: a swipe or a tap changes tab at once, without a slide.
  - **Measure:** Xcode Instruments (Animation Hitches, or Core Animation FPS) on an internal build while doing
    step 4; the Perf Monitor in a development build (shake → Perf Monitor) shows the UI and JS frame rates. Compare
    with the `5adc6f2` build.
- **Insights on a device:** the charts' first appearance (once, after the slide lands), tapping weeks and days,
  VoiceOver on heatmap cells, and Dynamic Type on the records.
- **Memory:** use with both themes held, and whether iOS ever drops the images under pressure.
- **Gestures:**
  - card swipe priority, diagonal drags and vertical scrolling next to the pager;
  - the counter button on a card (a tap counts; a swipe starting on it still swipes).
- **Feel and accessibility:**
  - haptics;
  - VoiceOver: card actions (Add one, Details);
  - Dynamic Type on the setup chips and Insights;
  - Reduce Motion on device.

## Testing

**Automated:** 666 tests in 40 suites, all passing; typecheck, lint and formatting are clean.

- **All 11 habits:** catalog order and ids, targets, frequencies, art, and the 16–17 Focus blocks.
- **Setup:** only the needed baselines, kept answers, exclusions (phone time, wake time, precautions, age, joint pain),
  the 6-habit limit, suggestions and the time check.
- **Completion:** completion and undo with no double XP; counters (Get It Done, Stay Connected); Social Confidence
  skips; strength sessions with details, edits and undo; optional minutes.
- **Adherence:** daily lists, weekly rest days, workdays at weekends, and streaks through rest days.
- **Readiness:** the Day 22 offer, a weekly offer from next Monday, the decline cooldown, time and baseline limits,
  and "too hard".
- **Insights:** the numbers against hand-computed saved days, for the Life Reset and for V1/V2; the Screen Time check
  kept apart from the days.
- **Insights charts:** weekly tallies that add up to the overall consistency; finished, current, unrecorded and empty
  weeks; short first weeks; heatmap dates, weekdays and layout; full, partial, missed, skipped, rest, unrecorded,
  today and future days; the habit breakdown by quota; records (no minutes); empty states; the inspected day's
  words; V1/V2 the same way.
- **Pager:** the layout uses the UI-thread pager in testing builds only, and its gesture rules (worklets, the
  modal/keyboard switch, card blocking).
- **Journey:** rest days for the Life Reset; V1/V2 unchanged.
- **Persistence:** a restart keeps progress, counters, details, pending changes and the Screen Time check; yesterday
  can be corrected only until noon.
- **Saves:** separate keys; the program's save untouched; a pilot save loads with its timer data kept; damaged saves
  are dropped.
- **Field Notes:** retired in every build with no screens or entries, and its data still loads unchanged.
- **Isolation:** production refuses everything; nothing reaches the Life Reset except through the gate; the tab order
  is Habits, Journey, Insights.
- **Default experience:** new programs are Life Reset programs in development and internal builds only; the
  "which program is shown" rule in every case; switching back and forth leaves both programs untouched; no second
  Life Reset; only the 11 habits (Phone-Free Wind-Down and other retired habits refused); an older pilot save kept
  with its tracking data; "Not now" remembered; the start screen, Settings and the retired V1/V2 screens; no
  "pilot" or "testing" in visible text.

**Browser** (internal and production web exports):

- **Setup and the Habits screen:** the full setup with five habits and baseline answers; Day 1 with swipe
  completion, the counter and the art.
- **Tabs:** Journey (the Life Reset's own day), Insights with its charts (dark and light, a 20-day history with gaps,
  a skipped day and an explicit non-completion, and a new program), and tab swipes both ways (with the swipe
  benchmark).
- **Gestures and theme:** card-swipe priority, the theme switch, and Reduce Motion.
- **Saves and switching:** a pilot save loading next to an existing V2 program, and switching to the previous
  program (Habits, Journey and Insights follow it, both saves untouched).
- **Production:** the build unchanged.
- **Default experience** (internal web export): a new installation through the start screen and set-up to all three
  tabs (11 habits offered, none retired); set-up interrupted midway (nothing saved, starts again); set-up reopened
  and the old V2 quiz URL (both send you home, no second program); restarts; an existing V1 program (shown, its
  card, the switch, Insights following each program, back and forth twice, restarts, both saves byte-for-byte
  unchanged, "Not now" remembered); older pilot saves, chosen and not; production (V1 quiz, Life Reset routes
  closed, none of its text in the bundle).

## Limitations and open questions

1. **Ceremonies:** none for the Life Reset yet (Day 1/7/21/44/66), as asked.
2. **Reminders:** none for the Life Reset; the previous program's reminders continue.
3. **Workdays:** Get It Done uses Monday to Friday; choosing workdays isn't offered yet.
4. **Social Confidence:** the card suggests one step a day, and any step from the list counts, but there's no "swap
   to another suggestion" button.
5. **Less Scrolling:** uses the main-app minutes given at setup as the baseline. The weekly Screen Time check is
   recorded but doesn't move the limit.
6. **Theme switch:** still re-renders all three mounted pages (see Performance).
7. **Tab swiping:** moved to the UI thread in a browser-tested build; it still needs the iPhone test above.
8. **The weekly "not achieved" rule:** a week counts as recorded when any habit was recorded, so an untouched weekly
   habit can be offered a step easier (an offer only).
