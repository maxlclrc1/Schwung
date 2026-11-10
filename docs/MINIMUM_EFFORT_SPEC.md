# Schwung: Minimum Effort specification (recovery phase R2)

**Status:** revised after owner review. Design only: **no production code has been changed.** It's ready to build
once the per-habit review in §3 is done.

**Approved at `ea0c86c`, with these decisions:**

- the on-screen label stays "Streak", and consistency is explained in the details;
- the Journey mark needs a visual preview before it's built;
- **the Sleep minimum is disabled** pending a further safety review;
- the existing 80% rule applies to full and minimum actions combined.

**R2a (engine) — implemented, not reachable in the app:**

- `core/reset/minimum.ts` holds the review gate and the versioned catalogue. The six minimums are approved (R2b).
- `HabitTrack.minimum` and `markMinimum` are in `tracking.ts`.
- `minimumFor`, `minimumOn`, `setMinimum`, `dayOutcome`, the XP rules, the statistics, `consistency` and
  `fullShare` are in `pilot.ts`.
- The save is version 3.
- The screens (R2b) are built, behind a launch switch that is off for normal users:
  `docs/MINIMUM_EFFORT_R2B.md`.

**Content and visual approval package:** `docs/MINIMUM_EFFORT_APPROVAL.md`, with real-app mockups in
`docs/minimum-effort/`. Approved at `d7652fc` (mark A, the seed).

**Sources:**

- `docs/RECOVERY_SYSTEM_PROPOSAL.md` and `docs/66_DAY_EXPERIENCE_AUDIT.md`;
- the engine on `main` (`tracking.ts`, `pilot.ts`, `progression.ts`, `readiness.ts`, `habits.ts`, `charts.ts`,
  `moments.ts`, `comeback.ts`, `store/resetPilot.ts`, `dataExport.ts`/`dataImport.ts`).

**Labels:** **[Engine]** means the code does this today. **[Spec]** means this design.

## 1. Agreed decisions

1. **Minimum Effort is a one-day fallback, not a fourth level.**
   - It never writes an era.
   - Levels, targets, set-up, offers and the card's level bars are unchanged.
   - Tomorrow asks for the real target again.
2. **It's worth 5 XP** (`PARTIAL_XP`).
   - It counts toward **consistency**.
   - It never counts as a **full completion** or toward **step-up readiness**.
3. **Partial progress stays separate.** It's never converted into a minimum automatically (§4.4).
4. **Less Scrolling and Strength Training are excluded** for now.
5. In Habit Details the minimum is **its own action**, next to "Partially completed". It doesn't replace it.
6. Habit cards show the minimum **only after it's used**.
7. The Journey gets a **distinct, subtle mark** for a day kept with the minimum.
8. Recovery check-ins and recovery weeks are **deferred**.
9. **Save schema v3**, with a backward-compatible migration and restore tests.
10. **Each minimum's target and safety is reviewed individually** before it's built.

## 2. One model: consistency versus completion

Schwung reports two separate things about a day. Minimum Effort adds to the first and never to the second.

| Measure                      | Question it answers            | What counts                                 |
| ---------------------------- | ------------------------------ | ------------------------------------------- |
| **Consistency** (showing up) | "Did I keep my habits going?"  | A full completion **or** a recorded minimum |
| **Completion** (the plan)    | "Did I do what my plan asked?" | Full completions only (`log.completed`)     |

### 2.1 Day outcomes

