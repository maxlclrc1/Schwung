# Beyond the Summit — plan

Status: **implemented** (on `4d45409`). Where the build differs from the design below:

- `after.since` is a program **day number** (67, or the day of a later choice), not a date key.
- While undecided, reminders simply rest (no "summit view is waiting" reminder).
- A New Ascent opens from Day 67: the summit day itself still belongs to the first ascent.
- A Life Reset ended after the summit can be kept in Past journeys with no program running; a later set-up then
  carries lifetime XP and the collection (not the streak).
- Insights adds a "Lately · the last four weeks" panel; its charts remain the 66-day climb's.

Code: `core/reset/pilot.ts` (endDay, keepMomentum, beginAscent, lifetimeXp, sinceSummit), `store/journeys.ts`,
`store/ascent.ts`, `store/commit.ts`, `components/beyond/`. Tests: `core/__tests__/beyondSummit.test.ts`,
`store/__tests__/ascent.test.ts`.

What happens after Day 66. The 66-day Life Reset stays exactly as it is: its Journey, the summit ceremony and the
66-Day Story. After the summit the person chooses one of two continuations:

1. **Keep My Momentum:** the same habits continue indefinitely. No new set-up, nothing reset.
2. **Begin a New Ascent:** a fresh 66-day Life Reset. The previous journey and its story are kept.

## Where things stand today

- After Day 66 the program is effectively frozen. `inProgram` in `core/reset/pilot.ts` refuses tracking past
  `PROGRAM_DAYS`, offers stop (`offersNow`), and screens show "Summit reached" or "Your targets stay where they are".
- **Existing gap:** reminders keep firing every day after Day 66 (`planReminders` has no end), although nothing can
  be ticked. This plan fixes it (step 1).
- Weekly scheduling already takes a horizon (`WeeklyContext.programDays`, `weekOf(…, programDays)`), so the engine
  can run past 66 days without a second engine.

## Principle: one engine, one horizon

The habit engine doesn't learn new rules. It learns **where the program ends**:

```ts
// core/reset/pilot.ts
export const endDay = (p: PilotProgram) => (p.after?.mode === 'momentum' ? Infinity : PROGRAM_DAYS);
```

Every hard `day <= PROGRAM_DAYS` cap that is about tracking reads `endDay(p)` instead: `inProgram`, `journeyStats`,
`programWeeks`/`weekOf` (given a finite horizon such as today + 7, never Infinity), the weekly context
(`ctxOf`), and today's list. Caps that are about **the 66-day ascent itself** stay at 66: the mountain and trail
(`DAY_POINTS`), phases, milestones, the summit ceremony, `storyFacts`, reflections (`REFLECTION_WEEKS`) and level
offers.

A "New Ascent" is not a new kind of program: it's an ordinary new `PilotProgram`, created by the existing
`createPilot`, with the finished one archived beside it.

## Data model (smallest change)

```ts
type PilotProgram = {
  // …unchanged…
  /** Set when the person chose Keep My Momentum (the day they chose it, a date key). */
  after?: { mode: 'momentum'; since: string };
  /** Carried from earlier ascents: what belongs to the person, not to one climb. */
  carry?: { ascent: number; xp: number; streak: number };
};

/** Finished ascents, kept as they were (new key `schwung-journeys`, a list, appended to, never rewritten). */
type ArchivedJourney = { v: 1; id: string; archivedAt: string; program: PilotProgram };
```

- **Save version** `RESET_PILOT_VERSION` 1 → 2. The migration is the identity (the new fields are optional). The bump
  protects users: an older Schwung that meets a v2 save keeps it on the recovery screen instead of misreading
  momentum days (the Phase 2A rule).
- **Journeys** use their own store and key, with the same guarded storage as the program: an unreadable archive is
  kept in a recovery slot, never dropped (`store/recovery.ts`). Each archived program is checked with
  `inspectPilotProgram`.
- The full archived program is kept, not a summary, so the existing Journey and Story components can show it
  read-only with no new rendering code.

## 1. Keep My Momentum

| Area                                    | Recommendation                                                                                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Daily and weekly habits**             | Continue on their current schedules. Weekly habits keep counting by 7-day weeks from `startedAt`; rest days stay neutral.                                                                                               |
| **Targets**                             | Stay at the level reached at the summit (the current behaviour). Automatic level offers stay off (`offersNow`). Easier/harder by hand and add/remove habits keep working, within the 30-habit cap.                      |
| **Day number**                          | Continues (Day 67, 68…). The header reads "Day 81 · Momentum" instead of "Day 81 of 66".                                                                                                                                |
| **XP**                                  | The same rules (`XP_PER_HABIT`, full-day bonus). Derived from the logs as today.                                                                                                                                        |
| **Collectibles**                        | The seven unlock by lifetime XP as now. No new objects in v1, since that needs new art; the last title ("Summit Keeper") remains.                                                                                       |
| **Streak**                              | Continues straight through Day 66 → 67: same program, same rule (`pilotStreak`).                                                                                                                                        |
| **Journey tab**                         | The finished mountain stays as it is. Below it, a "Since the summit" section built from existing parts: momentum days counted, current and best streak, and the Insights heatmap for the days after 66. No new artwork. |
| **Insights**                            | The charts show a rolling **last 66 days** window (the same chart sizes), plus totals for the whole Life Reset.                                                                                                         |
| **Reflections, milestones, ceremonies** | None after the summit in v1 (keeps it quiet; avoids new rules).                                                                                                                                                         |
| **Reminders**                           | Continue as set, with the momentum text (not "Day N of your Life Reset").                                                                                                                                               |
| **66-Day Story**                        | Unchanged: it always covers days 1–66.                                                                                                                                                                                  |

