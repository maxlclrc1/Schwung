# Schwung — Life Reset Progression

**Stage 4 of the Life Reset, refined in Stage 4B:** readiness-based progression. **A pure engine, not used by the
app.**

- **New code:** `src/core/reset/readiness.ts`.
- **Tests:** `src/core/__tests__/resetReadiness.test.ts`.
- **Unchanged:** cards, swipe, onboarding, XP, streaks, ceremonies, saves, navigation, artwork, Field Notes, the habit
  limit and production. Existing V1 and V2 programs keep `reconcile` and `levelUpOffers` in `src/core/progression.ts`
  exactly as they are (automatic Day 22/45 rises, the 7-day early offer, the 3-miss step-down, saved levels, logs).
- **Supersedes** the progression outline in `SCHWUNG_LIFE_RESET_HABITS.md` §5 for Life Reset programs.

## The principle

**Difficulty changes only when the person chooses, and offers depend on demonstrated consistency, never on the
calendar.**

- **Phases say what's available:** Foundation from Day 1, Momentum from Day 22, Mastery from Day 45 (`PHASE_OPENS`,
  from the existing `PHASE_START`).
- **Readiness decides what's offered.** Nothing rises on Day 22 or Day 45 by itself; a habit that isn't ready keeps
  its target and is offered the next one later, whenever it becomes ready.
- **Every change is optional:** step-ups and step-downs are offers to accept or decline, and Make it easier / Make it
  harder work at any time.
- **Intensity never rises without explicit consent.** Offers stay within the chosen intensity. Only "Make it harder"
  at Mastery moves to the next intensity, because the person asked.

## Readiness rules

All values live in `READINESS` and are adjustable.

| Rule                       | Value                                                  |
| -------------------------- | ------------------------------------------------------ |
| Daily window               | The last **14** eligible opportunities                 |
| Daily minimum coverage     | **7** recorded opportunities (done, skipped or missed) |
| Weekly window              | The last **3** closed weeks with a goal                |
| Weekly minimum             | **2** judged weeks (achieved or not achieved)          |
| Offer the next phase       | Done in **≥ 80%** of the window                        |
| Early step-up              | Done in **≥ 90%** of the window **and** "too easy"     |
| Keep the target            | 60–79%                                                 |
| Suggest an easier target   | Done in **< 60%** of recorded opportunities            |
| Cooldown after a "Not now" | **7** days for that same offer                         |
| "Too hard" holds step-ups  | **14** days                                            |

The outcome (`readiness`) is one of `ready`, `ready-early`, `maintain`, `struggling` or `insufficient-data`, checked
in this order:

1. **Insufficient data:** fewer recorded opportunities than the minimum. No recommendation either way.
2. **Ready early:** ≥ 90% done and the person said "too easy" since the current target began.
3. **Ready:** ≥ 80% done.
4. **Struggling:** < 60% done.
5. **Maintain:** anything else.

### Which days count

- **Final days only:** never today, nor yesterday while it can still be edited (before noon), as everywhere else in
  Schwung.
- **Since the current target began:** a new target needs its own evidence. After any change (accepted, manual, up
  or down) the window starts again, so a step-up is never offered on the strength of an easier target, and a
  step-down is never suggested because of a harder one.
- **Daily habits:** every day is an eligible opportunity. The window is the last 14 final days since the target
  began (fewer early in the program or after a change).
- **Weekly habits:** see below.

### Denominators and rounding

- **Step-ups (80%, 90%) use the whole window**, unrecorded opportunities included. So unknown is never success: 7
  done and 7 unrecorded is 50% (keep the target), and readiness needs 12 known successes out of 14.
- **The easier suggestion (< 60%) uses recorded opportunities only** (daily: done + skipped + missed; weekly:
  achieved + not achieved). So unknown is never failure either: a step-down is never based on days nobody recorded.
- **No rounding:** shares are compared in whole numbers (`done × 100 ≥ 80 × window`), so 80% and 60% are inclusive
  and there's no float error.

| Of 14     | Share | Outcome                       |
| --------- | ----- | ----------------------------- |
| 13        | 92.9% | Ready (early with "too easy") |
| 12        | 85.7% | Ready                         |
| 11        | 78.6% | Keep                          |
| 9         | 64.3% | Keep                          |
| 8         | 57.1% | Easier suggested              |
| 6 (of 10) | 60%   | Keep (60% is not under 60%)   |
| 8 (of 10) | 80%   | Ready (80% is enough)         |

