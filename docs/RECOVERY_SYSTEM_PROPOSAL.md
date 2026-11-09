# Schwung: recovery and adaptive-difficulty proposal

**Status:** proposal for review. No production code has been changed. This is roadmap step 3 of
`docs/66_DAY_EXPERIENCE_AUDIT.md` ("A path down", weakness W2, product decision D2).

**Baseline:** `main` at `5364be2`. Every statement about current behaviour is from the code and the audit
simulation (`AUDIT=1 npx jest scripts/audit`).

**Labels:** **[Engine]** means the current code does this. **[Proposal]** is a design suggestion. **[Decision]** is a
choice the owner needs to make before it's built.

**The owner's current preference:** Minimum Effort is a **temporary fallback**. The person keeps their original goal,
and a smaller action is recognised on difficult days. This proposal recommends that model. It does **not** add a
fourth difficulty level, and nothing here should be read as permission to build one.

---

## 1. The problem in one page

People who struggle get almost no help today:

- **[Engine] Most people can't go any easier.** They start at Starter Foundation, and `easierLevel` returns `null`
  there. So:
  - a step-down is never offered (`progressionOffer` gives nothing);
  - "Make it easier" is blocked;
  - the "harder" reflection lists "Easier: not available" for every habit.

  User A got **0** adjustment offers in 66 days.

- **[Engine] Time away never triggers help.** Days the app wasn't opened count as `unknown` in `readiness()`, so after
  an absence there's only "insufficient data". This is a deliberate safety property: missing data must never push a
  habit down. The result, though, is that the people who most need a lighter start get nothing.
- **[Engine] The welcome back is words only.** It never changes the day. B's first day back (2 of 3 done) counted as
  missed.
- **[Engine] Lightening the load is never suggested.** Removing a habit exists (`removeHabit`, with history kept), but:
  - it's permanent from the person's point of view (the habit disappears from Habits);
  - nothing ever suggests it.
- **[Engine] Partial progress exists but doesn't help a day count.** `track.progress` earns 5 XP and never counts
  toward a counted day, a full day or a weekly goal.

**What recovery needs to provide:**

1. a smaller action that still counts as showing up;
2. a lighter way back after time away;
3. a reversible way to carry fewer habits;
4. well-timed suggestions to use them.

Each must be offered and never imposed, and none may weaken safety rules or rewrite the past.

---

## 2. Design principles (constraints for everything below)

1. **The goal is kept.** A recovery action never changes the person's level (`ProgressionState.eras`). The card always
   shows the real target alongside the smaller one.
2. **Opt-in, one tap, reversible.** Everything is offered. An undo or "end early" is always available.
3. **Unknown is still never evidence.** Recovery offers may be _triggered_ by an absence (a calendar fact). Absence
   days are never counted as failures in readiness, consistency or the Journey.
4. **No new pressure.**
   - Only one recovery suggestion at a time.
   - "Not now" is respected, using the same pattern as the Step 2 decline rule.
   - No countdowns, streak threats or guilt.
5. **Honest numbers.** A minimum day is recorded as a minimum day, distinct from a full target. Words follow what
   was recorded (the Step 2 "truthful moments" rule).
6. **Safety first.** A smaller action never opens a habit or intensity that safety rules exclude, and never asks for
   anything the full target is careful to avoid. Examples: an earlier wake time, a lower scrolling floor, an exercise
   prescription.
7. **Old saves are untouched.** Every new field is optional. A save without them computes exactly the same XP,
   streak, Journey and Insights as today.

---

## 3. Minimum Effort

### 3.1 Two models

