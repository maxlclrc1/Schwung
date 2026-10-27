# Schwung — Life Reset Tracking Foundations

**Stage 3 of the Life Reset:** recording how a habit was done, with an optional timer, counter and strength session
log. **Pure foundations, not used by the app.**

- **Unchanged:** cards, swipe, onboarding, XP, streaks, ceremonies, saves and production.
- **New code:**
  - `src/core/reset/timer.ts`: the timer state machine.
  - `src/core/reset/tracking.ts`: day records, counters, sessions, skips, undo.
- **Types:** `DayLog.track` (optional) in `src/core/types.ts`.
- **Tests:** `src/core/__tests__/resetTracking.test.ts`.

## The rule that keeps it simple

**Whether a habit was done is only ever `log.completed`**, as for every existing habit. XP, the 80% rule, streaks,
ceremonies and the weekly scheduling all read that list and nothing else.

- **Tracking details** (minutes, a count, a timer, a session's type) live beside it in `log.track[habitId]` and never
  decide anything. That means:
  - no duplicate XP or completions, ever;
  - partial progress is never completion;
  - old saves, which have no `track`, read exactly as before.
- **Events:** every change returns the new logs and **at most one event**, only when completion actually changes
  (`completed` or `uncompleted`). `first` marks the day's first completion, so a future UI celebrates once a day
  however often a counter is corrected.

## Two ways to complete

- **Quick completion** (`confirmDone`): the swipe. It completes on the person's word and records `by: 'manual'`; it's
  idempotent. An optional amount (for example minutes) can be recorded. Nothing claims it was checked.
- **Assisted completion:** a timer that finishes (`by: 'timer'`), a counter that reaches its target
  (`by: 'counter'`), or a logged session (`by: 'session'`). A habit already completed by a swipe stays completed; the
  timer's minutes are simply added.

## Day status

| Status       | Meaning                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `completed`  | In `completed`                                                                                                                |
| `skipped`    | The person skipped it on purpose (`skip`; `unskip` reverses it). A completed habit can't be skipped; completing clears a skip |
| `incomplete` | The day has a record but the habit isn't done (it may have partial progress)                                                  |
| `unrecorded` | No record for that day. An undo or unskip of nothing never creates one                                                        |

Skipping is only recorded: it has **no effect on any rule yet** (see decisions below).

## Timers (Focus Time, Read Daily, Daily Movement, Tidy Up, Practice a Skill)

- **Scope:** only these five habits get a timer (`hasTimer`, from the catalog); `createTimer` returns `null` for any
  other.
- **Controls:** start, pause, resume and reset. Progress is active time over the target.
- **Two times:**
  - **Active time:** what the timer counted while running. Only this counts toward the target.
  - **Wall-clock time:** from the first start, pauses included.
- **No drift:** time is never counted by ticking. It's computed from saved timestamps (`runStartedAt`, banked time).
  The timer is saved in the day's record (`saveTimer`), so leaving the screen, switching tabs or reopening the app
  finds it exactly where it was.
- **Backgrounding:** a running timer keeps counting while the app is in the background, because the person is meant
  to be away (the phone in another room).
- **App suspended or terminated** (`loadTimer`, `settle`):
  - **Reopened on the same program day:** the time is there. If the target has passed, the timer finishes and
    completes the habit once, recording its minutes.
  - **Reopened on a later program day:** the timer **expires**. The stretch that was still running isn't counted,
    because nobody knows when it really stopped. Time banked by earlier pauses stays as that day's partial progress.
    Nothing completes.
- **Clock moved backwards:** a negative stretch counts as zero.
- **Limits:** a finished timer never counts past its target, and saving it again (another tab, another reopen) never
  completes twice.
- **Blocks:**
  - **16–17:** a 90-minute target is always two 45-minute blocks (the focus cap).
  - **Adults:** they can choose the split.
  - **Between blocks** the timer waits (`between-blocks`) for the person to start the next one. The habit completes
    after the last block.

## Counters (Get It Done, Stay Connected)

- **Basics:** increment, decrement, or set; never below zero; no task or contact names. Progress
  (`countProgress`) is shown apart from completion.
- **Reaching the target** completes the habit (once).
- **Going back under it** undoes a completion **the counter** made, as a correction. A completion the person
  confirmed by swiping is never undone by the counter.
- **Undo** keeps the count, so nothing the person did is lost.

## Strength Training sessions

- **What's recorded:** `logSession` records the session date (the day's record), an optional type (full body, upper,
  lower, other), an optional duration (1–600 min; other values are ignored) and completion.
- **One credited session a day:** logging again the same day only updates the details.
- **Corrections:** `editSession` changes a logged session's details; `undoSession` removes the session and its
  details.
- **Consecutive days** are allowed. `recoveryNote` only tells a future UI to show the gentle note.
- **Weekly quota:** sessions count toward the flexible weekly target (`weekly.ts`) through `completed`. Rest days
  stay unrecorded, never missed.
- **Nothing prescribed:** no exercises, sets, repetitions, weights or load increases. Eligibility (precautions,
  16–17 intensities) is unchanged in the catalog, and the held exercise programmes stay inactive.

## Persistence and compatibility

- **The field:** `DayLog.track` is optional, versioned (`v: 1`) and only ever added to.
  - **Loading:** the existing save loader keeps a log's extra fields, so tracking details survive a reload. Old logs
    load unchanged (tested through `sanitize`).
  - **Reading:** `readTrack` reads details defensively. A damaged value is ignored, never trusted, and can't affect
    completion because completion isn't stored there.
- **Dates:** records use the same local date keys as everything else (`dateForDay`), so they agree with the weekly
  scheduling and are unaffected by clock changes. Timer timestamps are epoch milliseconds, used only for durations.
- **Planned lists:** when a helper creates a day's record, the caller provides its planned list (the program's rules
  decide what's planned); an existing record's planned list is never changed.
- **Isolation:** no app code imports these modules. The only reference outside them is the type of the optional
  `track` field in `core/types.ts` (tested).

## Unresolved product decisions

1. **Skipped days:** should an explicit skip of a daily habit count differently from a plain miss? For example: not
   counted toward the 80% day rule, or not a miss for step-downs. Today it's only recorded.
2. **Timer completion without a swipe:** a finished timer completes the habit automatically. Should a future UI ask
   for a confirming tap instead, for example for Daily Movement, where the timer may run while the person isn't
   moving?
3. **Expired timers:** confirm that time running across midnight is dropped rather than credited to the start day.
4. **A timer left running** (the person forgets it) completes when reopened the same day after its target. Is a cap
   wanted, for example no automatic completion when reopened much later than the target?
5. **Counter undo:** after an undo, the count stays at or above the target, and only going under and back up
   completes again. Alternatively, an undo could lower the count to just under the target.
6. **Manual amounts:** should a swipe offer an optional "how many minutes?" (recorded, never required), or only the
   timer?
7. **Weekly Screen Time check for Less Scrolling** (approved as optional): where it's stored is decided with the
   weekly UI; nothing here records it yet.
