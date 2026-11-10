# Schwung: Minimum Effort specification (recovery phase R2)

**Status:** design for approval. **No production code has been changed.** Nothing here is approved for building until
the decisions in §12 are made.

**Sources of truth:** `docs/RECOVERY_SYSTEM_PROPOSAL.md` (§3, §7, §9), `docs/66_DAY_EXPERIENCE_AUDIT.md` (W2, W3, D2,
D3), and the engine on `main` at `d1a2bc4`:

- `core/reset/tracking.ts` (`HabitTrack`, `PARTIAL_XP`, `SKIP_RULES`, `observation`)
- `core/reset/pilot.ts` (`dayResult`, `dayFull`, `pilotXp`, `pilotStreak`, `journeyStats`, `habitTally`)
- `core/progression.ts` (`dayQualifies`, the 80% rule)
- `core/reset/readiness.ts` (`readiness`, `decide`)
- `core/reset/habits.ts` (the 11-habit catalogue)
- `core/reset/charts.ts`, `comeback.ts` and `moments.ts`
- `store/resetPilot.ts` (save version 2) and `core/dataExport.ts`/`dataImport.ts`

**Labels:**

- **[Engine]** is what the code does today.
- **[Proposal]** is a design recommendation.
- **[Decision]** is a choice the owner needs to make.
- **[Evidence]** is a research claim, with its strength stated.
- **[Estimate]** is hand-worked, not simulated.

---

## 1. What Minimum Effort is, and what it isn't

**It is a one-day fallback.** On a difficult day, the person can record that they did a small, predefined version of
a habit ("Read one page"). That day is recognised as showing up. Tomorrow the card asks for the real target again,
because nothing about the plan changed.

**It isn't a fourth level.** Specifically:

- **No level change.** It never writes an era (`ProgressionState.eras`). `levelOn`, `targetFor`, the card's level
  bars, set-up, Add a habit and step-up/step-down offers are untouched.
- **Not a state or a mode.** There's nothing to switch on or off and no "minimum week". A recovery week is R3, a
  separate decision.
- **Not a plan.** It's a record of what happened that day, made the same way as a completion: today, or yesterday
  while yesterday can still be edited (before noon).
- **Not partial progress.** Partial progress already exists (`track.progress`, 5 XP). How the two fit together is in
  §4.5.

**Its purpose is to protect continuity, not to lower the goal.** The card, the details and the reflection always
show the real target. The minimum is shown as "the smallest version", beside the target, never in its place.

---

## 2. Design constraints

These come from the agreed direction and the proposal's §2.

1. **The goal is kept.** No era is written, and the card's target text is unchanged.
2. **Autonomy.** Every minimum is the person's own record. Nothing is recorded, suggested or converted automatically
   from missing days.
3. **Unknown is never evidence.** A day without a record stays `unrecorded`. A minimum is a recorded day, never an
   inferred one.
4. **Honest numbers.** A minimum is recorded as a minimum. It's never shown or counted as a full target, and words
   follow what was recorded (the Step 2 "truthful moments" rule).
5. **Safety.**
   - A minimum exists only for a habit already in the program, so eligibility, age and health gates have already
     been applied.
   - It never asks for anything the full target avoids: an earlier wake time, an exercise prescription, a food rule,
     a contact prompt, a lower scrolling floor.
6. **Old saves are untouched.** A save without the new field computes identical XP, streak, Journey, Story and
   Insights. A save-parity test proves it.
7. **No redesign.** It uses existing screens, components, motion tokens (`reveal`, `conceal`, `reflow`) and copy
   patterns. Any new visual mark needs separate approval (§7.6).

---

## 3. A minimum for each habit

### 3.1 When a minimum is available

**[Proposal]** `minimumFor(p, id, day)` returns a minimum only when **all** of these hold:

| Condition                                                   | Why                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| A catalogue habit with a defined minimum (§3.2)             | The person's own habits have none in R2 (§3.4)                                      |
| In the program that day (`activeOn`; not in a `gaps` range) | A removed habit has no days                                                         |
| **Daily** schedule that day (`isDaily`)                     | Weekly goals already have slack built in; see §3.3                                  |
| The day's target asks **strictly more** than the minimum    | Otherwise the "minimum" is the target, and offering it would be cosmetic (cf. B2)   |
| Tracking is open that day                                   | Today, or yesterday before noon; never during `awaitingChoice` or an age pause      |
| Not already completed that day                              | A done habit needs no fallback. An existing minimum is kept underneath it, see §5.2 |

The "strictly more" check is per level, in the style of `sameTarget`. It's a pure comparison on catalogue numbers,
tested for every intensity × phase.

### 3.2 All 11 habits

Wording is a **draft** for ChatGPT and owner review (Decision 9). Card targets are from `habits.ts`.