### The four day states

Completed, skipped, incomplete and unrecorded stay distinct (`dayStatus`, `observation` in `tracking.ts`):

| State      | Coverage         | Step-up share | Easier share |
| ---------- | ---------------- | ------------- | ------------ |
| Completed  | Recorded         | Done          | Done         |
| Skipped    | Recorded         | **Not done**  | Not done     |
| Incomplete | Recorded         | Not done      | Not done     |
| Unrecorded | **Not recorded** | Not done      | **Left out** |

- **Skips can't inflate readiness:** a skipped day stays in both denominators, so skipping is never better than
  missing (tested: 11 done + 3 skipped and 11 done + 3 missed give the same outcome).
- **Skips count toward coverage**, because the person did record the day.
- **Low coverage is neutral:** below 7 recorded opportunities nothing is suggested, up or down.

## Weekly habits

Weekly, workday and session habits (Focus Time, Get It Done, Practice a Skill, Strength Training, and the weekly
phases of Social Confidence and Stay Connected) are judged by **closed program weeks**, from the weekly scheduling
engine (`weekSummary` in `weekly.ts`).

- **Closed weeks only:** a week counts once its last day is final. A week in progress (even with nothing done yet) is
  never a failure.
- **Weeks since the current target:** only weeks that started on or after the current target's first day.
- **Each week:**
  - **Achieved** (the quota was met): success.
  - **Not achieved** (the week has records but the quota wasn't met): not achieved.
  - **Unrecorded** (no record at all that week): unknown. Never a success; left out of the easier share.
  - **No goal** (a short week whose scaled goal is 0, such as a 3-day first week for 2 sessions a week): left out.
- **Rest days are never misses:** only the week's quota matters, as in the scheduling engine.
- **Short weeks:** partial first and last weeks use the scheduling engine's scaled goal, so they're judged the same
  way as any week. A week too short for a goal is left out, never counted against the person.
- **Phase changes inside a week:** the week uses the lowest goal in effect (as the scheduling engine already does),
  and every change starts at the next week, so a week is never judged against a target changed partway through.
- **Fewer days a week isn't easier:** every weekly habit needs the same 80% of its weeks and the same 2 judged weeks,
  whatever its quota. A week is one opportunity, whether its quota is 2 or 5.
- **Examples:** 3 of 3 weeks achieved → ready. 2 achieved + 1 unrecorded → 67%, keep. 1 achieved + 2 unrecorded → 1
  judged week, no recommendation. 1 of 3 achieved → 33%, an easier target is suggested.

## Offers (`progressionOffer`)

- **Step-up:** when ready, to the next phase of the same intensity.
  - **Only once that phase is open** (Day 22, Day 45), or **early** with 90% and "too easy" (`early: true`).
  - **Starts at the next boundary:** tomorrow for a daily habit, next Monday for a weekly one
    (`nextBoundary`), so nobody is asked for more mid-day or mid-week.
  - **Not after a recent "too hard":** no step-up is offered, early or not, for 14 days after the person says the
    current target is too hard (`saidTooHard`). The answer never lowers anything by itself.
  - **At Mastery nothing is offered.** A higher intensity is never offered.
- **Step-down:** when struggling, one step easier (the previous phase, or at Foundation the next intensity down's
  Foundation; nothing below Starter Foundation). **Starts at the next boundary** too: tomorrow, or next Monday for a
  weekly habit. Only the data suggests a step-down, never a "too hard" answer alone.
- **Nothing is offered** while an accepted change is waiting for its boundary, or for the same target within 7 days
  of a "Not now" (step-ups and step-downs alike). A declined step-up doesn't block a different suggestion (a
  step-down). Manual controls are never held back.
- **Every offer is checked against the person's constraints** (below); one that doesn't fit isn't offered.

### Accepting and declining

- **`acceptOffer`:** adds the new target from the offer's day; the previous one stays in effect until then. Any
  waiting change is replaced, and a decline is cleared.
- **`declineOffer`:** nothing changes. The same offer returns after 7 days if the habit is still ready. Declining
  again starts a new 7 days.
