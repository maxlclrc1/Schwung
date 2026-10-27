# Schwung — Life Reset Tracking Foundations

**Stage 3 of the Life Reset, refined in Stage 3B:** recording how a habit was done, with an optional timer, counter,
strength session log and weekly Screen Time measure. **Pure foundations, not used by the app.**

- **Unchanged:** cards, swipe, onboarding, XP, streaks, ceremonies, saves and production.
- **New code:**
  - `src/core/reset/timer.ts`: the timer state machine.
  - `src/core/reset/tracking.ts`: day records, counters, sessions, skips, undo, optional amounts.
  - `src/core/reset/measures.ts`: Less Scrolling's weekly self-reported measure.
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

Completion always comes from the person; nothing claims it was checked.

- **Quick completion** (`confirmDone`): the swipe. It's immediate and idempotent, needs no amount, and records
  `by: 'manual'`.
- **Assisted completion:**
  - **A ready timer**, confirmed with one tap (`confirmTimer`, the same as a swipe): `by: 'timer'`.
  - **A counter** the person taps up to its target: `by: 'counter'`.
  - **A logged session:** `by: 'session'`.

  A habit already completed stays completed; a timer's minutes are simply added.

- **Optional amount, later** (`recordAmount`): minutes or pages, entered any time before or after completing, or
  cleared. It never completes, undoes or creates a completion, and invalid values are ignored.

## Day status

| Status       | Meaning                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `completed`  | In `completed`                                                                                                                |
| `skipped`    | The person skipped it on purpose (`skip`; `unskip` reverses it). A completed habit can't be skipped; completing clears a skip |
| `incomplete` | The day has a record but the habit isn't done (it may have partial progress)                                                  |
| `unrecorded` | No record for that day. An undo or unskip of nothing never creates one                                                        |

**Skips** (approved rules, `SKIP_RULES`):