## 2. Begin a New Ascent

1. **Archive:** the finished program (including any momentum days) is appended to `schwung-journeys`.
2. **Short set-up:** the person confirms their **age band and health precautions** (they may have changed, and both
   drive safety rules), then picks habits. These are pre-filled with the previous ones, own habits included, at the
   intensity reached. The existing `setupProblems` checks still apply, so nothing unsafe is pre-filled.
3. **New program:** `createPilot` with today as Day 1, plus `carry`:
   - `ascent`: previous + 1, shown as "Ascent 2";
   - `xp`: the lifetime XP so far. **Lifetime XP** = `carry.xp + pilotXp(program)`; collectibles and titles follow
     lifetime XP, so nothing earned is lost. `collection.unlocked` is copied over;
   - `streak`: carried only if Day 1 is the day after the previous program's last counted day. Otherwise the new
     streak starts at 0. The best streak ever is shown from the archive.
4. **The Day 1 ceremony** plays as usual (unchanged), with "Ascent 2" in its line.

**Past journeys:** Journey tab → "Past journeys". Each opens read-only: its mountain, numbers and its 66-Day Story
(save and share as today). One can be removed after a confirmation.

**One atomic switch:** archiving and the new program are written in **one** `multiSet` (journeys + program) and
read back before the app switches. This reuses the commit pattern from `store/restore.ts`: flush pending saves,
write together, read back, then set state. A failure or a closed app leaves either the old state or the new one,
never an archive without the new program or the reverse.

## Proposed user flow

```
Day 66 completed ─▶ Summit ceremony (unchanged) ─▶ 66-Day Story (unchanged)
                                                        │
                                                        ▼
                                    "What’s next?"  (world backdrop, two cards)
                     ┌──────────────────────────────────┼─────────────────────────┐
                     ▼                                  ▼                         ▼
             Keep My Momentum                  Begin a New Ascent           Decide later
      "Your habits carry on. Day 67     "Your journey is kept. Confirm     A calm card on the
       starts tomorrow."                 a few answers, pick habits."       Habits tab until
                     │                                  │                   they choose
                     ▼                                  ▼
             Habits tab, Day 67…              Short set-up ─▶ Day 1 ceremony
                     │
                     └─ Settings → Life Reset → "Begin a New Ascent" (any time later)
```

- The choice also lives in **Settings → Life Reset** and stays reversible in one direction: Momentum → New Ascent
  at any time. A New Ascent never goes back.
- While **undecided** (Day 67+ with no choice): tracking stays paused as today; the Habits tab shows the choice
  card; reminders stop after one gentle "Your summit view is waiting" (fixing today's gap).

## Exports, backups and deletion

- **Export (schema version 2):** the current program plus `journeys` (each with the readable sections exports have
  today) and `saveVersion: 2`. "What's included" adds "Past journeys".
- **Restore:** reads schema 1 (no journeys) and schema 2. Restoring replaces the current program **and** past
  journeys together, all or nothing, after the existing warning, which then names both. The safety copy keeps both
  keys in recovery slots first. A v2 backup in an older Schwung is refused as "newer" (already the case).
- **Delete my data:** removes `schwung-journeys` too. It already removes every `schwung-` key; add a test.
- **End the Life Reset** (Settings): before the summit, unchanged (deletes it). After the summit, offer "Keep this
  journey" (archive, the default) or "Delete it", so a finished climb is never thrown away by accident.

## Main edge cases

- **Yesterday correction:** on Day 67 the person can still correct Day 66 until noon (`canEditYesterday`). Choosing
  a continuation mustn't block it; a New Ascent archives after that window or includes the correction.
- **Absence across the summit:** opening on Day 80 without having seen the summit: ceremony, then story, then the
  choice. Days 67–79 count as not tracked (the comeback welcome handles the gap).
- **Summit not completed** (Day 66 not full): the summit still arrives after Day 66 as today; the choice follows.
- **Momentum for years:** logs grow by about 200 bytes a day (~75 KB a year), well inside the 5 MB backup limit.
  Streak and XP are O(days); memoize per day if profiling shows a cost.
- **All seven collectibles unlocked:** nothing more to unlock in v1; the collection reads complete.
- **Age band at a new ascent:** a 16–17-year-old may now be 18+; the teen focus limit follows the new answer.
- **Clock or time-zone changes:** no new behaviour; day numbers come from date keys as today.
- **Removing a past journey:** confirmed and permanent, and it doesn't affect lifetime XP already carried (stated
  in the confirmation).
- **Recovery:** an unreadable journeys save is kept and shown on the recovery screen like a program save; the
  current program keeps working meanwhile.

## Implementation order (later)

1. `endDay`, momentum mode, the undecided state and the reminder fix (with tests for day 66/67 boundaries and weekly
   habits across the boundary).
2. The journeys store, New Ascent with its atomic switch, `carry` (tests: interrupted switch, carry rules).
3. Export schema 2 and restore of journeys (tests: v1 and v2 files, all-or-nothing).
4. The "What's next?" screen, the Habits-tab card, "Since the summit", Past journeys and the Settings entries.

No new dependencies, no new artwork, no second habit engine.
