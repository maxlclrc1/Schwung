# Schwung — The Life Reset Program (testing builds)

**Stage 6:** the complete Life Reset in development and internal-testing builds. It covers all 11 habits, three
tabs (Habits, Journey, Insights), no timers, Field Notes retired, and work on the theme and page-transition lag. The
public release (V1) is unchanged, and its bundle doesn't contain the Life Reset.

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
- **Switching programs.** Settings → Life Reset · testing has Start, Open, "Switch to my previous program" and End.
  The Habits screen also offers "Switch to my previous program" when there is one.
  - **What follows the switch:** Habits, Journey and Insights all follow the program on screen.
  - **What doesn't mix:** logs, XP and streaks.

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

**Per habit:** consistency, this week ("2 of 4"), and a quiet history (the last 14 days as small marks, or a weekly
habit's weeks as small bars). Tap a habit for more:

- **Its target.**
- **Strength:** sessions per week against the target.
- **A link to its details:** corrections and difficulty.

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

**Next page slow to appear.**

- **The cause:** releasing a swipe navigates. Navigating re-rendered the tab layout and, through it, all three
  pages (Habits with its cards, Journey with its 66-day mountain, Insights) before the native slide could start.
- **Changes:**
  - each tab page now renders a memoized body, so a tab change doesn't re-render page content;
  - the world's six tiles are memoized, so a tab change or camera move never re-renders them;
  - the timer ticking (once a second while a timer ran) is gone with the timers.
- **Unchanged and already fine:**
  - the pages are kept mounted and attached (no first render mid-gesture);
  - card images are decoded with their page, not during a gesture;
  - the world pans on the UI thread (Reanimated), and the pages' drag offset is a native-driven `Animated.Value`.
- **Still on the JS thread:** the pager's touch handling is the responder system, so each finger move passes
  through JS (one `setValue` and one shared-value write). A busy JS thread can still make the drag lag. Moving the
  gesture to the UI thread would need react-native-gesture-handler, a new native dependency, so it isn't done here.

**Browser checks** (internal web export, iPhone-sized viewport):

- the three tabs swipe in order and back;
- a drag that starts on a card stays the card's;
- Reduce Motion still changes tab;
- light and dark both render, and the switch is immediate in the browser.

A browser can't show the iPhone's image decoding or JS-thread timing, so **none of this proves the lag is fixed on a
device.**

**Needs a physical iPhone:**

- **Theme switch:** how long light ↔ dark takes, on all three tabs, and right after launch (before every painting
  has loaded).
- **Swiping between tabs:**
  - how quickly the incoming page follows the finger, and whether the panorama and the page stay together;
  - with a long Habits list.
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

**Automated:** 640 tests in 39 suites, all passing; typecheck, lint and formatting are clean.

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
- **Journey:** rest days for the Life Reset; V1/V2 unchanged.
- **Persistence:** a restart keeps progress, counters, details, pending changes and the Screen Time check; yesterday
  can be corrected only until noon.
- **Saves:** separate keys; the program's save untouched; a pilot save loads with its timer data kept; damaged saves
  are dropped.
- **Field Notes:** retired in every build with no screens or entries, and its data still loads unchanged.
- **Isolation:** production refuses everything; nothing reaches the Life Reset except through the gate; the tab order
  is Habits, Journey, Insights.

**Browser** (internal and production web exports):

- **Setup and the Habits screen:** the full setup with five habits and baseline answers; Day 1 with swipe
  completion, the counter and the art.
- **Tabs:** Journey (the Life Reset's own day), Insights (dark and light), and tab swipes both ways.
- **Gestures and theme:** card-swipe priority, the theme switch, and Reduce Motion.
- **Saves and switching:** a pilot save loading next to an existing V2 program, and switching to the previous
  program (Habits, Journey and Insights follow it, both saves untouched).
- **Production:** the build unchanged.

## Limitations and open questions

1. **Ceremonies:** none for the Life Reset yet (Day 1/7/21/44/66), as asked.
2. **Reminders:** none for the Life Reset; the previous program's reminders continue.
3. **Workdays:** Get It Done uses Monday to Friday; choosing workdays isn't offered yet.
4. **Social Confidence:** the card suggests one step a day, and any step from the list counts, but there's no "swap
   to another suggestion" button.
5. **Less Scrolling:** uses the main-app minutes given at setup as the baseline. The weekly Screen Time check is
   recorded but doesn't move the limit.
6. **Theme switch:** still re-renders all three mounted pages (see Performance).
7. **The pager's touch handling:** still on the JS thread (see Performance).
8. **The weekly "not achieved" rule:** a week counts as recorded when any habit was recorded, so an untouched weekly
   habit can be offered a step easier (an offer only).