`dayResult` gets one new outcome. The 80% rule (`dayQualifies`, ⌈0.8 × n⌉ of the day's list) is unchanged; it's
applied first to completions alone, then to completions plus minimums.

| Outcome      | Rule                                                                                 | Consistency streak | Completed days | Full day (+20 XP) |
| ------------ | ------------------------------------------------------------------------------------ | ------------------ | -------------- | ----------------- |
| `rest`       | Nothing due (unchanged)                                                              | neutral            | —              | —                 |
| `counted`    | The 80% rule is met with **full completions** (exactly today's rule)                 | +1                 | +1             | only if all done  |
| `kept` (new) | Not counted, but the 80% rule is met when the day's **minimums** count as showing up | +1                 | —              | never             |
| `missed`     | Neither (unchanged, including a day with a list and no record)                       | breaks it          | —              | —                 |

- **The streak becomes the consistency streak.** `pilotStreak` counts `counted` and `kept` days. `rest` days are
  neutral, a `missed` day breaks it, and an unfinished today never breaks it (all unchanged).
- **Completed days** (`journeyStats.done`, the Journey total, Story and the summit numbers) count `counted` only, as
  now.
- **A full day** still needs every required habit in `completed`. A minimum never makes a day full.

### 2.2 Weekly habits

- **[Engine]** A weekly habit joins a day's list only on a day it's done, so a rest day never pulls a day down. Its
  goal is judged by the week (`weekSummary`). None of this changes.
- **[Spec]** No weekly-scheduled habit has a minimum in R2. This covers Get It Done, Practice a Skill, Stay
  Connected on its weekly levels, and Strength. So:
  - a minimum never touches a week's goal, its credited days, weekly readiness or Insights' weekly figures;
  - a daily habit's minimum can lift a day to `kept`, and a done weekly habit still helps the day as now.
- Minimum weeks are deferred, together with recovery weeks.

### 2.3 Missed days and absences

- `missed` is unchanged. A minimum can't rescue a day the person didn't record.
- Readiness still treats an unrecorded day as **unknown** (never evidence), and still returns "insufficient data"
  after an absence.
- **The welcome back's absence rule:** a recorded minimum is activity, so it ends an absence. Days the person wasn't
  there aren't affected.

### 2.4 Existing saves and history: nothing is re-scored

- A minimum can only exist on a day recorded after this ships. Old saves have none, so for them `kept` never
  occurs and the consistency streak is the existing streak. **Every number in every existing save and every archived
  journey stays identical:** XP, streak, longest streak, completed days, full days, Journey cells, Story, the summit,
  Insights and a streak carried into a New Ascent. A save-parity test proves this.
- **Recorded minimums are never re-judged later.** If a later catalogue review removes or changes a minimum, days
  already recorded keep their outcome. Counting reads the saved flag. It's checked only for impossibilities:
  - the habit wasn't in the program that day;
  - it wasn't daily that day;
  - it was completed that day.

  The current catalogue is never consulted, so no past `kept` day can disappear.

- Partial progress logged before (or after) this ships stays partial (§4.4), so no old day changes outcome.

### 2.5 Where each measure appears

| Surface                             | Consistency                                                                                                 | Completion                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Streak** (Today, Journey)         | The consistency streak                                                                                      | —                                                  |
| **Journey calendar**                | `kept` days get the new subtle mark (§5.3)                                                                  | `counted` and full days look exactly as now        |
| **Journey totals**                  | "{n} days kept with the minimum", shown only when n > 0                                                     | "Days completed" unchanged                         |
| **Story and summit**                | "Longest streak" is the consistency streak. One new line, "{n} days kept with the minimum", only when n > 0 | "Days completed" and "Best week" unchanged         |
| **Insights, per habit and overall** | "Consistency": the share of eligible days with a completion or a minimum                                    | A separate "Fully completed: {done} of {eligible}" |
| **Moments, welcome back**           | A minimum is activity, so "Seven days of showing up" is true for it                                         | —                                                  |
| **XP and level**                    | 5 per minimum                                                                                               | 10 per completion; +20 for a full day              |

- **Insights.** For a save without minimums, the consistency share and the full-completion share are the same
  number, so nothing changes for anyone today. Weekly habits' Insights are unaffected.
- **[Spec]** `habitTally` gains a `minimum` count. `consistency` becomes `(done + minimum) ÷ eligible`, and the full
  share stays available as before.
- **Recent and post-summit rates** (`recentDays80`, `sinceSummit`) count `kept` as kept, beside counted.

## 3. Minimums by habit (each one needs review before it's built)

A minimum is available on a day only when **all** of these hold:

- it's a catalogue habit;
- it's in the program and on a **daily** schedule that day;
- the day's target asks **strictly more** than the minimum;
- tracking is open (today, or yesterday before noon; not while the program waits for the after-66 choice, nor
  during an age pause);
- the habit isn't completed yet.

The habit's existing age and health gates already apply, and a minimum never adds an ask the target avoids. All
wording is a **draft**.

| Habit             | Draft minimum                                             | Where                                                                                       | Safety notes for review                                                                                                         | Reviewer                |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Read Daily        | "Read one page" (pages mode) / "2 minutes"                | Every level                                                                                 | —                                                                                                                               | Copy                    |
| Meditation        | "One quiet minute, any way you like"                      | Every level                                                                                 | No breathing technique prescribed. The "any practice counts" note stays                                                         | Copy                    |
| Daily Movement    | "2 minutes of movement you choose"                        | Every level                                                                                 | Inherits the walking, heart and pregnancy gates. Prescribes nothing                                                             | Copy, exercise reviewer |
| Time Outdoors     | "2 minutes outside, by choice"                            | Every level                                                                                 | The existing notes apply (errands don't count)                                                                                  | Copy                    |
| Sleep Routine     | "Up by {time}", with the window 30 min wider (90 at most) | Every level                                                                                 | **Only widens the window**: never earlier, never less sleep. Closed when the wake time varies. A sleep condition keeps its note | Copy, sleep reviewer    |
| Eat Well          | "Fruit or vegetables in one meal"                         | Standard and Challenge only (it _is_ the Starter target)                                    | Nothing to count, weigh or avoid. **Never water** (because of the fluid-limit precaution)                                       | Copy, nutrition review  |
| Stay Connected    | "One short message to someone you care about"             | Only daily levels asking for 2+ people or a call (Standard Momentum and Mastery, Challenge) | "Never a prompt to contact someone who harmed you" is shown with it                                                             | Copy                    |
| Less Scrolling    | **Excluded for now**                                      | —                                                                                           | "Not more than usual" isn't a smaller action                                                                                    | —                       |
| Strength Training | **Excluded for now**                                      | —                                                                                           | Schwung never prescribes shorter sessions, exercises or loads                                                                   | —                       |
| Get It Done       | None (weekly)                                             | —                                                                                           | Deferred to minimum weeks                                                                                                       | —                       |
| Practice a Skill  | None (weekly)                                             | —                                                                                           | Deferred to minimum weeks                                                                                                       | —                       |
| Own habits        | None in R2                                                | —                                                                                           | A minimum the person writes themselves comes later                                                                              | —                       |

**Coverage at Starter Foundation:** a minimum for 5 of its 7 daily habits (Read, Meditation, Movement, Outdoors,
Sleep). That includes all four of the audit's User A.

**Review gate:**

- Each row is built only after it's approved: wording, and the reviewer's safety sign-off.
- Rows still under review stay unavailable (`minimumFor` returns null).
- This uses the catalogue's existing `availability.beforeProduction` practice.

## 4. Recording, undo and upgrades

### 4.1 Data

- **New field:** `HabitTrack.minimum?: true`, on the day's existing `track[habitId]`. `readTrack` accepts only
  `true`.
- **Not stored:** the minimum's text, which comes from the catalogue.
- **Never added to `log.completed`.**

### 4.2 Actions

| Action                                   | Result                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "Did the minimum"                        | `minimum: true`, worth 5 XP. It clears a skip. Partial progress already logged is kept, and XP for that habit that day is still 5, not 10. No completion event or celebration; `haptic.select` only          |
| "Remove minimum"                         | The field goes, and so do the 5 XP (and `kept`, if it depended on it). Any partial progress is still there                                                                                                   |
| Full completion after a minimum          | Exactly today's completion: 10 XP, the full-day bonus if earned, the first-completion celebration. The minimum stays underneath, ignored while completed (as `progress` is), so the habit earns 10, never 15 |
| Undo that completion                     | Back to the minimum (5 XP), because that's still true                                                                                                                                                        |
| Skip after a minimum                     | The skip replaces it (they're mutually exclusive)                                                                                                                                                            |
| Removing the habit today after a minimum | It leaves from tomorrow, as for a completion, so today's record stays                                                                                                                                        |

### 4.3 Readiness

- There's a new observation, **`'minimum'`**: **recorded, not done**, and kept apart from misses (the `SKIP_RULES`
  pattern).
- **Step-up:** a minimum lowers the done share, so it never speeds up a step-up.
- **Struggling:** a minimum counts as not done. At Standard or Challenge, frequent minimums can lead to the existing
  easier _offer_, which is still the person's choice and follows the decline rules. At Starter Foundation nothing
  is offered, as today.

### 4.4 Partial progress stays separate

- "Partially completed", and minutes logged by the stepper or a timer, behave exactly as today: 5 XP, no day credit,
  and they never become a minimum by themselves.
- The person can record both on the same day: "Did the minimum" alongside their logged minutes. XP stays 5 for that
  habit.
- **Automatic conversion is not built.**
  - It would need demonstrable equivalence. The only candidate is a timed habit with a minutes-defined minimum and
    timer-measured active minutes ≥ the minimum (Read, Meditation, Movement).
  - Even then, partial minutes the person typed in are a rough note, not a measurement.
  - So any future conversion is a separate, explicit decision. It would apply only to new records, never to old
    ones.

## 5. Screens (existing ones only)

### 5.1 Habit Details (`PilotHabit.tsx`, the "Today" section)

- **The action:** a second `TextLink`, placed directly under "Partially completed": **"Did the minimum · Read one
  page"**. Once recorded, it reads "Remove minimum".
  - It uses the same `REVEAL`/`CONCEAL` crossfade.
  - It's shown only when a minimum is available.
- **State line:** "Minimum done."
- **Hint:** "The smallest version keeps your streak going. Your goal stays 10 min." It's shown once, where
  `progressHint` is today.

### 5.2 Habit card

- There's nothing new before use.
- After use, the existing secondary line (where "Partially completed" appears) reads **"Minimum done"**.
- A swipe is still the full completion.
- **VoiceOver:** "Read Daily, minimum done. Your goal is 10 minutes."

### 5.3 Journey

- **The mark:** a `kept` day gets a distinct, subtle mark. Design direction: the partial cell's tone with a fine
  ridge line, from the Weekly Reflection's shape language. It must work in light and dark, at small sizes, and never
  depend on colour alone. It's a design task for ChatGPT/owner; the exact look needs approval before R2b.
- **Day details** (`cellSummary`): one new sentence, "Kept with the minimum: {list}."

### 5.4 Other screens

- **Story:** the single line in §2.5.
- **Insights:** the full-completion figure beside consistency (§2.5).
- **Welcome back and the weekly reflection:** no change in R2. Suggestions belong with the deferred check-ins.

## 6. Save schema v3

- **Version and migration:** `RESET_PILOT_VERSION` 2 → 3, with `SAVE_MIGRATIONS[2]` as an identity step. Every v2
  program is a valid v3 program.
- **Why bump at all:** an older Schwung ignoring `minimum` would compute a different streak. With the bump, it sees
  a "newer" save and keeps it for recovery, rather than misreading it (the v1 → v2 precedent).
- **Export and restore:** the export's `saveVersion` is 3. Restoring a v0, v1 or v2 backup migrates it. A backup
  newer than the app is refused with `newerVersion`, as now.
- **Sanitising:** `sanitizePilotProgram` and `inspectPilotProgram` keep a valid `minimum` and drop a malformed one.
  Archived journeys (`journeys.ts`) carry the field untouched.

**Required tests:**

- the migration from v0, v1 and v2;
- restoring from v1, v2 and v3 backups;
- refusing a v4 backup and a v4 save (kept for recovery);
- round trips with minimums (save and load, export and import);
- malformed `minimum` values dropped;
- save parity: every existing fixture, and the audit's users A, B and C, give identical XP, streak, completed days,
  full days, Journey cells, Story, Insights and the carried streak.

## 7. Examples

These are hand-worked from §2. They become `scripts/audit` assertions.

### User A: 4 Starter habits

- **Days 8–13**, meditation dropped:
  - Today these days are `missed`, and the streak ends at 7.
  - With "One quiet minute" recorded on each of them, they're `kept`: the streak goes to 13, while completed days stay at 7.
- **Days 14–30:**
  - On days A covers both gaps with minimums: `kept`.
  - On other days: `missed`, as now.
  - Story: "Days completed: 7", plus "{n} days kept with the minimum".

### User B: back after 7 days

- **Day 12**, 2 of 3 done plus a Movement minimum: `kept`. The streak is 1 instead of a miss.
- **The weekly planned miss** (Days 13, 20, 27, …): with a minimum on the missed habit, `kept`, so the streak no
  longer restarts each week. Completed days stay at 50.
- **Readiness for Move:** a minimum is recorded-not-done, just as the missed day was before, so B's offers don't
  change.

### Weekly habits

- **Stay Connected at Starter** (1 person, 4 days a week): no minimum, and nothing changes.
- **Strength (User C):** excluded, and nothing changes.

### User C: control

- C never records a minimum, so every number is identical to today.

## 8. Deferred (not part of R2)

- Recovery check-ins.
- Recovery weeks, and minimum weeks for weekly habits.
- Return tiers.
- Own-habit minimums.
- Less Scrolling and Strength minimums.
- Automatic minutes-to-minimum conversion.
- Any change to the 80% rule itself (roadmap step 4).

## 9. Phases

Each phase ends with a review stop.

1. **Review:** per-habit wording and safety sign-off (§3), and the Journey mark design (§5.3).
2. **R2a, engine:**
   - the `minimum` field, `minimumFor` and the §4 actions;
   - `kept` and its consumers (streak, Journey cells, Story, Insights, moments, welcome back);
   - XP and the readiness observation;
   - save v3 and every test in §6, plus the audit simulation.
3. **R2b, screens:**
   - §5 placements and translations through the i18n workflow;
   - light and dark screenshots, including a Starter user;
   - real-device checks (motion, VoiceOver, Dynamic Type, right-to-left).

## 10. Open questions for approval

1. **The streak's label:** keep "Streak" and explain it in the details, or call it "Consistency streak" on screen?
2. **The Journey mark:** the ridge-line direction, or another subtle treatment.
3. **The Sleep minimum:** "window + 30 min, at most 90", pending the sleep reviewer.