- **`setFeedback`:** "too easy" or "too hard"; only the latest answer is kept. "Too easy" given since the current
  target began counts toward an early step-up. "Too hard" given since the current target began and within the last
  14 days holds back every step-up offer; it changes no readiness outcome and never steps anything down.

## Manual controls

The person never waits for the engine to make a safe change.

| Control        | Step                                                                                  | Starts            | Blocked when                                |
| -------------- | ------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------- |
| Make it easier | Previous phase; at Foundation, the next intensity down's Foundation                   | The next boundary | Already Starter Foundation, or a constraint |
| Make it harder | Next phase (even before it opens); at Mastery, the next intensity's Mastery (consent) | The next boundary | Already Challenge Mastery, or a constraint  |

- **The next boundary** is tomorrow for a daily habit and next Monday for a weekly one: Sunday → Monday, Monday → the
  following Monday. A program day is a date key, so whether it's 23:59 or 00:01 only matters through which day it is,
  and a change on Day 21 or 44 starts on the day the next phase opens.
- A change made while another is waiting builds on the waiting one and replaces it; one that leads back to the
  current target simply cancels the waiting change.
- **Intensity and phase stay separate:** offers keep the chosen intensity; only a manual change crosses intensities.
  No increase is ever mandatory: ignoring every offer keeps the target to the end of the program.
- Both return `{ state, level }` or `{ blocked: reason }`, with a reason a future UI can show.

## Constraints (`checkLevel`)

Every offer and manual change is checked against what's known (anything not given isn't checked):

- **Age and safety:** the catalog's `resetExclusion` (under 16, intensities not offered to 16–17 such as Strength
  Challenge, and the Strength precautions: heart, pregnancy, walking difficulty, joint pain at Starter).
- **Time:** the target's minutes plus the person's other habits must fit their available minutes.
- **Frequency:** a workdays target can't need more workdays than the person has.
- **Personal baseline:** Less Scrolling can't be made "harder" when the limit can't go any lower for this person
  (the 30-minute floor, their stated need, or their own baseline).
- **The maximum supported target:** Challenge Mastery; nothing above it exists.

## Saved state (`ProgressionState`, version 1)

```ts
type ProgressionState = {
  v: 1;
  habitId: string;
  eras: { intensity; phase; fromDay; reason: 'start' | 'step-up' | 'step-down' | 'easier' | 'harder' }[];
  feedback?: { kind: 'too-easy' | 'too-hard'; day: number };
  declined?: { to: { intensity; phase }; day: number };
};
```

- **Eras** are the habit's targets over time, in day order; the last may start in the future (an accepted change
  waiting for its boundary). `scheduleEras` turns them into the weekly engine's schedule history, so a week's goal
  always follows the target actually in effect.
- **Plain JSON**, versioned, only for future Life Reset programs. Existing programs never have one, and nothing
  existing is migrated. Where it's saved in a program is decided at integration.
- **Logs are only read**, never changed.

## Compatibility and isolation

- **V1 and V2:** untouched. Tested: `reconcile` still raises levels automatically on Day 22.
- **Isolation:** no app code imports any Life Reset module (tested; the only reference remains the type of the
  optional `DayLog.track`).
- **Old saves:** logs without tracking details read correctly after the existing loader (tested through
  `sanitize`).

## Decisions applied in Stage 4B (2026-10-27)

| Decision                                                                                                                     | Applied                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Weekly readiness: the last 3 finished weeks, at least 2 judged; all 3 needn't exist; unrecorded weeks never count as success | Unchanged rule, confirmed and tested (a habit started in Week 2 is offered after Weeks 2 and 3) |
| Reductions start tomorrow (daily) or next Monday (weekly); never partway through a started day or week                       | Step-down offers and Make it easier use `nextBoundary`, like step-ups                           |
| The 7-day cooldown after "Not now" holds for step-ups and step-downs; manual controls stay available                         | Unchanged rule, tested in both directions                                                       |
| Recent "too hard" suppresses automated step-up offers, early ones included; never lowers difficulty by itself                | `saidTooHard`, `READINESS.tooHardDays`                                                          |

## Still open

1. **"Too hard" recency:** 14 days (the length of the daily window), and only about the current target. Confirm.
2. **Integration** (where the state is saved, the Life Reset program marker, the offer banner, Habit Detail controls)
   is a later stage.