| Habit                 | Schedule                                                   | Proposed minimum                                     | Available at                                                                                                             | Safety and design reasoning                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read Daily**        | daily                                                      | "Read one page" (pages mode) / "Read for 2 minutes"  | Every level (Starter Foundation: 10 min / 5 pages)                                                                       | No risk. Keeps the cue (book, place, time) in use.                                                                                                                                                                                                                                                                                                                |
| **Meditation**        | daily                                                      | "One quiet minute, any way you like"                 | Every level (Starter: 2 min)                                                                                             | It doesn't prescribe a breathing technique. Breath-focused instructions can be uncomfortable for some people (anxiety, breathing conditions). The habit's note stays: "any meditation you choose counts".                                                                                                                                                         |
| **Daily Movement**    | daily                                                      | "2 minutes of movement you choose"                   | Every level (Starter Foundation: 10 min)                                                                                 | It inherits the habit's gates (walking difficulty, heart, pregnancy). It prescribes nothing, and it's below any intensity concern. "Keep your own number" is unaffected.                                                                                                                                                                                          |
| **Time Outdoors**     | daily                                                      | "2 minutes outside, by choice"                       | Every level (Starter: 5 min)                                                                                             | The existing notes apply: chosen time, and errands don't count.                                                                                                                                                                                                                                                                                                   |
| **Sleep Routine**     | daily                                                      | "Up by {time}", with the window **30 minutes wider** | Every level. The window is 30 min wider, **90 min at most**: Starter Foundation 60 → 90; Challenge Mastery 15 → 45       | **Never earlier, never less sleep:** it only moves the latest "up by" later, so the anchor (the person's own wake time) never moves. Sleep is already closed when the wake time varies. A reported sleep condition keeps today's note, and no new inference is made. The minimum never mentions bedtimes or phones.                                               |
| **Eat Well**          | daily                                                      | "Fruit or vegetables in one meal"                    | **Standard and Challenge only.** At Starter it _is_ the target, so there's nothing smaller that's still meaningful       | No counting, weighing or foods to avoid. **Not** "a glass of water": a fluid limit is one of the set-up precautions, and Schwung can't know what's safe. One minimum for both levels keeps the wording simple.                                                                                                                                                    |
| **Less Scrolling**    | daily                                                      | "No more than your usual {baseline} today"           | Only where today's limit is below the person's baseline. Not where a low starting point was kept at the baseline         | It's _above_ the limit by definition, so the 30-min floor and the stated need can't be crossed. It's self-reported, as now. **Weakest fit of all:** it's "don't get worse", not a smaller action. See Decision 4.                                                                                                                                                 |
| **Stay Connected**    | weekly at Starter Foundation and Momentum; daily otherwise | "One short message to someone you care about"        | Only on **daily** levels asking more than one person or a call: Standard Momentum and Mastery, and every Challenge level | Not on the "1 person a day" levels, because there it equals the target. Not on the weekly levels (§3.3). The note **"Never a prompt to contact someone who harmed you"** is shown with the minimum too. Never a named contact.                                                                                                                                    |
| **Get It Done**       | workdays (weekly)                                          | **None in R2**                                       | —                                                                                                                        | It's a weekly goal ("N of your workdays"). Possible later: a "smallest step" (5 minutes on the #1 task) as a minimum _week_, R4.                                                                                                                                                                                                                                  |
| **Practice a Skill**  | weekly (4–5 days)                                          | **None in R2**                                       | —                                                                                                                        | Weekly slack already exists. Later: R4.                                                                                                                                                                                                                                                                                                                           |
| **Strength Training** | sessions                                                   | **None, recommended permanently**                    | —                                                                                                                        | Schwung never prescribes exercises, sets, loads or shorter sessions (`STRENGTH_RULES`). A "mini session" would be exactly that. The health gates and "stop and get medical help" stay. A later "1 session this week" during a recovery week would lower a frequency the person chose. That's a separate R3/R4 decision, and an exercise-professional review item. |

**Coverage:**

- **8 of 11 habits** have a daily minimum at some level: Read, Meditation, Movement, Outdoors, Sleep, Eat Well,
  Less Scrolling and Stay Connected.
- **6 of them** have one at **Starter Foundation**, where most people start: Read, Meditation, Movement, Outdoors,
  Sleep and Less Scrolling.
- That covers every habit of the audit's User A.

### 3.3 Why weekly habits are out of R2

**[Engine]** A weekly habit's day is never a miss (`WEEKLY_RULES.restDayIsMiss = false`). It joins the day's list
only on days it's done (`plannedOn`/`countsTowardDay`), and it's judged by the week (`weekSummary`).

A daily minimum doesn't fit that model. Every option for "a minimum on a weekly habit's day" breaks something:

- **It credits the week.** Then a goal of "4 days" can be met entirely by minimums. That's dishonest, and it changes
  `weekSummary`, readiness and Insights together.
- **It joins the day's list.** Then it can _pull a day down_ (a minimum isn't done). Weekly days are designed never
  to do that.
- **It does nothing.** Then it's ordinary partial progress, which already exists.

The coherent design is a **minimum week**: for example, "1 day this week" while the person chooses. That belongs with
the recovery week (R3/R4).

### 3.4 The person's own habits

There's none in R2. Later (R4), there could be an optional "smallest version" text the person writes for themselves.
Without that text the habit has no minimum. Schwung never invents one for a habit it doesn't know.

---

## 4. Counting rules

### 4.1 What the engine does today

- **What counts as done:** completion is only ever `log.completed`. Partial progress is worth 5 XP and never counts
  toward a day, the streak, a full day or a weekly goal.
