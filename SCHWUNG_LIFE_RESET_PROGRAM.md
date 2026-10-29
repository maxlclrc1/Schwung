# Schwung — The Life Reset Program

**Stage 8:** the Life Reset is the whole app, in every build (development, internal and the App Store release).
The earlier V1/V2 program (quiz, plan, reminders, ceremonies), Field Notes and the switching between programs were
removed from the app; they stay in the git history. Every program has the 11 illustrated habits, three tabs (Habits,
Journey, Insights) and no timers.

Supersedes `SCHWUNG_LIFE_RESET_PILOT.md` (the three-habit pilot this grew from).

## Where it lives

| Part                 | File                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Rules (pure)         | `src/core/reset/pilot.ts` (catalog, weekly, tracking, readiness and measures joined)              |
| The person's answers | `src/core/reset/profile.ts` (age, precautions, phone time, wake time, active days)                |
| Insights charts      | `src/core/charts.ts`, `src/core/reset/charts.ts`                                                  |
| Saved state          | `src/store/resetPilot.ts` (the program), `src/store/preferences.ts` (the appearance)              |
| Screens              | `src/components/pilot/` (Habits, Setup, Habit details, Insights, Settings section)                |
| Routes               | `src/app/index.tsx`, `welcome.tsx`, `life-reset/setup.tsx`, `life-reset/[id].tsx`, `settings.tsx` |
| Tabs                 | `src/app/(tabs)/today.tsx` (Habits), `progress.tsx` (Journey), `insights.tsx`                     |
| Journey's data       | `src/components/journeySource.ts`                                                                 |
| Tests                | `src/core/__tests__/reset*.test.ts`, `insightCharts.test.ts`, `src/store/__tests__/*.test.ts`     |

The code keeps the pilot's names (`pilot.ts`, `PilotProgram`, the `schwung-reset-pilot` key), so a pilot program
carries on without any migration.

## One app, one program

- **Opening:** with a program, the app opens on Habits; without one (a new install, or after "End the Life
  Reset"), on the start screen, whose "Start my reset" leads into set-up. Nothing needs activating.
- **One program at a time:** with one saved, set-up never runs again (its route sends you home) and the store
  refuses to start a second. Set-up saves nothing until "Begin Day 1", so an interrupted set-up starts again.
- **Ending:** Settings → Your program → "End the Life Reset" (confirmed) deletes it; the start screen follows.
- **Saves:**
  - **The program:** `schwung-reset-pilot` (`-internal` in Expo Go's internal channel), version 1 (`v: 1` per
    program). An older pilot save loads unchanged, its saved timer and tracking data kept; fields only the
    earlier switching used (`active`, `inviteHidden`) are ignored. A damaged program is dropped, never trusted.
  - **The appearance:** `schwung-preferences`, on its own.
  - **Earlier saves** (`schwung-state`, `schwung-fieldnotes`) are never read, written or deleted; the app simply
    doesn't use them.
- **Only the 11 habits:** set-up offers the 11 with their age, eligibility and health-precaution rules, and the
  store refuses anything else (Phone-Free Wind-Down and the other retired habits, and the held exercise
  programmes, tested).
- **Eligibility rules** that came from the earlier habit library now live in the catalog (`resetExclusion`), carried
  over unchanged: Daily Movement (walking difficult; heart or pregnancy advice), Sleep Routine (wake time that
  varies or shifts), Less Scrolling (under 2 hours of phone use).
- **Removed with the old program:** reminders and notifications, the date picker and the share image (their
  native packages too: `expo-notifications`, `@react-native-community/datetimepicker`, `react-native-view-shot`),
  ceremonies, the V1 Today mountain image, the old restart and developer tools. The Life Reset's developer clock
  stays (Habits screen, development builds).
- **Wording:** nothing a person reads says "pilot", "testing", V1 or V2 (tested).

## Setup (stepped, about a minute)

1. **About you:** age (under 16 is refused) and the precautions question (None, or Skip = unknown).
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

## Adding a habit

**Habits → Add a habit** (shown while there are fewer than six) opens a sheet (`app/life-reset/add.tsx`):

1. **Pick one** of the 11 not in the program yet; one that isn't available (an age or health rule) shows why.
2. **Only its questions that haven't been answered** (set-up's wording: e.g. phone time for Less Scrolling); answers
   already given are never asked again.