- **No completion credit:** an explicitly skipped due habit earns no credit toward a day's success, now or in future
  calculations. (XP and streaks read only `completed`, so they're unchanged.)
- **Readiness:** for future readiness calculations, `observation` and `tally` keep skips **separate** from ordinary
  misses. `doneShare` counts a skip as not done, so skipping can never raise a share or speed up a step-up. Unknown
  days are left out.
- **Not wired in:** no existing rule uses these yet.

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
- **Reaching the target makes it ready to confirm** (`ready`, with `readyAt`), **never completed**. Running a timer
  doesn't prove the habit was done (especially Daily Movement), so the person confirms with one tap or the swipe.
  Timer minutes, partial or complete, are kept as tracking information and award no XP by themselves.
- **App suspended or terminated** (`loadTimer`, `settle`): reopened the same program day, the time is there; past the
  target, the timer is ready (as of the moment it got there), waiting for confirmation.
- **Midnight** (the program's local calendar day):
  - **The boundary:** the local midnight ending the timer's day is computed when the timer is created
    (`localDayEnd`, the device's time zone at that moment) and stored as `dayEndsAt`.
  - **Effect:** a later time-zone change or a delayed reopening can't move it.
  - **A timer running at midnight:** credits time up to midnight to its starting day, stops there (`day-ended`),
    carries nothing into the next day, and completes nothing. It stays on that day's record for confirmation or
    correction when the person returns.
  - **Before then:** a target reached before midnight stays `ready`, however late the app reopens.
  - **Older saves:** a timer saved without a boundary can't place a stretch reopened on a later day, so that stretch
    isn't credited.
- **Forgotten timers:** a timer can never complete a habit by itself, so an abandoned one creates nothing.
  - **The flag:** a ready timer left unconfirmed for longer than its habit's grace period (`needsCheck`) is flagged,
    so a future UI asks "did you finish?" rather than assuming.
  - **Configurable grace periods** (`TIMER_GRACE_MIN`):

    | Habit                                    | Grace                              |
    | ---------------------------------------- | ---------------------------------- |
    | Focus Time, Read Daily, Practice a Skill | 120 min                            |
    | Tidy Up                                  | 60 min                             |
    | Daily Movement                           | 30 min (it proves least)           |
    | Other                                    | 60 min (`DEFAULT_TIMER_GRACE_MIN`) |

  - **Nothing discarded:** time spent in the background is valid and never thrown away. A timer can't count past its
    target, and midnight stops it.
- **Clock moved backwards:** a negative stretch counts as zero.
- **No duplicates:** saving a timer again (another tab, another reopen) never completes anything, and confirming twice
  changes nothing.
- **Blocks:**
  - **16–17:** a 90-minute target is always two 45-minute blocks (the focus cap).
  - **Adults:** they can choose the split.
  - **Between blocks** the timer waits (`between-blocks`) for the person to start the next one. It's ready to confirm
    after the last block.

## Counters (Get It Done, Stay Connected)

- **Basics:** increment, decrement, or set; never below zero; no task or contact names. Progress
  (`countProgress`) is shown apart from completion.
- **Reaching the target** completes the habit (once).
- **Going back under it** undoes a completion **the counter** made, as a correction. A completion the person
  confirmed by swiping is never undone by the counter.
- **Undo of a counter's completion** removes the completion and sets the count to **one below the target it completed
  at** (`countTarget`). One new, intentional tap completes it again, without a second celebration (`first: false`)
  or extra XP.
- **Undo of a swiped completion** leaves the count as it was.

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

## Less Scrolling's weekly measure (`measures.ts`)

- **What it stores:** an optional weekly record of the person's own Screen Time reading: their daily average for the
  main app or category (`minutesPerDay`, optional `category`).
- **Which week:** stored under the program week from `weekOf` (Monday to Sunday, Week 1 contains Day 1).
- **Always self-reported:** `source: 'self-reported'`; Schwung never checks it.
- **Editable:** recording it again replaces it and counts the edit; `clearWeekly` removes it. Invalid values change
  nothing.
- **Separate records:** never stored in day logs, so it can't change any completed day, XP, streak or weekly goal
  (tested).
- **Missing weeks:** simply absent, with no penalty. Damaged entries read as missing.
- **Persistence:** where the measures are saved in the program state is decided at integration; the type is
  optional.

## Decisions applied in Stage 3B (2026-10-27)

| Decision                                                                                                                                        | Applied                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Skipping: completed, skipped and unrecorded stay distinct; no completion credit for a skip; skips kept apart for readiness without inflating it | `SKIP_RULES`, `observation`, `tally`, `doneShare` (not wired into any rule) |
| A timer at its target is ready to confirm, never complete                                                                                       | `ready` status; `saveTimer` never completes; `confirmTimer`                 |
| Midnight: credit up to the local midnight, stop, nothing carried over, kept for confirmation                                                    | `dayEndsAt`, `day-ended`                                                    |
| Forgotten timers: no automatic completion; configurable check                                                                                   | `needsCheck`, `TIMER_GRACE_MIN`                                             |
| Counter undo: back to one below the target, a new tap completes again, no repeat celebration                                                    | `countTarget`, `undoDone`                                                   |
| Optional manual amount, later                                                                                                                   | `recordAmount`                                                              |
| Weekly self-reported Less Scrolling measure                                                                                                     | `measures.ts`                                                               |

## Still open

1. **Timer cap for long sessions:** no single block is longer than 90 minutes, so no extra unattended-duration cap
   was needed beyond the target, midnight and the confirmation step. Revisit if longer targets are added.
2. **Grace periods:** the values above are first guesses to test with people.
3. **Where weekly measures are saved** (a new optional field in the saved program) is decided at integration.
4. **Skips in readiness:** decided in Stage 4 (`SCHWUNG_LIFE_RESET_PROGRESSION.md`): a skip is recorded, never
   done, and counts in both shares.