- **Day rule:** `dayResult` uses the 80% rule over the day's list, and you need ⌈0.8 × n⌉ done:
  | Habits on the list | Needed |
  | ------------------ | ------ |
  | 1                  | 1      |
  | 2                  | 2      |
  | 3                  | 3      |
  | 4                  | 4      |
  | 5                  | 4      |
- **Streak:** counted days extend it, a rest day is neutral, a missed day breaks it (except today).
- **XP:** 10 per done habit + 5 per partial + 20 for a full day.
- **Readiness:** done / skipped / missed / unknown. Partial progress counts as missed, which means recorded and not
  done.
- **Insights consistency:** done ÷ eligible, full completions only.

### 4.2 The candidate models

These are applied to five concrete days. "Min" means a minimum was recorded, and a daily list of `n` habits is
assumed.

| Day                                           | **M0 Status quo** (minimum = partial) | **M1 Starting proposal** (minimum counts as done for the day rule) | **M2 Full credit** | **M3 Half credit** (D3a style) | **M4 Hold** (recommended)            |
| --------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | ------------------ | ------------------------------ | ------------------------------------ |
| S1: 4 habits, 3 done + 1 min                  | missed                                | counted                                                            | counted, full      | 3.5/4 = 88%: counted           | held                                 |
| S2: 4 habits, 2 done + 2 min                  | missed                                | counted                                                            | counted, full      | 3/4 = 75%: missed              | held                                 |
| S3: 4 habits, 4 min                           | missed                                | counted                                                            | counted, full      | 2/4: missed                    | held                                 |
| S4: 3 habits, 2 done + 1 min (B, Day 12)      | missed                                | counted                                                            | counted, full      | 2.5/3 = 83%: counted           | held                                 |
| S5: 1 habit, 1 min                            | missed                                | counted                                                            | counted, full      | 0.5: missed                    | held                                 |
| S6: 5 habits, 4 done + 1 min                  | counted (4/5 already)                 | counted                                                            | counted, full      | counted                        | counted (4/5 already)                |
| **The streak after a minimum day**            | breaks                                | +1                                                                 | +1                 | +1 or breaks                   | **unchanged**: neither +1 nor broken |
| **"Days completed" (Journey, Story, summit)** | unchanged                             | +1                                                                 | +1                 | +1 or 0                        | **unchanged**                        |
| **XP per minimum**                            | 5                                     | 5                                                                  | 10 + bonus         | 5                              | 5                                    |

- **Held** means the day met the 80% rule only by counting its minimums as done. The streak treats it like a rest
  day (neutral). The Journey shows it as a day with activity.
- **M2 is rejected.** It would count the smallest version as the whole plan. It's dishonest, it would let minimums
  inflate readiness into step-ups, and it would empty "full day" of meaning.
- **M0 doesn't do the job.** It's what exists today: B's first day back stays "missed".

### 4.3 How the models compare

| Criterion                                                  | M1 Counts                                                                                                                                                        | M3 Half credit                                                                              | M4 Hold                                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Recognises the smaller action                              | Strongly: the streak grows                                                                                                                                       | Partly: often not enough with 1–4 habits (S2, S3, S5 still missed)                          | Yes: the streak is protected, plus 5 XP, the day shows activity, and moments count it                                          |
| Prevents the all-or-nothing reset ("what-the-hell" effect) | Yes                                                                                                                                                              | Inconsistently: the person can't easily tell in advance whether a minimum will save the day | Yes, always, if every gap is covered by a minimum                                                                              |
| Honest 66-day numbers                                      | **Weakens them.** "Days completed", the longest streak, the Story and the summit start to mean "showed up". A run of all-minimum days (S3) is equal to full days | Mostly honest, but a half point is hard to explain                                          | **Keeps them.** A counted day still means the plan was met. Minimum days are reported as their own number                      |
| Pre-empts D3 (roadmap step 4, day counting)                | **Yes.** It changes what a counted day means before D3 is decided                                                                                                | **Yes.** It _is_ D3 option (a)                                                              | **No.** The 80% rule is unchanged. It only adds a neutral outcome, like rest days. D3 can later decide whether held days count |
| Resistance to drift (living at the minimum)                | Weak: there's no visible cost                                                                                                                                    | Medium                                                                                      | Good: the streak stops growing, which is a quiet signal and not a penalty                                                      |
| Engine change                                              | Small: `dayResult` counts minimums as done                                                                                                                       | Medium: fractional qualification, a new threshold rule                                      | Small: one new outcome, which `pilotStreak` and `journeyStats` treat like `rest`. It's an existing pattern                     |
| How easy to explain                                        | "The minimum counts as a day."                                                                                                                                   | "Each minimum counts as half."                                                              | "The minimum keeps your streak safe."                                                                                          |

### 4.4 Recommendation

**[Proposal] M4, Hold.** The minimum protects the streak, earns 5 XP and counts as showing up for the welcome back,
the moments and the Journey's activity. It doesn't add a "day completed" or lengthen the streak.

The starting proposal was M1 ("counts as showing up and toward consistency"). This spec recommends M4 for four
reasons:

1. **It keeps every reported number truthful.** Journey, Story and the summit report "days completed" and the
   longest streak. Under M1 those would silently change meaning for anyone who uses minimums, and the audit's main
   complaint (W3) is that these numbers already mislead.
