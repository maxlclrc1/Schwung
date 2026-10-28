# Schwung — Life Reset In-App Pilot

> **Superseded** by `SCHWUNG_LIFE_RESET_PROGRAM.md` (Stage 6): the pilot became the full Life Reset program with
> all 11 habits and no timers. Kept as the record of Stage 5; its save carries on unchanged.

**Stage 5:** the first end-to-end Life Reset pilot. Three habits (Read Daily, Focus Time, Strength Training) run in a
**separate, temporary 66-day test program** in development and internal-testing builds. The other eight Life Reset
habits stay inactive. The public release is unchanged, and its bundle doesn't contain the pilot.

## Where it lives

| Part             | File                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Rules (pure)     | `src/core/reset/pilot.ts`, on top of the catalog, weekly, timer, tracking, readiness code |
| Saved state      | `src/store/resetPilot.ts` (its own key and version)                                       |
| The only door in | `src/store/pilotGate.ts`                                                                  |
| Screens          | `src/components/pilot/` (Today, Setup, Habit details, the Settings section)               |
| Routes           | `src/app/pilot/setup.tsx`, `src/app/pilot/[id].tsx` (thin: gate check, then the screen)   |
| Card             | The existing `HabitCard`, with optional `display`, `accessory` and `actions` props        |
| Tests            | `src/core/__tests__/resetPilot.test.ts`, `src/store/__tests__/resetPilot.test.ts`         |

## Isolation

- **Testing builds only.** `store/pilotGate.ts` loads the pilot behind the literal check
  `__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal'`. A production bundle folds that to false, so the
  pilot's store, screens and rules aren't in the public app at all. This was checked on a production web export: no
  pilot strings or save key are in it. Every pilot route also checks the gate and `resetPilotAvailable()`, and the
  store refuses every action in the production channel (tested).