3. **Its intensity** (the set-up's suggestion first) and a preview of its first target.
4. **The time check** with every habit at the level it's at today; if it doesn't fit, it says so and lets you give
   more time a day, or choose an easier intensity.

"Add" joins it **from today at Foundation**, in catalog order. Earlier days are untouched: before it joined it
didn't exist, so it's never a miss or a rest day there, its consistency counts from that day, and a weekly habit's
first week asks a goal scaled to the days left (`addHabit`, `addProblems` in `core/reset/pilot.ts`, tested).

## Your own habits

In **Add a habit**, **Your own habit** asks for a name (up to 40 characters, not one already in use), what counts as
done (optional, shown on the card) and how often: every day, or 1–6 days a week (counted by the week like the
catalog's weekly habits: any days, a day without it never missed). A live preview shows its card.

- **Its card** shows a part of the painted panorama (`habitArt.ts` `cropAt`): the first of the seven views none of
  the person's current own habits shows, kept with the habit (`custom.scene`).
- **It counts like any habit:** completion, XP, the day's list and the 80% rule, the streak, Journey and Insights.
- **No levels or offers:** its card says "Your habit"; its details have no difficulty section.
- **Saved** in the program (`custom`: name, note, days a week, view; its schedule in `progression`), checked on
  load: an id without a valid definition is never trusted.
- Up to six habits in all, catalog and own together.

## Removing a habit

A habit's details end with **Remove from my Life Reset** (confirmed in place). It leaves **from today**, or from
tomorrow if it's already done today, and is never removed if it's the last one (ending the program is in Settings).

- **Its past stays:** its days, XP, the streak, Journey and Insights count it while it was in the program, and never
  after (`ProgressionState.gaps`; history iterates `allHabits`, every habit that was ever in the program). A change it
  had waiting is dropped.
- **Adding it again** (a catalog habit, from Add a habit) picks it up from that day at the chosen intensity: the days
  away never existed, and its earlier days are still there.
- **Saved** with its history: a removed habit's progression stays in the save and is kept on load.

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

Life Reset rules, unchanged from the pilot and tested.

- **Completion** is only `log.completed`. Swipe, check button and counter all use the same idempotent completion,
  so XP is never awarded twice.
- **The day's list:** daily habits every day; weekly habits only on a day they're done (`countsTowardDay`).
- **XP:** the existing rule over the Life Reset's own logs: 10 a done habit on the list, plus 20 for a full list.
- **Streak:** consecutive days meeting the existing 80% rule. A day with nothing due (weekly habits resting) is
  neutral: it neither counts nor breaks the streak.
- **Ceremonies:** none for the Life Reset (not added in this stage).

## Insights (the third tab, at the lakeside camp)

Insights shows the program's numbers, from its saved days only.

| Number          | How it's counted                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Consistency** | Done ÷ eligible opportunities so far (rules below)                                                                                 |
| **Habits done** | Every completed habit action on record (each habit once a day)                                                                     |
| **Day streak**  | As above                                                                                                                           |
| **Days**        | Today's day of 66                                                                                                                  |
| **This week**   | From Monday: each daily-habit day up to today (today included, still possible), plus each weekly habit's goal; done is what's done |

**Opportunities** never invent a miss:

- **Daily habits:** each day from Day 1 to yesterday is one; today counts only once it's done.
- **Weekly habits:** each finished week contributes its goal; the current week counts only what's already credited.

**Per habit:** a compact bar (its consistency), this week ("2 of 4") and, for a weekly habit, how many finished
weeks met their goal. Tap a habit for:

- **Its history:** the last 14 days as small marks, or a weekly habit's weeks as small bars.
- **Its target.**
- **Strength:** sessions per week against the target.
- **A link to its details:** corrections and difficulty.

### Insights charts

Plain views, no chart library (`components/InsightCharts.tsx`); the numbers are pure functions with tests
(`core/charts.ts`, `core/reset/charts.ts`).

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

No reflection or journaling was added.

## Journey

The Journey tab and its 66-day calendar show the program (`journeySource.ts`):

- its Day 1–66 position, logs and stats (days done, streak, best, with rest days neutral);
- a day with nothing due shows as a **rest** day: a small walked mark and a bordered calendar cell, never "missed".

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
  - **Cost:** memory, about 120 MB for the six tiles (full resolution, since the image-loading fix below) and about 4 MB per
    scene image.
- **Not changed:** a theme switch still re-renders every component that reads the theme. All three tabs stay
  mounted, so that's three pages of React work on the JS thread at the moment of the switch. Reducing it needs the
  colour system to move off React context (a larger change); it's the next suspect if the switch still feels late
  on a device.

**Slow image loading (the cause).** Artwork took about two seconds to appear on the Habits cards, the world behind
the tabs, onboarding, the ceremonies, the collection and the 66-Day Story, again on every revisit.

- **Cause:** React Native's `Image` never keeps a decoded image larger than about 2 MB in its cache, and every
  painting here is larger (a scene is 1290 × 800, a tile up to 1568 × 3584, a collectible 1024²). So each mount
  decoded the file again, and every card using a panorama crop decoded a whole tile of its own. In development each
  mount also fetched the file from the dev server.
- **Change:** all bundled artwork is drawn with `expo-image` (`ART_IMAGE` in `ThemedImage.tsx`):
  - `cachePolicy: 'memory-disk'`: decoded once, then every view draws the same cached bitmap;
  - `allowDownscaling: false`: no per-view resized copy, and full resolution kept;
  - no transition, so nothing fades in.
- **Prefetch:** at launch, `components/artPrefetch.ts` decodes the person's own habit scenes and the world painting
  ahead of time, then the collectibles, a few at a time and off the main thread.
- **Not changed:** files, resolution, compression, crops, seams and trail positions.

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
  - react-native-gesture-handler (~3.3.0, the SDK 58 version, also in Expo Go) is a native dependency: a new
    development or internal build was needed when it was added.
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

**Automated:** 306 tests in 19 suites, all passing; typecheck, lint and formatting are clean.

- **All 11 habits:** catalog order and ids, targets, frequencies, art in both themes, and the 16–17 Focus blocks.
- **Setup:** only the needed baselines, kept answers, exclusions (phone time, wake time, precautions, age, joint pain),
  the 6-habit limit, suggestions and the time check; only the 11 habits, retired ones refused.
- **Adding a habit:** only unanswered questions; the same refusals as set-up (already in it, not one of the 11,
  unanswered question, eligibility, six habits, time at today's levels, with more time accepted); it joins from
  that day without touching earlier days; daily and weekly tallies and recent days count from the day it joined.
- **Removing a habit:** its past (streak, XP, tallies) unchanged; from tomorrow when done today; never the last one;
  added again later with the days away not existing; kept through a save and reload.
- **Your own habits:** name, note and days a week; daily and weekly counting; no levels or offers; a different view
  each; the refusals (no name, a name in use, too long, over six); kept through a save and reload, an undefined id
  refused.
- **Completion:** completion and undo with no double XP; counters (Get It Done, Stay Connected); Social Confidence
  skips; strength sessions with details, edits and undo; optional minutes.
- **Day rules:** the 80% rule (4 of 5 counts), full days, XP and levels.
- **Adherence:** daily lists, weekly rest days, workdays at weekends, and streaks through rest days.
- **Readiness:** the Day 22 offer, a weekly offer from next Monday, the decline cooldown, time and baseline limits,
  and "too hard".
- **Insights and charts:** the numbers against hand-computed saved days; weekly tallies adding up to the overall
  consistency; finished, current, unrecorded and empty weeks; heatmap dates and day states; the habit breakdown;
  records (no minutes); empty states.
- **The program and its saves:** one at a time (no second program); start, run and end; a restart keeps progress,
  counters, details, pending changes and the Screen Time check; yesterday correctable only until noon; an older
  pilot save loads with its tracking data; damaged saves dropped; the appearance saved apart and kept across
  restarts and an ended program.
- **The app:** exactly its ten routes; where it opens; the three tabs and the pager's gesture rules; Settings (no
  restart, reminder or V1 developer tools); no earlier-program, switching or test wording anywhere a person reads;
  no developer clock outside development builds.

**Browser** (internal and production web exports, iPhone-sized; both builds behave the same):

- **A new install:** opens on the start screen → set-up (11 habits, none retired) → Habits, Journey and Insights
  with its charts; set-up interrupted midway saves nothing and starts again; set-up reopened sends you home, with
  no second program; a restart keeps the program; with no program, Habits sends you to the start screen.
- **Saves:** an old V1 save on the phone is ignored and left byte-for-byte as it was; an older pilot save with the
  switching fields opens as the program; the appearance saves on its own key.
- **Settings:** Your program (day, End the Life Reset), Appearance, Your data, About; nothing else.
- **Removing and your own habits:** Daily Movement removed from its details (gone from Habits, its days kept, offered
  again in Add a habit); "Stretch, 10 minutes after work, 3 days a week" created with its card preview, shown on Habits
  in dark and light with its own part of the panorama, swiped done, listed in Insights, and kept after a restart.
- **Adding a habit** to a five-habit program: six offered (none already in it), only its two questions asked, it
  joins from today with earlier days untouched, shows on Habits and Insights, and "Add a habit" goes at six.
- **Unchanged:** three-tab swipes both ways, card-swipe priority, 30 quick swipes, the theme switch, light and
  dark cards for all 11 habits, and the Insights charts.

## Limitations and open questions

1. **Ceremonies:** none for the Life Reset yet (Day 1/7/21/44/66), as asked.
2. **Reminders:** none (the earlier program's reminders were removed with it).
3. **Workdays:** Get It Done uses Monday to Friday; choosing workdays isn't offered yet.
4. **Social Confidence:** the card suggests one step a day, and any step from the list counts, but there's no "swap
   to another suggestion" button.
5. **Less Scrolling:** uses the main-app minutes given at setup as the baseline. The weekly Screen Time check is
   recorded but doesn't move the limit.
6. **Theme switch:** still re-renders all three mounted pages (see Performance).
7. **Tab swiping:** moved to the UI thread in a browser-tested build; it still needs the iPhone test above.
8. **The weekly "not achieved" rule:** a week counts as recorded when any habit was recorded, so an untouched weekly
   habit can be offered a step easier (an offer only).