2. **It doesn't decide D3 by the back door.** The owner hasn't decided how days should count. M4 leaves the 80% rule
   exactly as it is.
3. **It still delivers the point of the fallback.** A hard day no longer resets anything. B's first day back is no
   longer a miss, and A's fragile weeks stop producing zeros.
4. **It discourages drift without a cap.** Someone living at the minimum sees their streak stand still rather than
   grow. There are no limits, warnings or penalties.

**When M1 is better:** if the owner wants the minimum to feel like a full win, or prefers to settle D3 as "showed up
= counted". A switch from M4 to M1 later is a one-line rule change that re-scores held days upward. M1 to M4 would
take numbers away from people. **M4 is the safer one to start with.** (Decision 1.)

### 4.5 The rules in full (for M4)

| Area                                                                 | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Completion**                                                       | Unchanged: only `log.completed`. A minimum is never added to it.                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Day result**                                                       | `dayResult` returns `'counted'` if the 80% rule is met with full completions (today's rule, first). Otherwise `'held'` if it would be met by counting the day's minimums as done. Otherwise `'missed'`. `'rest'` is unchanged.                                                                                                                                                                                                                                            |
| **Streak** (`pilotStreak`)                                           | `'held'` is neutral, like `'rest'`. Today's unfinished day still never breaks it. A streak carried into a New Ascent is unaffected.                                                                                                                                                                                                                                                                                                                                       |
| **Full day** (+20 XP, "Day complete")                                | Never with a minimum: `requiredOn` must all be in `completed` (unchanged).                                                                                                                                                                                                                                                                                                                                                                                                |
| **XP**                                                               | **5 per minimum**, using `PARTIAL_XP` (no new constant). Not on top of partial progress for the same habit and day: at most 5 for that habit. Nothing for a minimum on a completed habit (the completion's 10 applies). Computed from the saved days, as now, so an undo takes it back and nothing is awarded twice. See Decision 2 for 10 XP.                                                                                                                            |
| **Journey and calendar** (`dayCell`)                                 | A held day shows as **`'partial'`** (activity). A day with only minimums and no completion shows `'partial'` too, not `'missed'`. Day details list them: "Read: minimum". There's no new mark unless approved (§7.6).                                                                                                                                                                                                                                                     |
| **Journey totals, Story, summit**                                    | `journeyStats.done` counts `'counted'` only, as now. Held days are a separate number where a screen has room for it: Story and Insights (§7.5).                                                                                                                                                                                                                                                                                                                           |
| **Recent and post-summit rates** (`recentDays80`, `sinceSummit`)     | Held days are judged and not counted (an honest denominator), and they're reported separately. The streak (`best`, `run`) treats them as neutral.                                                                                                                                                                                                                                                                                                                         |
| **Readiness**                                                        | There's a new observation kind, **`'minimum'`**. It's **recorded and not done**, exactly as `SKIP_RULES` treats skips, and kept separate from ordinary misses. **Step-up:** a minimum day lowers the done share, so minimums never speed up a step-up. **Struggling:** minimums count as not done. At Standard or Challenge, someone mostly on minimums may be offered an easier target, which is still their choice. At Starter Foundation nothing is offered, as today. |
| **Weekly goals**                                                     | Unaffected (minimums are daily-only in R2).                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Insights consistency** (`habitTally`, `overallTally`, `weekTally`) | Unchanged: full completions only. A habit's "minimum days" figure is added beside it.                                                                                                                                                                                                                                                                                                                                                                                     |
| **Moments** (`moments.ts` `activeOn`)                                | A minimum is activity. "Seven days of showing up" is true for someone who showed up with minimums.                                                                                                                                                                                                                                                                                                                                                                        |
| **Welcome back** (`comeback.ts`)                                     | A minimum is activity, so it ends an absence (it reads `dayCell`, which now says `'partial'`).                                                                                                                                                                                                                                                                                                                                                                            |
| **Reminders**                                                        | Unchanged. A day with minimums isn't complete, so the "skip a complete day" rule still sends the reminder.                                                                                                                                                                                                                                                                                                                                                                |
| **Collectibles and player level**                                    | Follow XP, as now.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### 4.6 Minimum and partial progress

**[Engine]** Partial progress already exists. It's "Partially completed" or minutes logged, worth 5 XP, and never
counts toward a day. If a minimum protects the streak and partial progress doesn't, someone who read 6 of 10
minutes would be worse off than someone who read one page. That's incoherent.

**[Proposal]** For habits that have a minimum that day:

- **Logged minutes at or above the minimum _are_ the minimum.**
  - When the person logs minutes (the existing stepper or a saved timer) and they reach the minimum's minutes, the
    record gets `minimum: true` as well.
  - Lowering them below it removes it.
  - This is the person's own record of what they did, not an inference. It only happens **on new writes**: old days
    with logged minutes are never re-scored (§5.1).
- **"Partially completed" without minutes** stays as it is: 5 XP, no day credit. The person hasn't said how much they
  did.
- **For habits without a minimum** (weekly habits, own habits, levels where the minimum would be the target),
  partial progress is exactly as today.

(Decision 3.)

---

## 5. Data, compatibility and edge cases

### 5.1 Data and the save

- **[Proposal]** `HabitTrack.minimum?: true`, on the day's existing `track[habitId]`.
  - `readTrack` accepts only `true`, so anything else is dropped, as for every field.
  - Nothing else is stored. The minimum's wording comes from the catalogue, and its availability from that day's
    level (eras are history, so this is reproducible).
- **Old saves:** no record has the field, so every number is identical. A **save-parity test** runs every existing
  fixture and the audit's users A, B and C through XP, streak, `journeyStats`, `dayCells`, `habitTally`, moments and
  Insights before and after, and requires them to be equal.
- **Save version 2 → 3, with an identity migration.**
  - The v1 → v2 precedent applies: an older Schwung that ignored `minimum` would compute a different streak and
    misread the save.
  - With the bump, an older build sees a "newer" save and keeps it for recovery instead.
  - Export (`saveVersion`) and restore carry it the same way. An older build refuses a v3 backup with "newerVersion".
- **`sanitizePilotProgram`** keeps the field and drops it when malformed. Round-trip tests cover it, as R1A's did.

### 5.2 Actions and how they combine

The action names (`setMinimum`, `clearMinimum`) are illustrative. They follow the existing `PilotChange` pattern: a
pure change and at most one event.

| Situation                                    | Result                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record the minimum                           | `minimum: true`. A skip is cleared, because a minimum is the opposite of skipping. Logged minutes are kept. No completion event, no celebration.                                                                                                                                          |
| Undo the minimum                             | The field is removed, and so are its 5 XP. The day goes back to what it was: partial progress if any was logged, otherwise not done.                                                                                                                                                      |
| **Upgrade:** full completion after a minimum | The completion behaves exactly as today: 10 XP, the full-day bonus if earned, and a first-completion celebration. `minimum` **stays underneath** but is ignored while completed, exactly as `progress` is today (`isPartial` requires "not completed"). There's no double XP: 10, not 15. |
| Undo that completion                         | The day goes back to the minimum (5 XP, held rules), because that's still true. This matches the counter undo, which goes back one step, and keeps the person's record.                                                                                                                   |
| Skip after a minimum                         | The skip replaces the minimum (they're mutually exclusive). An explicit, deliberate action.                                                                                                                                                                                               |
| Minimum, then more minutes logged            | Still the minimum until the person completes it. Reaching the target by minutes completes it (by `'progress'`), as now.                                                                                                                                                                   |
| Counter habits (Eat Well, Stay Connected)    | The minimum is its own tap. The counter's progress is unaffected. Reaching the counter target completes it as now.                                                                                                                                                                        |

### 5.3 Edge cases

| Case                                                                                           | Rule                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yesterday before noon**                                                                      | A minimum can be recorded or undone, like a completion. Readiness already treats that day as not final.                                                                                                               |
| **A change waiting for tomorrow** (step up or down)                                            | Today's minimum is judged against today's level. Tomorrow's level decides tomorrow's minimum.                                                                                                                         |
| **Level where the minimum equals the target** (Eat Well at Starter, Stay Connected at 1 a day) | No minimum is offered. The details don't mention one.                                                                                                                                                                 |
| **A mixed habit changing schedule** (Stay Connected moving from weekly to daily)               | Availability is per day by `isDaily`. A past minimum stays valid, because it was judged against that day's schedule.                                                                                                  |
| **Habit removed later** (`gaps`)                                                               | Its past minimums stay, as all its days do.                                                                                                                                                                           |
| **Habit removed today after a minimum**                                                        | Like a completion: it leaves from tomorrow (`removeHabit` already does this for a done habit, and should treat a minimum the same so today's record isn't orphaned).                                                  |
| **Day 66 and the summit**                                                                      | A minimum on Day 66 is activity. The summit doesn't depend on consistency (unchanged). Story numbers follow §4.5.                                                                                                     |
| **Awaiting the after-66 choice**                                                               | No tracking, so no minimum.                                                                                                                                                                                           |
| **Keep My Momentum**                                                                           | Same rules. `sinceSummit` reports held days separately.                                                                                                                                                               |
| **New Ascent**                                                                                 | `carriedStreak` uses `pilotStreak`, so a held last day carries the streak unchanged. The past journey keeps its minimums in Past journeys.                                                                            |
| **Age pause (16–17)**                                                                          | No tracking, so no minimum.                                                                                                                                                                                           |
| **Precautions added later**                                                                    | A minimum inherits the habit's gates. If the habit itself becomes ineligible, that's the existing `checkLevel` path. A minimum never makes an excluded habit available.                                               |
| **Time budget**                                                                                | A minimum is always below the target, so the busiest-day check is unaffected. It's never counted as freeing time.                                                                                                     |
| **Clock changes and travel**                                                                   | Same day-key rules as completion (`dateForDay`).                                                                                                                                                                      |
| **Catalogue wording changes later**                                                            | Past minimum days show the current wording. Only the fact is stored, not the text, which avoids storing translated strings.                                                                                           |
| **A malformed or edited backup** (`minimum: "yes"`, or on a weekly habit)                      | `readTrack` drops non-`true` values. A minimum on a day where none was available (weekly, removed, or equal to the target) is **ignored** in counting, never trusted. The rules read `minimumFor`, not just the flag. |

---

## 6. Keeping it temporary, without a cap

There's **no limit** on how often the minimum can be used. A cap would turn a kindness into a rule to fail. Instead:

- **M4 itself.** The streak holds but doesn't grow, so the full target stays the way forward.
- **Transparency.** Habit details show "Minimum on 5 of the last 14 days" in the existing recent-days row. Insights
  shows minimum days beside full ones.
- **Readiness**, unchanged. At Standard or Challenge, mostly-minimum days already lead to the existing, optional
  "easier" offer, one at a time, with the decline rules.
- **A gentle check-in (later, R2c, Decision 7).** The proposal's §3.5: at most once per 14 days per habit, after the
  minimum on at least 8 of the last 14 recorded days. It offers:
  - "Keep my goal";
  - "Make it easier", only where real;
  - "Focus on fewer habits" (R1A's flow);
  - "Not now".

  It never acts by itself. It's **not** in the first build: R2a/R2b should first show how people actually use the
  minimum.

---

## 7. UX integration (existing screens only)

Every placement below reuses an existing component and motion token. Nothing is added to the card's layout, and
there's no new screen.

### 7.1 Habit details (`PilotHabit.tsx`, "Today" section)

- **[Engine]** Under "Mark as done" there's a single `TextLink`: "Partially completed" / "Remove partial completion".
  It crossfades with `REVEAL` and `CONCEAL`.
- **[Proposal]** For a habit with a minimum available, that same link slot reads
  **"Did the minimum · Read one page"** (and "Remove minimum" once recorded), with the same crossfade. Without a
  minimum it stays exactly as today.
- The state line (`styles.stateText`) reads **"Minimum done."**. The hint line (where `progressHint` is today) reads:
  "The smallest version counts as showing up. It keeps your streak safe; your goal stays {target}."
- Partial minutes keep their stepper. Reaching the minimum's minutes sets the minimum (§4.6), and the state line says
  so.
- **[Decision 5]** Should the minimum replace "Partially completed" in that slot, as recommended (one quiet action,
  no new row)? Or sit as a second link beneath it? The second is clearer for timed habits, but adds a row to an
  approved screen.

### 7.2 Habit card (`HabitCard.tsx`)

- **No new control.** A swipe is still the full completion. Long-press still opens the details.
- The card's existing secondary line (where `partialText` shows "Partially completed") shows **"Minimum done"**.
- The card never shows the minimum before it's used, so the target stays the only ask (Decision 6).
- The card's done look isn't used for a minimum.

### 7.3 Welcome back (`WelcomeBack.tsx`)

The Step 2 fix removed "one small step today is plenty" because the day rule made it untrue. With M4 it becomes true,
so one line can return, truthfully: **"If today's a hard day, the minimum keeps your streak safe."** It has no
button and records nothing. R3 owns the "Start with the minimum" choices.

### 7.4 Weekly reflection ("Harder than expected", R1A)

- There's no fourth row; the R1A design stays.
- Inside the **Keep my plan** panel, one sentence is added after `keepNote`: "On hard days, the minimum counts as
  showing up. You'll find it in each habit's details."
- It's shown only when at least one habit has a minimum.

### 7.5 Insights, Journey and Story

- **Insights**, per habit: "{n} minimum days", beside the existing consistency figure, in caption style. Overall:
  the same.
- **Journey day details** (`cellSummary`): the existing `partial` sentence gains "{list} at the minimum" when there
  are any.
- **Story:** "Days completed" is unchanged. One line is added: "{n} more days you kept going with the minimum", shown
  only when n > 0.

### 7.6 Visual marks needing approval

The default is to use the existing `'partial'` cell look for held days. A distinct mark is a design task for
ChatGPT/owner. One option: the partial cell with a fine ridge line, in the Weekly Reflection's shape language.
(Decision 8.)

### 7.7 Accessibility and motion

- VoiceOver labels follow the existing pattern: "Read Daily, minimum done. Your goal is 10 minutes."
- The state line keeps its `accessibilityLiveRegion="polite"`.
- No new haptic. A minimum uses `haptic.select` (like partial), never the completion haptic, because it isn't a
  completion.
- Reduce Motion is respected through the shared tokens.

---

## 8. Examples

All examples are **[Estimate]**, hand-worked against §4.5. They become `scripts/audit` assertions in R2a.

### 8.1 User A: four Starter habits, fading (Read, Meditation, Movement, Sleep)

**Days 8–13** (meditation dropped, the other three done)

- Today: 3 of 4 = **missed** every day; the streak ends at 7.
- With minimums: A records "One quiet minute" on the days it happens. Say 4 of the 6 days.
  - Those 4 days are **held**: the streak stays at 7, and +5 XP each.
  - The other 2 are missed, as now.

**Days 14–30** ("two habits on two days in three")

- Today: every day missed, 0 counted.
- With minimums, on days A also records the other two habits' minimums:
  - those days are held, and they show activity on the Journey;
  - the streak survives where every gap was covered.
- The Journey says "partly done" instead of "missed", and Story adds "{n} more days you kept going".
- **What A sees differently:** fewer zeros, and a streak that isn't destroyed by one hard day.
- **What stays honest:** "days completed" doesn't rise on minimum days.

**Day 15** (reflection "harder")

- R1A offers Fewer habits and Keep my plan. The Keep panel now mentions the minimum.

**Readiness**

- At Starter nothing is offered, as today. A's minimums can't push anything down (there's nowhere to go) or up.

**Drift**

- If A lives on minimums for weeks, the streak stands still and details say "Minimum on 11 of the last 14 days".
- The later check-in (R2c) may offer "Focus on fewer habits".

### 8.2 User B: back after seven days away (Read Starter, Move Standard, Sleep Starter)

**Day 12** (2 of 3 done)

- Today: **missed**, streak 0.
- With a minimum ("2 minutes of movement you choose" for Move): **held**. Not a miss: the first day back isn't a
  failure.
  - The streak is 0 → 0, because the absence (unrecorded days) already broke it. It starts growing on the next full
    day.
  - +5 XP.
  - The welcome back's line ("the minimum keeps your streak safe") is true.

**Days 13, 20, 27 …** (B's weekly planned miss)

- Today: each one is missed and resets the streak, which is why B's longest streak is 6.
- With a minimum on the missed habit, those days are held, so the streak **survives** them. From Day 14 on it would
  grow across the weeks instead of restarting every week.
- Days completed stay at 50 of 66, which is honest. Story adds the held days as their own number.

**Readiness for Move at Standard**

- A weekly minimum day is a recorded "not done", 1 in 7, about 86% done. That's still "ready" (≥80%), so step-ups are
  offered as today.
- Minimum days don't change B's offers materially.

### 8.3 Weekly habits

**Stay Connected at Starter Foundation** ("1 person, 4 days a week")

- There's no daily minimum: a day without it is never a miss, and the week has three spare days.
- In Habit details nothing changes. The details don't show a minimum line on weekly levels.

**Stay Connected at Standard Mastery** ("2 people a day, one of them a call")

- Daily, so the minimum "One short message to someone you care about" is available, with the "never someone who
  harmed you" note.

**Strength Training** (C, Challenge)

- There's never a minimum, and C sees nothing new. No prescription of a shorter session.

**Get It Done and Practice a Skill**

- Unchanged in R2. Minimum weeks are an R3/R4 decision.

### 8.4 Returning after a long absence (21+ days)

- R2 doesn't add return tiers (that's R3).
- On return, the welcome back shows its usual words plus the minimum line. A single minimum that day is activity and
  holds the day.
- Readiness is unchanged: the absence was unknown, and the minimums are recorded-not-done.
- At Standard, a week of minimums after return could produce an easier offer. **R3 should hold readiness evidence
  until a week after a return**, per the proposal's §4.2. This spec flags it as a dependency.

### 8.5 User C: control

- C completes every habit, so `minimum` is never set.
- **Every number is identical** to today. That becomes a test assertion.

---

## 9. Scientific rationale

Evidence strength is stated honestly. Popular-book ideas are labelled as such and aren't presented as research
findings. Citations must be re-verified before any in-app or store copy quotes them.

| Claim                                                                                         | Source and strength                                                                                                                                             | What it supports here                                                                                               |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| A single missed opportunity didn't materially affect the growth of automaticity               | Lally et al., 2010, _European Journal of Social Psychology_. One study, 96 participants, self-reported automaticity. **Moderate.** It's the program's own basis | Not resetting anything on one hard day (M4's "hold")                                                                |
| Habits form through repetition of a behaviour in a stable context                             | Wood & Neal (2007) and later reviews; Lally et al. **Well supported** as a mechanism                                                                            | A tiny version still repeats the cue → behaviour link. The size of a single repetition matters less than keeping it |
| After a lapse, people often abandon a goal entirely ("abstinence violation", "what-the-hell") | Marlatt & Gordon (relapse prevention); Polivy & Herman, and Cochran & Tesser, on dieting. **Moderate**, from specific domains                                   | A fallback that turns a lapse into a smaller success, instead of a failed day                                       |
| Goals with a little built-in slack can improve persistence after setbacks                     | Sharif & Shu: "emergency reserves" (_Journal of Marketing Research_, 2017; _OBHDP_, 2021). **Promising, few studies**                                           | A fallback that exists without lowering the standard                                                                |
| Range goals ("1 to 3") can support re-engagement compared with a single number                | Scott & Nowlis, 2013, _Journal of Consumer Research_. **Promising, limited**                                                                                    | Showing the minimum and the target together: "the smallest version · your goal"                                     |
| Mastery experiences build self-efficacy                                                       | Bandura (1977 onwards). **Well supported** in general                                                                                                           | Small, completed actions on hard days protect confidence better than a visible demotion                             |
| Specific, challenging goals usually beat easy ones for performance                            | Locke & Latham's goal-setting theory. **Well supported**                                                                                                        | **The counter-argument:** don't make the minimum the goal. Hence "the goal is kept" and M4's no-growth streak       |
| Rewards that feel controlling can weaken intrinsic interest                                   | Deci, Koestner & Ryan, 1999 meta-analysis. **Well supported**, with nuance                                                                                      | A modest 5 XP and calm wording, with no badges or streak pressure for minimums                                      |
| "Shrink the habit on hard days" / "never miss twice"                                          | Fogg, _Tiny Habits_ (2019); Clear, _Atomic Habits_ (2018). **Practitioner books, not trials**                                                                   | The product idea. It's consistent with the evidence above, but not evidence itself                                  |

**What the evidence doesn't say:**

- There's no good evidence for any specific minimum size ("2 minutes").
- Nothing establishes that tiny repetitions build automaticity as fast as full ones.
- The 8-of-14 check-in threshold has no evidence behind it.

These are product judgements to test with people, not research findings.

---

## 10. Risks and mitigations

| Risk                                                     | Mitigation                                                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The minimum quietly becomes the goal                     | M4's streak doesn't grow, the goal is always shown beside it, transparency lines, readiness, and the later check-in                                         |
| It feels like a consolation prize, or condescending      | Wording reviewed with ChatGPT. Never "only" or "just". The minimum is framed as continuity: "keeps your streak safe"                                        |
| Confusion with partial progress                          | One link slot (§7.1). Minutes at or above the minimum count as the minimum (§4.6). Clear state words                                                        |
| Number drift on existing programs                        | No re-scoring. The parity test. Save v3                                                                                                                     |
| Gaming: "minimum" recorded while doing nothing           | It's self-reported, like every completion (Schwung already trusts a swipe). Low stakes: 5 XP, no growth                                                     |
| Safety: a minimum asking something the target avoids     | Per-habit table (§3.2) and the review gate (`availability.beforeProduction`). Sleep only widens. No water, no exercise prescription, no contact prompts     |
| Readiness pushes Standard users down because of minimums | Only an _offer_, with the decline rules, at most one at a time. That's the existing behaviour for partial or missed days. R3 holds readiness after a return |
| Translations: 20 languages × about 25 strings            | The existing i18n workflow, marked as machine translations awaiting review                                                                                  |
| D3 is later decided differently                          | M4 is the most compatible starting point. Held days can be re-counted upward by D3 without taking anything away                                             |

---

## 11. Implementation phases

Each phase is one focused task, ending with a review stop. Every phase runs the full suite, typecheck, lint, the
i18n check, the audit simulation (A, B, C) and the save-parity test.

| Phase                              | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                     | UI                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **R2a: engine**                    | `minimum` in `HabitTrack`/`readTrack`. Catalogue minimums and `minimumFor` (with the "strictly more" rule for every intensity × phase). The actions and combinations of §5.2. `dayResult` `'held'` and its consumers (`pilotStreak`, `journeyStats`, `recentDays80`, `sinceSummit`, `dayCell`, `moments`, `comeback`). XP. The `'minimum'` readiness observation. Save v3 with its migration, export and restore. Tests, parity and the audit simulation. | None (engine only)                           |
| **R2b: existing screens**          | Habit details link and state line (§7.1). Card secondary line. Welcome back line. Reflection Keep note. Insights, Journey details and Story lines. Translations. Light/dark and Starter screenshots.                                                                                                                                                                                                                                                      | Yes: placements in §7, each needing approval |
| **R2c: transparency and check-in** | The "Minimum on n of 14" line, the check-in offer (if Decision 7 says yes), and decline handling.                                                                                                                                                                                                                                                                                                                                                         | Small                                        |
| **Later (R3/R4)**                  | Minimum weeks for weekly habits, own-habit minimums, the recovery week, return tiers and readiness hold after a return.                                                                                                                                                                                                                                                                                                                                   | —                                            |

The R2a tests should include:

- every scenario in §8;
- the §4.2 table, as assertions;
- every edge case in §5.3;
- "no minimum where it equals the target", for each habit and level;
- "an ignored minimum on a weekly or removed day";
- upgrade and undo round trips (XP exact);
- the v2 → v3 migration and an older build refusing v3;
- C unchanged.

---

## 12. Decisions needed before building

1. **Counting model.** M4 "Hold" (recommended): the streak is protected but doesn't grow, and days completed are
   unchanged. Or M1 "Counts", the starting proposal: the streak grows and the day counts. (M2 is rejected. M3 belongs
   to D3.)
2. **XP for a minimum:** 5 (recommended, `PARTIAL_XP`, no new constant) or 10.
3. **Logged minutes at or above the minimum count as the minimum** (recommended, new records only), or the minimum
   is only ever its own explicit tap.
4. **Less Scrolling's minimum** ("no more than your usual"): include it (Starter Foundation then has a minimum for 6 of its 7 daily habits; without it, 5), or
   leave Less Scrolling without one because it isn't a smaller _action_.
5. **Details placement:** the minimum replaces "Partially completed" in the same link slot where one exists
   (recommended), or it's a second link.
6. **Card visibility:** the minimum is shown only after it's used (recommended), or as a hint on the card beforehand.
7. **The check-in** (8 of the last 14 days, at most every 14 days): build it in R2c, or wait for real use first
   (recommended: wait).
8. **Journey mark** for held days: use the existing partial look (recommended for R2) or design a distinct mark.
9. **Wording and safety review** of every minimum in §3.2, with ChatGPT for copy. Sleep, Movement and Eat Well go
   to the catalogue's reviewers.
10. **Strength:** confirm "no minimum, ever" for Strength Training (recommended).
11. **Save version 3** for this change (recommended), accepting that an older build will keep a newer save for
    recovery rather than open it.