|               | **A. Permanent fourth level**                                                                                                                                                                                                                                               | **B. Temporary fallback (recommended)**                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| What it is    | A new intensity or phase below Starter Foundation (for example "Minimum", 2-minute versions). The person steps down to it, and later steps back up.                                                                                                                         | A small "minimum version" of each habit, available on any day **without changing the level**. The card keeps the real target; the person can log "Did the minimum" instead.                                                      |
| Goal identity | The goal becomes smaller. "My habit is 2 minutes of reading."                                                                                                                                                                                                               | The goal stays. "My habit is 10 minutes; today I did the minimum."                                                                                                                                                               |
| Engine change | Large. `Intensity`/`Phase` types, every catalogue table, `easierLevel`/`harderLevel`, readiness ladders, set-up and Add (can someone _start_ at Minimum?), every `levelOn` consumer, card level bars (3 bars become 4), saves (a new enum value an older build can't read). | Contained. A per-habit `minimum` definition in the catalogue, one optional day marker (`track.minimum`), and explicit rules in the day result, XP and Insights. Levels, readiness ladders and set-up are untouched.              |
| Way back up   | Needs readiness at Minimum (7+ recorded days at ≥80%) before an offer. That means at least a week at the floor.                                                                                                                                                             | Immediate. Tomorrow the real target is simply there again.                                                                                                                                                                       |
| Risk          | People settle at the floor; the "66-day program" becomes "66 days of 2 minutes". Step-down offers would now fire for every Starter habit at <60%, which means many more prompts.                                                                                            | It could quietly become the de facto target if someone logs the minimum every day. This is addressed by transparency (§3.5) and a gentle check-in, not by limits.                                                                |
| Science fit   | Lowering the target is a valid adaptive strategy.                                                                                                                                                                                                                           | Matches "never miss twice" and "shrink the habit on hard days". Keeping the cue and the routine alive matters more for automaticity than the size of a single repetition. Self-efficacy is protected without a visible demotion. |
| Reversibility | Each move is an era change, kept in history.                                                                                                                                                                                                                                | Nothing changes in the plan; a day marker can be undone like any completion.                                                                                                                                                     |

**Recommendation: B, a temporary fallback.** It matches the owner's preference, carries much less engine and data
risk, and keeps the person's original goal in view. If real use later shows people living at the minimum for weeks,
model A can still be added later on top of B. The reverse is much harder.

**[Decision 1]** Confirm model B. Do **not** build a fourth level until this is decided.

### 3.2 Two forms of the fallback

Both forms leave `eras` unchanged.

1. **"Minimum today" (a single day).** On any day, for any daily catalogue habit, the person can log the minimum
   version instead of the full target. Where it's offered:
   - in the habit's details;
   - on the welcome back;
   - from a "harder" reflection.

   This only adds a marker to that day.

2. **A "recovery week" (a short, bounded period).** The person chooses, for some or all habits, to make the minimum
   the day's ask for **7 days**. How it works:
   - The card shows the minimum as today's target, with "Your goal: Read for 10 minutes" beneath it.
   - On Day 8 the real target is simply there again. The person agreed to this when they started the week, and the
     offer says so plainly.
   - They can end it early at any time.
   - They can extend it **once**, by another 7 days, which also asks for consent.

   It is offered after an absence (§4) or from a "harder" reflection.

**[Decision 2]** Is the recovery week in scope, or only "Minimum today" for now? Recommendation: build both, but in
separate phases (§9).

### 3.3 How a minimum day counts

This is the central rule question.

| Area                                  | Recommendation                                                                                       | Why                                                                                                                                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The day rule (80%) and the streak** | A minimum counts toward a counted day, as "showed up"                                                | This is the whole point of the fallback. Without it, a minimum is just today's partial progress, and B's first day back is still a "missed" day.                                         |
| **Full day (+20 XP bonus)**           | Not full if any habit was only the minimum                                                           | Keeps the full-day bonus meaning "the whole plan".                                                                                                                                       |
| **XP**                                | 5 XP, the same as partial progress (`PARTIAL_XP`)                                                    | Effort is recognised but not equated with the full target. No new constant. _Alternative:_ 10 XP, simpler and kinder; see Decision 3.                                                    |
| **Readiness, step-up**                | Not done                                                                                             | Doing the minimum is no evidence of being ready for more.                                                                                                                                |
| **Readiness, struggling**             | Recorded but not done (the same as a skip today)                                                     | Someone at Standard who mostly does the minimum is correctly offered an easier target, which is still their choice. At Starter nothing changes, because there's nothing easier to offer. |
| **Weekly goals**                      | No credit in phase 1 (see §3.6)                                                                      | Weekly habits already flex by design ("any 4 days").                                                                                                                                     |
| **Insights consistency**              | Done ÷ eligible counts full targets only. A separate "minimum days" figure is shown.                 | Honest numbers: consistency means the real target.                                                                                                                                       |
| **Journey and 66-day calendar**       | The day counts. Optionally, a distinct mark for "counted with minimums". This needs design approval. | Visible but not shaming.                                                                                                                                                                 |
| **Moments, Story and summit**         | A minimum is activity (it already counts for the truthful wording in `moments.ts`)                   | "Seven days of showing up" is true when they showed up.                                                                                                                                  |

**[Decision 3]** XP for a minimum: 5 (recommended) or 10?

**[Decision 4]** Should minimums count for the streak and the day rule at all? Recommendation: yes.

- This partly overlaps roadmap step 4 (day counting, D3) without settling it.
- Whatever D3 decides, a minimum should be treated as "showed up".
- If the owner prefers to decide D3 first, phase R2 can ship with minimums counting **only** for the welcome back's
  first day and the recovery week. That is a narrower rule; see §9.

### 3.4 Data representation

- **[Proposal]** Add `HabitTrack.minimum?: true` on that day's record. Rules:
  - It is **not** added to `log.completed`. Every existing consumer that reads `completed` (consistency, weekly
    goals, readiness, Insights) would otherwise count it as a full target by accident.
  - It is mutually exclusive with completed, skipped and partial. Completing the full target later that day replaces
    it.
  - An undo removes it.
- `dayResult`, `dayXp` and the Journey's cell state read the marker explicitly.
- `readTrack` ignores anything malformed, as it does for every field today.

### 3.5 Keeping the fallback temporary without capping it

There's **no hard limit**: a cap would turn a kindness into a rule to fail. Instead:

- **Transparency.** The habit's details show "Minimum on 5 of the last 14 days". Insights shows minimum days next to
  full days.
- **A gentle check-in**, at most once per 14 days per habit, using the existing decline rules.
  - **Trigger:** the minimum logged on at least 8 of the last 14 recorded days.
  - **Wording:** "You've kept Read going with the minimum lately."
  - **Choices:**
    - "Keep my goal" (no change);
    - "Make it easier", if a real easier step exists (`nextRealEasier`);
    - "Pause it" (§5);
    - "Not now".
  - The check-in never acts by itself.
- **[Decision 5]** The trigger threshold (8 of 14 is a starting point, not evidence-based).

### 3.6 Scope by habit type

- **Daily catalogue habits:** phase R2.
- **Weekly catalogue habits** (Get It Done, Practice a Skill, Stay Connected at Starter, Strength): **later.**
  - Weekly habits already have built-in slack.
  - A minimum day doesn't fit "any N days" cleanly.
  - The better fit is a **minimum week** (for example "1 day this week") during a recovery week.
- **The person's own habits:** later, as an optional "smallest version" they write themselves (a text field).
  Without one, they have no minimum.

---

## 4. Gentle recovery after time away

An absence is measured as it is today (`comeback.ts`): consecutive days, with something due and no activity, ending
yesterday. This is a calendar fact. It triggers **offers only** and is never counted as evidence of struggling.

### 4.1 One overlay at a time

**[Engine]** B's Day 12 brought the welcome back, the Day 7 milestone and the week 1 reflection, all at once.

**[Proposal]** On a return day, show **only** the welcome back:

- a due milestone waits until the next day the app is opened;
- a due reflection is put off until the next week ends, and isn't shown for the week the person was away.

### 4.2 Three tiers

| Away          | Name        | What the welcome back offers (all optional)                                                                                                                                                                                                                 | Not shown that day                              |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **2–6 days**  | Short pause | The existing calm card, plus **"Start with the minimum today"**: one tap marks every daily habit's minimum as today's option (the person still swipes each one).                                                                                            | Milestones, reflection, step-up offers          |
| **7–20 days** | Restart     | The card, plus two choices: **"Take a recovery week"** (§3.2, for the habits the person picks, all ticked by default) and, with 3 or more habits, **"Start again with fewer"** (§6: pick the ones to keep, pause the rest). Or simply "Carry on as before". | As above. Any step-up offer is held for 7 days. |
| **21+ days**  | Fresh start | The tier 2 choices, framed as a fresh start. **[Decision 6]** Also offer "Begin a New Ascent from today"? This is a new 66 days that keeps this journey in Past journeys, and would be the first time a New Ascent could start before Day 66.               | As above                                        |

**Common rules:**

- The streak naturally counts from the return.
- Past days are never back-filled or re-scored.
- Each absence is offered once (the `comeback.seen` rule).
- Ignoring the offer leaves everything as it was.

**Readiness after a recovery week [Proposal]:** a habit's readiness evidence starts the day after its recovery week
ends, as if a new target had begun. Readiness itself doesn't change. Why:

- A week of minimums mustn't immediately produce a step-down offer.
- The days away were already unknown, so they produced nothing either way.

**Near the summit:** a recovery week that would cross Day 66 ends at Day 66. The summit is unchanged.

**After Day 66 (Keep My Momentum):** the same tiers apply (the welcome back already works there since Step 1).

**[Decision 7]** Tier boundaries. 2, 7 and 21 are proposed:

- 2 matches today's welcome back;
- 7 is a program week;
- 21 is a phase length.

There's no strong evidence for the exact numbers.

---

## 5. Pausing versus removing

|                                     | **Remove** (exists)                                             | **Pause** (proposed)                                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Meaning                             | "This habit isn't for me now."                                  | "Not this habit right now; I'll come back to it."                                                                                     |
| On Habits                           | Gone. It can be found again in Add a habit.                     | A small, collapsed "Paused" row under the cards, with "Resume". Exact UI needs approval.                                              |
| Level                               | Lost: re-adding starts at Foundation of the chosen intensity    | **Kept**: it resumes at the level it had                                                                                              |
| Its days                            | Out of the program (`gaps`): never missed, never a rest day     | The same (out of the program)                                                                                                         |
| Day rule                            | It's no longer due, so fewer habits are needed for the 80% rule | The same                                                                                                                              |
| Pending change, offers, reflections | Dropped                                                         | Dropped while paused (a waiting change is dropped, as on removal)                                                                     |
| Resume                              | Re-add through Add a habit (asks intensity again)               | One tap. From today (daily habits); a weekly habit's first week is scaled to the days left, as `addHabit` already does.               |
| Reminder to return                  | —                                                               | Optional "Ask me again in a week". On that day the paused row is highlighted with "Bring Read back?". **It never resumes by itself.** |

**[Proposal] Data:** reuse `ProgressionState.gaps` with an optional `pause: true`.

- A paused habit stays in `p.habits`.
- `scheduleEras` already ends its schedule at a gap's first day.
- Removal and old saves (no flag) behave exactly as today.

**Rules:**

- At least one habit stays active (the same rule as removal, `removeProblem`).
- Paused habits count toward the 30-habit maximum.
- Pausing never changes past days.

**[Decision 8]** Should a paused habit show as a collapsed row on Habits (recommended, because a return is visible),
or only in its details and Insights?

---

## 6. Suggesting fewer habits

Set-up already says "Two to four is a good start", and the time check guards the busiest day. Suggestions during the
program would appear in three places only:

1. **A "harder" reflection** (the weekly question, which already exists). Instead of "Easier: not available", each
   habit offers:
   - Minimum today;
   - Recovery week;
   - Make it easier (only if a real step exists);
   - Pause.

   Above the list: "Lighter weeks often start with fewer habits", with "Choose what to keep" (§6.1).

2. **A return after 7+ days** with 3 or more habits: "Start again with fewer" (§4.2).
3. **A focus suggestion** from recorded data.
   - **Trigger:** 3 or more habits, at least 14 recorded days, fewer than half of recent judged days counted, and at
     least one habit doing clearly better than the rest (from `habitTally`).
   - **Wording:** "Read and Move are going well. Focus on them for now?" → choose what to keep, pause the rest.
   - Shown on Habits like an offer, one at a time with the other offers.
   - "Not now" holds it for 14 days; two "no"s stop it (the Step 2 pattern).
   - **[Decision 9]** Include this proactive trigger in the first release, or only the two places above?

### 6.1 "Choose what to keep"

A single sheet:

- each habit with its recent days;
- the strongest ones pre-ticked (at most two by default);
- "Pause the others".

It never removes anything; pausing is reversible.

**Never:** removing automatically, pausing automatically, ranking habits by "importance", or wording that implies the
person failed.

---

## 7. Safety restrictions and habit-specific minimums

A minimum is only available for a habit already in the person's program, so the habit's eligibility, age and health
rules have already been applied. The minimum must also ask for nothing the full target is careful to avoid.

| Habit             | Proposed minimum (draft wording)                                                  | Safety and design notes                                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Eat Well          | "Fruit or vegetables with anything today"                                         | Nothing to count, weigh or avoid, the same as the habit's existing notes.                                                                                                                              |
| Less Scrolling    | "No more than your usual time on your main app today" (the person's own baseline) | Never below the 30-min floor or the time they need; it is above the current limit by definition. Self-reported, as now.                                                                                |
| Get It Done       | "5 minutes on your #1 task"                                                       | Weekly (workdays): later phase.                                                                                                                                                                        |
| Read Daily        | "Read one page" (or 2 minutes)                                                    | —                                                                                                                                                                                                      |
| Meditation        | "Three slow breaths, or one quiet minute"                                         | Any practice counts, as the existing note says.                                                                                                                                                        |
| Daily Movement    | "Move for 2 minutes, any way you like"                                            | Already gated by walking difficulty, heart and pregnancy. No exercise is prescribed.                                                                                                                   |
| Sleep Routine     | "Up within 90 minutes of your wake time"                                          | **Never earlier, never less sleep**: the window only widens. Not available when the wake time varies (the habit is already excluded). If the person reported a sleep condition, keep the habit's note. |
| Time Outdoors     | "Step outside for 2 minutes, by choice"                                           | —                                                                                                                                                                                                      |
| Practice a Skill  | "2 minutes of practice"                                                           | Weekly: later phase.                                                                                                                                                                                   |
| Stay Connected    | "Send one short message to someone you care about"                                | Keep "Never a prompt to contact someone who harmed you." Weekly at Starter: later phase.                                                                                                               |
| Strength Training | **No daily minimum.** In a recovery week, "1 session this week" (later phase).    | Schwung never prescribes exercises, sets, loads or shorter workouts. The health gates and the "stop and get medical help" note stay.                                                                   |
| Own habits        | Optional text the person writes; none by default                                  | —                                                                                                                                                                                                      |

**Further safety rules:**

- **Leaving a recovery week.** When the recovery week ends, or a paused habit resumes, the level is re-checked with
  `checkLevel` (age, health, time). If it no longer fits, the habit's details say why, and "Make it easier" or a
  pause is offered. Nothing is raised silently.
- **Reaching the floor.** The recovery system never moves a level up. It also never moves one down without consent:
  a step-down is still the person's choice.
- **Wellbeing.** Long absences get no wellbeing inference. Copy never guesses why someone was away, or mentions
  illness or mood. The existing wellness link in Settings is the only resource surface; adding a crisis prompt would
  be a separate, explicitly reviewed decision.
- **Age.** The 18+ gate is unaffected. A paused 16–17 program stays paused.
- **Translations.** All minimum wordings go through the catalogue's existing review (`availability.beforeProduction`)
  and need translation into the 20 languages.

**[Decision 10]** Approve the minimum wordings, ideally with ChatGPT for copy. The Sleep and Movement entries should
also be checked by the same reviewer as the catalogue.

---

## 8. Implications in summary

| Area                          | Effect                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Levels and eras**           | None. Model B never writes an era.                                                                                                                                                                                                                                                                                                                          |
| **XP**                        | Plus 5 per minimum (Decision 3). No full-day bonus on a day with a minimum. Never retroactive. Paused habits earn nothing while paused.                                                                                                                                                                                                                     |
| **Day counting and streak**   | A minimum counts as showing up (Decision 4). Pausing reduces what's due, so the 80% rule asks less. Absence days stay as they are today.                                                                                                                                                                                                                    |
| **Readiness**                 | A minimum is recorded, not done. Recovery-week days are excluded from evidence. Thresholds unchanged.                                                                                                                                                                                                                                                       |
| **Offers**                    | Recovery offers share the one-at-a-time queue and the decline rules. Step-up offers are held for 7 days after a return.                                                                                                                                                                                                                                     |
| **Insights and Journey**      | Consistency means full targets. Minimum days are shown separately. The Journey may need a distinct mark (design approval).                                                                                                                                                                                                                                  |
| **Moments, Story and summit** | Minimums count as activity for truthful wording. The summit is unchanged.                                                                                                                                                                                                                                                                                   |
| **Reminders**                 | No change in phase 1. A later option: during a recovery week, the reminder line can mention "the minimum counts today".                                                                                                                                                                                                                                     |
| **Saved data**                | New optional fields: `track.minimum`, `gaps[].pause`, a recovery-week record (for example `ProgressionState.recovery?: { from; to; extended? }`) and suggestion decline records. Old saves load and compute identically, which a test will confirm. Export, restore and recovery of unreadable saves carry the new fields; `sanitize` drops malformed ones. |
| **Existing programs**         | Nothing is re-scored. The new rules apply only to days where the person uses the new actions.                                                                                                                                                                                                                                                               |

---

## 9. Phased implementation recommendation

Each phase is one focused task: engine first, then tests, then a simulation update, then UI using existing patterns,
then translations, then a review stop.

| Phase                                  | Scope                                                                                                                                                                                                                              | Day-rule change? | UI needing approval                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| **R1. Path down from what exists**     | "Harder" reflection: per-habit choices (Make it easier when real, **Pause**); "Choose what to keep". **Pause and resume** in the engine (`gaps[].pause`), habit details and a paused row. One overlay on return days (§4.1).       | No               | Paused row; reflection options                   |
| **R2. Minimum today**                  | Catalogue minimums for the 7 daily habits (§7). `track.minimum` with the counting rules (§3.3). The details action and the welcome back's "Start with the minimum today". Insights and Journey marks. The minimum check-in (§3.5). | Yes (Decision 4) | Minimum action on card or details; Journey mark  |
| **R3. Return tiers and recovery week** | The 7–20 and 21+ tiers, the recovery week (start, end early, extend once, automatic end), readiness evidence after it, and the summit boundary.                                                                                    | Uses R2's rule   | Welcome back choices; card with "Your goal" line |
| **R4. Wider coverage**                 | The proactive focus suggestion (Decision 9), minimum weeks for weekly habits and Strength, minimums for own habits, and the reminder line during a recovery week.                                                                  | No new rule      | Small                                            |

**Verification for every phase:**

- Users A, B and C re-run in `scripts/audit` with the new actions. C must see **no** recovery prompts.
- A save-parity test: every existing fixture computes identical XP, streak, Journey and Insights.
- The full suite, typecheck, lint and the i18n check.

**Recommended order:** R1 → R2 → R3 → R4.

- R1 needs no counting decision and immediately removes the dead end ("Easier: not available").
- R2 should follow the decision on D3 (roadmap step 4), or ship with the narrower rule from Decision 4.

---

## 10. The audit's struggling users, with the proposal

These are hand-worked from the simulated behaviour, assuming the person accepts what's offered. They are **estimates
[UX]**, not simulation output. R1–R3 would add them to `scripts/audit` as measured results.

### User A: the enthusiastic starter who fades (4 Starter habits)

| Day        | Today **[Engine]**                                                                 | With the proposal **[Proposal]**                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8–13       | Drops meditation; every day missed from Day 14                                     | From R2: "Minimum today" for Meditation (three breaths) keeps days counted.                                                                                   |
| 15         | Reflection "harder": "Easier: not available" × 4                                   | Per habit: Minimum today, Recovery week, Pause. "Choose what to keep" pre-ticks the two A actually does. A pauses Meditation and Sleep Routine (levels kept). |
| 14–30      | "Two habits on two days in three": 0 counted days                                  | With 2 active habits: about two days in three counted (**≈ 11 of 17**, against 0). The streak becomes possible again.                                         |
| 30–31 → 32 | Welcome back, words only                                                           | Short pause (2 days): "Start with the minimum today".                                                                                                         |
| 31–50      | One habit every other day                                                          | The minimum check-in (§3.5) may fire. A keeps the goal or pauses one more. On days A uses a minimum for the other habit, the day counts.                      |
| 51–65 → 66 | 15 days away; on return, welcome back plus the week 9 reflection on the summit day | Restart tier: one overlay only, and the reflection is not shown for a week away. A recovery week would end at Day 66; the summit is unchanged.                |
| Story      | "7 of 66 days"                                                                     | More counted days, and an honest count of minimum days next to full ones.                                                                                     |

**What changes for A:** the dead end at Day 15 becomes three real choices. Nothing about A's levels changes, and
paused habits can return at the same level.

### User B: away for a week, then steady (3 habits)

| Day                    | Today **[Engine]**                                                                            | With the proposal **[Proposal]**                                                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12 (after 7 days away) | Welcome back, the Day 7 milestone and the week 1 reflection at once; 2 of 3 done = **missed** | Restart tier: **one** card. "Take a recovery week" for all three. If B does 2 full and the third as its minimum, Day 12 **counts**. The milestone shows the next time B opens the app (with truthful words); the week 1 reflection isn't shown. |
| 13–18                  | Planned miss on Day 13                                                                        | During the recovery week, B can log the minimum on the planned-miss day, so it counts. On Day 19 the real targets return as agreed. Readiness evidence starts on Day 19.                                                                        |
| 26+                    | Step-ups declined twice, then stop (Step 2)                                                   | Unchanged.                                                                                                                                                                                                                                      |

**What changes for B:** recovery starts with a success, not a miss. The weekly-miss pattern (longest streak 6) is
only partly helped. A minimum on the weak day keeps the streak, but the full fix is roadmap step 4.

### User C: the ambitious person (control)

C never has an absence, a "harder" answer, minimum days or a weak-habit pattern, so **no recovery prompt appears**,
and nothing in C's journey changes. This will be a test assertion.

---

## 11. Decisions for the owner

1. Confirm model B, a temporary fallback. **No fourth level** for now.
2. The recovery week: in scope (as R3) or not.
3. XP for a minimum: 5 or 10.
4. Minimums count for the day rule and streak: fully (recommended), or only on return days and in a recovery week
   until roadmap step 4 is decided.
5. The minimum check-in threshold (8 of the last 14 days).
6. Whether the 21+ tier may offer a New Ascent before Day 66.
7. Tier boundaries: 2, 7 and 21 days.
8. A paused habit shown as a collapsed row on Habits.
9. The proactive "focus on fewer" suggestion in the first release, or later.
10. Approval of the minimum wordings in §7 (copy and safety review).