- **Its own save.** The key is `schwung-reset-pilot` (`schwung-reset-pilot-internal` for Expo Go's internal channel),
  with its own version (1). It's separate from Schwung's `schwung-state` and Field Notes' keys.
  - **Never touches the program.** Starting, using, leaving and ending the pilot never reads or writes the running
    V1/V2 program or its save (tested on disk, byte for byte).
  - **No conversions.** No existing program is ever converted, and nothing is migrated.
  - **Damaged saves.** A damaged pilot save is dropped, never trusted.
- **Explicit, and reversible.**
  - **Start:** Settings → Life Reset pilot · testing → "Try the Life Reset pilot", then the setup screen.
  - **While it's on:** the Habits tab shows the pilot, and the app opens into it.
  - **Leaving:** "Back to my program" (on the pilot screen and in Settings) returns to the untouched program, and
    "Open the Life Reset pilot" goes back.
  - **Ending:** "End the pilot" deletes only the pilot.
  - **Running programs:** a running pilot is never started over.
- **Own clock.** In development builds the pilot has its own time travel (on the pilot screen). It never moves the
  program's clock.

## Setup

The setup asks only what these three habits need:

| Question                                                          | Why                                   |
| ----------------------------------------------------------------- | ------------------------------------- |
| Age (the existing bands)                                          | Under 16 is refused; 16–17 rules      |
| The existing precautions question (skipping = unknown)            | Strength Training's safety rules      |
| Time on a day all the habits fall on (20 min to 2 h)              | The time check                        |
| Strength only: where you're starting from (new/sometimes/regular) | The suggested intensity               |
| Strength at Challenge only: sessions a week already done (2–7)    | The target is the person's own number |

- **Prefilled answers.** Age and precautions come from the program's V2 profile when there is one. It's only read,
  never changed.
- **Choosing habits.** Choose any of the three, and Starter, Standard or Challenge for each.
  - **Eligibility:** the existing rules, unchanged (`resetExclusion`). Strength Training isn't available with a heart
    condition, pregnancy, walking difficulty or an unanswered health question. 16–17 can't choose Challenge, and
    joint pain rules out Starter. Read and Focus are open to everyone 16+.
  - **Strength notes:** the safety and guidance notes are shown in setup and in details.
- **Time check.** The Foundation minutes of all chosen habits on a day they all fall on (Read and Focus their
  minutes, Strength its approximate length) must fit the time given. The same check guards later step-ups and Make
  it harder.
- **Review.** Each habit's Foundation target and weekly frequency, and the busiest-day total.
- **Begin.** Everything starts at Foundation on Day 1 (today).

## The three habits

**Read Daily** (Reading scene, light and dark)

- **The card:** today's target ("Read 20 min") and "Every day".
- **Timer:** an optional pill with start, pause and resume, showing time / target.
- **Completing:**
  - **Swipe:** completes; swiping back (or Undo) undoes.
  - **Timer:** reaching the target makes it **ready to confirm** ("Timer done · tap to confirm"). It never completes
    by itself.
- **Partial progress:** timer minutes are kept with the day.
- **Details** (long-press):
  - **Minutes:** add or clear minutes later; this never changes completion.
  - **Timer:** reset.
  - **Difficulty:** Make it easier / harder, and "too easy" / "too hard".

**Focus Time** (Focused Work scene)

- **Flexible weekly frequency:** any N days a week (4 at Starter, 5 otherwise; partial weeks scaled).
- **The card:** the target and "2 of 4 this week". A day without it is a rest day, never a miss.
- **Timer and quick completion:** the same optional timer and quick swipe as Read.
- **Background and restarts:**
  - **How it counts:** time comes from saved timestamps, so the timer keeps counting in the background and after a
    restart.
  - **Midnight:** a timer running at local midnight stops there, crediting that day.
  - **On return:** timers are settled each time the app comes back.
- **16–17:** blocks of at most 60 minutes (Challenge Mastery is 2 × 45). Adults keep one block (they can split it;
  there's no UI for that yet).

**Strength Training** (a world landscape crop until it has its own scene: `placeholderCrop('strength_log')`)

- **Sessions, not exercises:** the card shows the weekly session target and "1 of 2 this week".
- **Logging:**
  - **Swipe** logs today's session; a second log the same day is the same session (one a day).
  - **Details** (optional): "Add details" on the card, or long-press. Type (full body, upper, lower, other) and
    duration, editable. Choosing a detail logs the session if it isn't yet.
  - **Undo** removes the session with its details.
- **Rest days** are never missed. The recovery note shows after back-to-back sessions.
- **Safety:** all eligibility and safety rules hold for setup, offers and manual changes. The held exercise
  programmes stay held, and nothing prescribes exercises, sets or weights.

## The card

The existing large illustrated card and its whole-card swipe are unchanged; the pilot passes its own words.

- **Top left:** the level, as "Standard · Foundation" (the three bars show the phase).
- **Title and target:** what to do and how much.
- **One small row:** the week ("2 of 4 this week · goal met", or "Every day"), plus at most one small pill: the
  optional timer, or the strength session's details.
- **Status:** "Swipe right to complete" (weekly: "Swipe right if you did it today"; Strength: "Swipe right to log a
  session"), or the done pill ("Done for today" / "Session logged") with Undo.
- **Gestures:** the card's pill buttons follow the card's own touch rules, so a swipe that starts on them still
  swipes. Vertical scrolling and the horizontal tab pager behave as on the program's Habits tab (checked in a
  browser).
- **VoiceOver:** the card reads the title, target, level, week and timer. Actions are complete/undo, Details, and
  start/pause timer.

## Pilot rules for XP, days and ceremonies

These are pilot-specific, written down here and tested. Weekly habits never get the daily-habit assumptions.

- **Completion** is only `log.completed`, as everywhere: timers, minutes and session details never decide anything.
  Swipe, check button and timer confirmation all use the same idempotent completion, so **XP is never awarded twice**.
- **The day's list** (`plannedOn`) is derived, never chosen:
  - **Daily habits** (Read Daily) are on it every day.
  - **Weekly habits** (Focus, Strength) are on it **only on a day they're done** (`countsTowardDay`), so they help a
    day and a rest day never pulls a day down.
  - **When it's updated:** each change re-derives the list for the day it touches.
- **XP:** the existing rule over the pilot's own logs. 10 for each done habit on the day's list, plus 20 when the
  whole list is done. Pilot XP and level are separate from the program's.
- **Full day:** the list is non-empty and all done. The "Day complete" banner shows only on the change to a full day.
  So a day where Read is done and Focus rests is complete.
- **Streak** (`pilotStreak`): consecutive days meeting the existing 80% rule, ending today (an unfinished today
  doesn't break it).
  - **Rest days:** a day with no daily habit and nothing done (weekly-only plans, resting) is **neutral**: it neither
    counts nor breaks the streak.
- **Ceremonies:** none in the pilot (no Day 1, 7, 21, 44 or 66 ceremonies). The program's ceremonies, reminders,
  Journey tab and Field Notes are untouched and keep following the program.
- **Weekly adherence** follows the scheduling engine: a week is achieved when its quota is met.
  - **Unrecorded weeks:** a closed week with no records is unrecorded, never failed.
  - **Not achieved:** a closed week with records (any habit's) and the quota short is "not achieved". So someone who
    uses the app daily but never does Focus is, after two such weeks, **offered** a step easier for Focus: an offer
    only, never automatic.

## Progression

The Stage 4/4B engine, unchanged:

- **Offers:**
  - **One at a time:** in card order, on the Habits tab ("You've been consistent" / "Ahead of schedule" / "Want it
    lighter?"), with Step up or Make it easier, and Not now.
  - **Checks:** the time check and the eligibility rules (`constraintsFor`) apply.
  - **No automatic rise** on Day 22 or 45.
- **When changes start:** accepted step-ups and step-downs start tomorrow (daily) or next Monday (weekly), and are
  confirmed on screen with the date.
- **Saved:**
  - **Changes:** pending changes, declines (7-day cooldown) and feedback are saved with each habit's
    `ProgressionState`.
  - **Offers:** offers aren't stored; they're recomputed from the saved state, so they're the same after a restart.
- **Manual controls:** Make it easier / harder and "too easy" / "too hard" live in each habit's details. A blocked
  change says why (age, safety, time, the hardest or easiest target).

## Testing

**Automated** (all green: 38 suites, 629 tests; typecheck, lint and formatting clean):

- **Setup and safety:** age, precautions, 16–17, joint pain, time budget, Strength's own sessions, suggestions.
- **Namespaces:** separate keys; the program and its disk save unchanged through start, use, back and end; no
  restart over a running pilot; no conversion.
- **Habits:**
  - **Read timer:** start, pause, resume, ready-to-confirm, confirm-as-timer, no duplicate XP, partial minutes,
    later minutes, reset.
  - **Focus:** weekly quota, rest days, quick completion, 16–17 blocks, background and restart from saved
    timestamps, midnight stop.
  - **Strength:** one session a day, details, edit, undo, weekly quota, rest days.
- **Day rules:** day lists, XP, full days, the neutral rest-day streak.
- **Progression:** Day 22 offer from tomorrow; weekly offer from next Monday; decline cooldown; time constraint;
  easier and harder; age limits; "too hard".
- **Persistence:** a restart keeps progress, timers, pending changes and declines; timers are settled on return;
  damaged saves are dropped.
- **Dates:** date keys across a clock change.
- **Compatibility:** V2 `reconcile` still raises the program on Day 22, and the pilot never does.
- **Builds:** production refuses everything; internal has no time travel; nothing outside the pilot imports it except
  through the gate; every route checks it.
- **Cards and gestures:** the light and dark scenes exist; the pilot uses `HabitCard` with the page's scroll lock and
  the pager claim.
- **Mutation check:** nine pilot rules were broken on purpose one at a time, and the tests caught each one.

**Browser** (internal web export, iPhone-sized viewport, light and dark):

- setup, including the time check and 16–17;
- the cards with their art;
- the timer;
- swipe to complete, a second swipe (no change), swipe back to undo;
- logging a session with details;
- long-press details;
- Make it harder (from next Monday);
- a timer that reached its target while the app was closed, confirmed with one tap;
- XP and the full-day banner;
- vertical scrolling;
- the tab pager (a drag on the header or summary changes tab; on a card it stays the card's);
- Back to my program.

**Still needs a physical iPhone:**

- **Swipe feel:** the whole-card swipe on the pilot cards, including starting a swipe on the timer pill, and the
  diagonal and vertical cases next to the pager.
- **Timer across the app's life:** backgrounding, locking the phone, force-quitting and reopening with a timer
  running; a timer across real midnight; a time-zone change while a timer runs.
- **Haptics.**
- **VoiceOver:** the card's custom actions (start/pause timer, Details).
- **Dynamic Type** at large sizes on the cards' extra row.
- **Theme switching** with the pilot open (light/dark fade on the pill row).
- **Whether it feels right:** whether "Today is complete" with Focus undone feels right, and whether the timer and
  week row are clear without explanation.

## Limitations and open questions

1. **No yesterday editing** in the pilot (the program's Today/Yesterday switch isn't there). Yesterday stays
   editable for readiness until noon, as everywhere.
2. **No reminders** for the pilot; the program's reminders continue.
3. **Strength has no artwork:** it uses a landscape crop until its own scene exists.
4. **Journey tab** still shows the program's journey (or none) while the pilot is on.
5. **Adults' Focus split** (two blocks) has no setting yet; 16–17 is always within the cap.
6. **Weekly step-down from other habits' records:** a week counts as "recorded" when the person used the app that
   week for any habit (the scheduling engine's rule), so unrelated activity can turn an empty Focus week into "not
   achieved". It only ever produces an optional offer; confirm this is wanted.
7. **The busiest-day time check** counts Strength's approximate length as if every habit fell on the same day: safe,
   but strict.
