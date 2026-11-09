# Schwung: 66-day experience and habit-science audit

This audit is based on the program engine as it stands on `main` after `372aace`. It changes no production code.

**How the evidence was produced**

- The engine code was read: `src/core/reset/pilot.ts`, `readiness.ts`, `progression.ts`, `comeback.ts`, `reflections.ts` and `reminders.ts`, along with the set-up and copy.
- Three people were simulated day by day through the real engine using `scripts/audit/__tests__/journey66.test.ts`. The simulation is read-only and only runs when asked: `AUDIT=1 npx jest scripts/audit`.

**How to read the evidence labels**

- **[Engine]** means the behaviour was measured in the simulation or follows directly from the code.
- **[UX]** means a judgement about how people are likely to experience it. Those are hypotheses to test with real people, not facts.

---

## 1. Executive summary

Schwung's foundations are sound and unusually humane:

- small starting targets;
- difficulty that changes only when the person chooses;
- no guilt in its words or reminders;
- weekly habits that never "miss" on rest days;
- a calm welcome back;
- a summit that never depends on consistency.

The engine is careful, and it is well tested.

The 66 days, however, are mostly a **calendar**, not a **process**. Three things decide whether a habit actually forms, and the program supports all three weakly:

1. **Cues.** Nothing ties a habit to a time or place. Reminders are off by default and never offered during set-up, and when on they are one daily nudge for everything. Repeating a habit in a stable context is the best-supported route to automaticity, and Schwung currently leaves that context to chance.
2. **What happens when someone struggles.** Most people start at Starter, the lowest level. A fading person at Starter can never be offered anything easier, and days the app wasn't opened don't count as evidence that someone is struggling. Their weekly answer "harder than expected" is met with "Easier: not available" for every habit.
3. **How a day counts.** With the recommended two to four habits, the 80% rule means every habit must be done every day. One miss resets the streak, and the "days completed" total stays low.
   - User A did something on 35 of 50 days but has 7 "days completed".
   - User B was solid for seven weeks but never had a streak longer than 6.

   The research the 66 days come from found that a single missed day did not set habit formation back. The engine treats it as a reset.

For the ambitious, the problem is different. Progression is real for some habits, but 22 of the possible phase step-ups change nothing at all, and offers stop once Mastery is reached at Day 45. After Day 66 there is no maintenance model: "Keep My Momentum" repeats the same targets indefinitely, with no reflections or adjustments. The welcome back no longer appears at all after Day 66 (a bug).

**The five highest-impact moves**, in order:

1. Give each habit an optional cue, and offer reminders on Day 1.
2. Add a real path down: an even smaller "minimum" level, a gentle reset after an absence, and fewer habits.
3. Count a day more like the science does: missing once is fine, the pattern matters.
4. Make every step up mean something, and keep progression going after Day 45.
5. Design the after-66 phase as maintenance, not more of the same.

---

## 2. Three simulated journeys

All three start on a Monday, `2026-01-05`. Days follow the engine's rules. "Opened" means the person opened the app that day: only then do offers, milestones, the welcome back and reflections appear.

### User A: the enthusiastic starter who fades

**Set-up:** age 30–49, no precautions, 45 min a day. Four habits, each at the suggested level, all of which are Starter:

- Read (10 min)
- Meditate (2 min)
- Move (10 min)
- Sleep Routine ("Up by 08:00", which is their own 07:00 wake time plus an hour's window)

The busiest day is 22 min.

**Behaviour:**

- Week 1: everything.
- Days 8–13: drops meditation.
- Days 14–30: two habits on two days in three.
- Days 31–50: one habit every other day.
- Days 51–65: doesn't open the app.
- Day 66: one habit.
- From week 2, answers every weekly reflection "Harder than expected".

| Day | What the engine shows / decides                                                                                                                          | Streak | Days completed | XP (level) |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- | ---------- |
| 1   | Full day                                                                                                                                                 | 1      | 1              | 60 (1)     |
| 7   | Full day. Milestone "One week in. Seven days of showing up."                                                                                             | 7      | 7              | 420 (3)    |
| 14  | 2 of 4 done: **missed** (the 80% rule needs 4 of 4)                                                                                                      | 0      | 7              | 620 (4)    |
| 15  | Reflection week 2: "harder". **Every** habit says "Easier: not available (this is already the easiest target)"                                           | 0      | 7              |            |
| 21  | Nothing done. Milestone "Foundation complete. Momentum targets open whenever you want them."                                                             | 0      | 7              | 700 (4)    |
| 30  | Momentum phase. Nothing changes for A (no offers either way)                                                                                             | 0      | 7              | 820 (5)    |
| 32  | Welcome back (two quiet days, 30–31)                                                                                                                     | 0      | 7              |            |
| 44  | Milestone "Momentum complete. The summit is in view."                                                                                                    | 0      | 7              | 890 (5)    |
| 45  | Mastery phase in name. Targets unchanged                                                                                                                 | 0      | 7              |            |
| 66  | Back after 15 days away: welcome back plus the week 9 reflection. 1 of 4 done: missed. **No summit** today                                               | 0      | 7              | 930 (5)    |
| 67  | Summit ceremony: "You made it. All the way up." Story: 7 of 66 days, longest streak 7, best week Week 1. Tracking and reminders now rest until A chooses |        |                |            |

**Findings**

- **[Engine]** No step-down was offered in 66 days. A starts at Starter Foundation, which has no easier level, so `progressionOffer` returns nothing. `P.easier` is blocked for all four habits.
- **[Engine]** A did at least one habit on **35 of the first 50 days**, and Day 66 too. The Journey and the Story record **7 days completed**: everything after Day 13 counts as "missed".
- **[Engine]** XP kept rising (level 5) while every visible measure of consistency stayed at zero.
- **[Engine]** The only way to lighten the load is removing a habit (`removeHabit`, allowed). Nothing ever suggests it: not the reflection, not the welcome back.
- **[UX]** The week 2 dip is where A needs a smaller version of the plan. Instead they repeatedly hear that easier isn't available, then see milestones ("Foundation complete") that don't match their weeks. Likely result: A stops opening the app around Day 14–30, which matches the simulated behaviour.

### User B: the inconsistent person who comes back

**Set-up:** age 18–29, 45 min a day. Three habits:

- Read at Starter
- Move at Standard (20 min), from "3–4 active days"
- Sleep at Starter

**Behaviour:**

- Days 1–4: everything.
- Days 5–11: away, app not opened.
- Day 12: back, does 2 of 3.
- After that: everything except one day a week.
- Accepts an easier target if offered; declines harder ones.

| Day                                        | What the engine shows / decides                                                                                                                                   | Streak | Days completed |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------- |
| 1–4                                        | Full days                                                                                                                                                         | 4      | 4              |
| 5–11                                       | Away: no tracking, no notes, nothing sent (reminders are off by default)                                                                                          |        |                |
| 12                                         | Welcome back ("one small step today is plenty"), the Day 7 milestone ("Seven days of showing up") and the week 1 reflection, all at once. Does 2 of 3: **missed** | 0      | 4              |
| 13                                         | A planned miss day: missed                                                                                                                                        | 0      | 4              |
| 14                                         | Full                                                                                                                                                              | 1      | 5              |
| 21                                         | Milestone "Foundation complete"                                                                                                                                   | 4      | 12             |
| 26                                         | First step-up offer (Read, Move); declined                                                                                                                        |        |                |
| 27, 33, 34, 40, 41, 47, 48, 54, 55, 61, 62 | **The same step-ups offered again every 7 days after each decline**: 18 offers in all                                                                             |        |                |
| 44                                         | Milestone                                                                                                                                                         | 6      | 32             |
| 66                                         | Full day: summit                                                                                                                                                  | 4      | 50             |

**Findings**

- **[Engine]** The welcome back doesn't change the day's rules. Its "one small step is plenty" is followed by a **missed** day for doing 2 of 3. Recovery starts with a failure.
- **[Engine]** No step-down was offered after the absence. Days the app wasn't opened count as _unknown_ in `readiness()`, so with only 4 recorded days the outcome is "insufficient data". This protects people from being pushed down by missing data, but it also means **an absence never triggers any help**.
- **[Engine]** With three habits the 80% rule needs all three. B completed 50 of 66 days, but a weekly miss meant the **longest streak was 6**, and that is what the summit and Story celebrate.
- **[Engine]** Each decline holds an offer back for 7 days only (`declineCooldownDays`), with no limit on repeats: 18 prompts over 6 weeks.
- **[Engine]** The Day 7 milestone was shown on Day 12, after a week away. Its words ("Seven days of showing up") weren't true for B.
- **[UX]** Day 12 is the most fragile day in B's journey: three overlays, a word of encouragement, and then a miss. A "restart" framing would serve B better: a lighter first day back, with the streak counting from the return.

### User C: the ambitious person who wants more

**Set-up:** age 30–49, 90 min a day, "5+ active days", strength "regular" at 3 sessions a week. Five habits:

- Get It Done at Starter, 3 workdays
- Read at Starter
- Move at Challenge (30 min)
- Sleep at Starter
- Strength at Challenge (3 sessions)

**Behaviour:** does everything asked, every day. Says "too easy" on every habit on Day 8. Accepts every step up.

| Day   | What the engine shows / decides                                                                               | Busiest day |
| ----- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| 1     | Full                                                                                                          | 40 min      |
| 9     | Early step-ups (90% done and "too easy"): Read, Move, Sleep to Momentum from Day 10                           |             |
| 15    | Get It Done and Strength step up to Momentum (from the next Monday)                                           |             |
| 22    | Momentum phase opens. **Strength at Challenge, Momentum is the same target** as Foundation: 3 sessions a week | 55 min      |
| 45    | Mastery opens: all five offered a step up and accepted. **Strength's is identical again**                     |             |
| 46–66 | **No more offers.** Read stays at 20 min, Move at 45 min. 65 of 90 minutes in use                             | 65 min      |
| 66    | Summit. 66 of 66 days, streak 66, level 20                                                                    |             |

**Findings**

- **[Engine]** 2 of C's 10 accepted step-ups changed nothing. Across the catalogue, **22 phase step-ups have an identical target**:
  - Meditate, Outdoor time and Eat Well never change within an intensity.
  - Strength never changes at Challenge, nor at Starter from Momentum to Mastery.
  - Less Scrolling doesn't change at Challenge from Momentum to Mastery.

  Readiness still offers these, and "Make it harder" allows them.

- **[Engine]** Once a habit reaches Mastery, readiness offers nothing more. Moving on to the next intensity is possible only through "Make it harder", which the person has to find for themselves (Read, Sleep and Get It Done could still go up a level at Day 66).
- **[Engine]** Early step-ups need "too easy" feedback given **after** the current target began. C's Day 8 feedback didn't carry over to Momentum, so nothing new was offered between Days 10 and 45.
- **[UX]** C's last three weeks are flat: no new challenge, offers or information. That's when ambitious people look elsewhere. Their best signal of mastery, 66 days in a row, ends in a summit with no "what next for this habit".

### After Day 66 (all three)

- **[Engine]** If no choice is made, tracking and reminders pause (`awaitingChoice`). User A, who would benefit most from a quiet reminder, gets none from Day 67.
- **[Engine]** With "Keep My Momentum", targets stay as they were with no end. There are no offers (`offersNow` returns nothing after Day 66), no reflections and no milestones.
- **[Engine]** **Bug:** after Day 66 the welcome back never appears. `absenceStart` reads `dayCells`, which only covers Days 1–66. In the simulation, a 10-day absence on Days 81–90 produced no welcome back on Day 91.

---

## 3. What Schwung already does well

These are behavioural-science strengths, each in the code:

- **Starting small, and the person chooses.** Starter is suggested unless baseline answers justify more. Movement, Strength and Scrolling use active days, sessions and app minutes. Set-up says "Two to four is a good start" and checks the busiest day against the time the person has. This supports confidence that they can succeed (self-efficacy).
- **Autonomy over difficulty.** Phases only make targets _available_. Every change, up or down, is offered and needs the person's yes. Readiness needs real evidence: at least 7 recorded days, and 80% done to step up. Unknown data never makes a habit look ready, and never pushes one down.
- **No guilt.** The reminders rule out "guilt, urgency or streak threats". They go quiet after 14 days, skip a day that's already complete, and only name habits on the lock screen when asked. The welcome back is calm and shown once per absence. The summit never depends on consistency. Rest days and weekly habits are never misses.
- **Weekly habits are modelled honestly.** "Any 4 days a week" counts by the week. A day without the habit is never a miss.
- **Reflection without automation.** The weekly question never changes anything by itself. It leads to a preview and needs confirmation.
- **Safety gating is real.** Health precautions gate Movement and Strength. "Rather not say" keeps Strength closed until a professional is consulted. An irregular or shift wake time keeps Sleep closed. People under 18 cannot start a program.
- **Partial effort is recognised** (5 XP), and an undo always takes XP back. Nothing is ever awarded twice.

---

## 4. The five most consequential weaknesses (ranked by impact on outcomes)

### W1. Habits have no cue (highest impact)

- **Evidence [Engine]:**
  - There is no "when/where/after what" anywhere: not in set-up (`PilotSetup` steps are age, health, habits, baselines, levels, time and review), not on a habit, and not in the person's own habits (a name, a note and how often).
  - Reminders are `enabled: false` by default (`DEFAULT_REMINDERS`), live only in Settings, are never mentioned in set-up or on Day 1, and are one time a day for all habits.
- **Why it matters:**
  - Habits are learned through repetition in a consistent context.
  - Planning _when and where_ ("implementation intentions") reliably helps people act on intentions; meta-analyses report medium-sized effects.
  - Without a cue, every day depends on remembering and on motivation, which is exactly what fades after week 1 (User A).
- **What it is not:** a case for more notifications. One optional cue per habit, used by an optional reminder, is enough.

### W2. There is no path down from where most people start

- **Evidence [Engine]:**
  - `easierLevel(starter/foundation) = null`, so the struggling outcome never produces an offer at Starter, and "Make it easier" is blocked.
  - Absences produce "unknown" days, which never count toward struggling.
  - The "harder" reflection answer lists "Easier: not available" for every Starter habit.
  - Removing a habit is possible but is never suggested.
  - **Result:** A received **0** adjustment offers in 66 days, and B none after a week away.
- **Why it matters:** missed days and falling off are the normal course of habit building. Recovering depends on making the next action easy, either a smaller version or fewer habits. Schwung only offers that from Standard upwards.

### W3. With one to four habits, the day-counting rule is all-or-nothing

- **Evidence [Engine]:**
  - The 80% rule (`dayQualifies`) needs 1 of 1, 2 of 2, 3 of 3 and **4 of 4**. Only from 5 habits is one miss allowed, yet set-up recommends two to four.
  - Partial progress never counts toward a day.
  - A was active on 35 of 50 days and has 7 completed. B has a longest streak of 6 across 50 completed days. B's first day back counts as missed.
- **Why it matters:**
  - In the study behind "66 days", missing a single opportunity did not materially affect the growth of automaticity. A rule that resets on any miss shows people a less accurate picture than the science, and invites an all-or-nothing reaction (sometimes called the "what-the-hell effect").
  - The Journey, the Story and the summit all report these numbers.

### W4. Progression is shallow for some habits and stops at Day 45

- **Evidence [Engine]:**
  - There are 22 step-ups that change nothing, and they are still offered.
  - Nothing is offered past Mastery within the intensity the person chose.
  - Early step-ups need fresh "too easy" feedback for each new target.
  - Someone who declines is re-offered every 7 days without limit (B: 18 offers).
- **Why it matters:** if a step up changes nothing, the person learns that "progress" here is cosmetic. If it stops at Day 45, an ambitious person's last three weeks are flat. Repeated prompts after a "no" wear down trust and autonomy. Both cost motivation.

### W5. There is no maintenance design after Day 66

- **Evidence [Engine]:**
  - When the program ends, it pauses tracking and reminders until a choice is made.
  - "Keep My Momentum" keeps every target and daily check-in unchanged indefinitely, with no reflections, adjustments or milestones.
  - The welcome back is broken after Day 66.
- **Why it matters:**
  - Habit strength keeps changing after any fixed date. People finish at very different points: in the study behind the 66-day figure, the time to plateau ranged from 18 to 254 days.
  - Maintenance is a different job from acquisition. It involves:
    - fewer check-ins;
    - deciding which habits to keep, lighten or retire;
    - noticing lapses early.

  A program that ends with "same again, forever" or "nothing" risks losing the gains at the moment they need consolidating.

---

## 5. Bugs and data-integrity risks (separate from design)

| #   | Severity | Issue                                                                                                                                                            | Evidence                                                                                                               |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| B1  | Medium   | The welcome back never appears after Day 66 (Keep My Momentum)                                                                                                   | `absenceStart(dayCells(p, 91), 91)` returns `null` after a 10-day absence. `dayCells` stops at Day 66 (`charts.ts`)    |
| B2  | Medium   | Step-ups and "Make it harder" to an identical target are offered and accepted as if they were progress                                                           | 22 combinations (see W4). `progressionOffer` and `checkLevel` don't compare targets, except for Less Scrolling's floor |
| B3  | Low      | Milestone words describe effort that may not have happened ("Seven days of showing up" on Day 12 after an absence; "You made it. All the way up." after 7 of 66) | `milestoneDue` and `summitDue` are intentionally independent of consistency; only the copy assumes it                  |
| B4  | Low      | The welcome back ("one small step today is plenty") contradicts the day rule (a small step is a missed day)                                                      | B, Day 12                                                                                                              |

**Status:** B1 and B2 are fixed (66-day improvements, Step 1).

- **B1:** the welcome back is decided over the program's tracked days (`comeback.ts` `programAbsence`). Days 1–66 are judged exactly as before. With Keep My Momentum, later days are judged by the same rule, and the pause before a later choice is never part of an absence. Nothing is welcomed while the program waits for a choice.
- **B2:** a step up is a change of what the person is asked (`readiness.ts` `sameTarget`, `nextRealPhase`, `nextRealHarder`).
  - Offers and "Make it harder" pass over levels that ask the same.
  - Nothing is offered when no real step is left.
  - The catalogue has 21 such phase steps. The 22nd in this audit, Less Scrolling at Challenge, is personal: both limits reach that person's floor, and the existing "lowest" check refuses it.

  Saved programs and every day count are unchanged.

**Data integrity:** no risk was found in this audit. Every derived number (XP, streak, days completed, offers) is recomputed from the saved days, undo is exact, and nothing in these flows writes data the person didn't cause. No bug was found here that loses or corrupts data.

---

## 6. Personalisation review

| Set-up answer                                                                         | What it changes today                                                                                                                            | Verdict                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Age                                                                                   | Under 18 is blocked. 65+ adds a Strength note. **18–29, 30–49 and 50–64 change nothing**                                                         | Keep it as an age gate. The bands themselves deliver no value; a single "18 or older" would do                                                                     |
| Health precautions                                                                    | Joint, walking difficulty, heart and pregnancy gate Movement and Strength, and add notes. **"Fluid limit" and "sleep condition" change nothing** | Either use them (a sleep condition should at least add a note to Sleep Routine and pause wake-window step-ups; a fluid limit has no matching habit) or remove them |
| Time a day                                                                            | Only a ceiling check on the busiest day, and a check on step-ups                                                                                 | Useful as a guard. It could also guide how many habits to start with                                                                                               |
| Habit-specific baselines (active days, strength start, app minutes, wake time, skill) | Choose the starting intensity, the targets (wake window, scrolling limit) and eligibility                                                        | Good: each one changes the plan                                                                                                                                    |
| "Suggest three"                                                                       | Always Read, Move and Sleep, whatever the answers                                                                                                | Fine as a default. It ignores everything the person just said                                                                                                      |

**Main gaps:**

- There is no cue or context (W1).
- Later adjustments use only completion data. The program never learns _when_ someone succeeds (weekday, time of day), although Insights already works out the best weekday.

No new set-up questions are recommended, except one optional cue per habit, which can be asked on the habit itself rather than in set-up.

---

## 7. Retention and motivation by stage

| Stage                        | What happens now                                                                       | Risk                                                | Mechanism that would help (not more gamification)                                               |
| ---------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Days 1–3                     | Day 1 ceremony. Quick early XP (the first collectible at 60 XP). No reminder offered   | Day 2 depends on memory                             | Offer a reminder or cue at the end of Day 1 [UX]                                                |
| Days 8–14 (excitement fades) | Week 1 reflection on Day 8. One miss resets the streak (with ≤4 habits)                | The first visible "0" lands just as motivation dips | A miss-tolerant day rule (W3); a gentler response to "harder" (W2)                              |
| First missed day             | The streak resets. No message (the welcome back needs 2+ quiet days)                   | The all-or-nothing reaction                         | "Never miss twice" framing: one miss changes nothing visible                                    |
| Back after a week            | Welcome back, a stale milestone and a reflection at once; the first day back is a miss | Three overlays, then a failure                      | A restart day: lighter targets for a day or two, offered and not imposed; one overlay at a time |
| Phase changes (Days 22, 45)  | A milestone with a name. Targets change only if an offer is accepted                   | Phases feel like labels                             | Tie each phase to a real, meaningful step, and skip it when the step is identical               |
| Final two weeks              | Nothing specific                                                                       | The summit arrives without a plan                   | A Day 60 review: per habit, keep / lighten / retire (W5)                                        |
| After Day 66                 | A choice is required. Tracking and reminders pause until then                          | Habits stall at their most valuable point           | A maintenance mode: lighter check-ins, reminders continue, offers to lighten                    |

**On motivation:**

- XP, levels and the collection are pleasant and well bounded (an undo takes XP back, and nothing is awarded twice). But XP rose for User A while every consistency signal stayed at zero, so it rewards activity, not progress toward automaticity.
- The weekly rhythm (reflection, a weekly summary, an adjustment if wanted) is the right mechanism for keeping people engaged. It's well built, and only needs the missing actions behind it: smaller versions, removing a habit, cues.

---

## 8. Recommendations

### Quick fixes (small, contained, low risk)

1. **Fix B1:** compute the welcome back from tracked days after Day 66 as well.
2. **Never offer an identical target (B2):** skip phases with the same target (go straight to the next real step, or offer nothing), and do the same in "Make it harder".
3. **Respect a "no":** after two declines of the same step-up, stop offering it until the person says "too easy" or answers a reflection "easier".
4. **Truthful moments (B3):** give the milestone and summit copy variants that don't claim effort. Example: "Day 7. Wherever this week took you, the climb is still yours."
5. **Make the welcome back match the rules (B4):** either the first day back gets a lighter rule (see 7), or the copy stops promising that a small step is enough.
6. **Offer reminders once, on Day 1** (after the ceremony, one card, off unless chosen). No new set-up question.
7. **Suggest removing a habit or making it easier** when a reflection says "harder" and nothing can be made easier.

### Bigger product decisions

- **D1. A per-habit cue (W1):** an optional "after … / at …" on each habit, shown on its card. It could drive optional per-habit reminders instead of one daily ping. This is the single biggest lever for automaticity.
- **D2. A real floor and a restart (W2):** a "minimum" level below Starter (two-minute versions), and a restart after an absence: on return, offer lighter targets for the first week, with the streak counting from the return. Also suggest focusing on fewer habits after three struggling weeks.
- **D3. Count days like the science (W3).** Options, best first:
  - (a) A day counts if _most_ of its habits are done, with partial progress counting as half.
  - (b) Streaks per habit, with "one miss is fine, two in a row ends it".
  - (c) Keep the 80% rule but round down, so 3 of 4 counts.

  This changes Journey, Story and summit numbers, and existing programs would need a decision on whether past days are re-scored.

- **D4. Progression that means something (W4):** real targets for the flat habits (meditation length, time outdoors, balanced meals), and offers to move up an intensity after Mastery, ready-gated as now.
- **D5. Maintenance after 66 (W5):**
  - A Day 60 review that decides which habits to keep, lighten or retire.
  - After 66, a maintenance mode with weekly check-ins instead of daily ones.
  - Reminders that carry on, gentle offers to lighten, and the welcome back working.
  - "New Ascent" stays for people who want a new climb.

---

## 9. Prioritised roadmap

| Order | Item                                                                                                                                 | Type             | Why now                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------- |
| 1     | B1 welcome back after Day 66; B2 no identical step-ups                                                                               | Bug fixes        | Small, testable, and fixes promises the app already makes                             |
| 2     | Respect a "no" (decline limit); truthful milestone and summit copy; welcome back consistent with the rules                           | Quick fixes      | Low risk, restores trust                                                              |
| 3     | A path down: suggest removing a habit or making it easier from a "harder" reflection, then D2 (minimum level, restart after absence) | Product          | Biggest effect on the people most likely to drop out (A, B)                           |
| 4     | D3 day counting                                                                                                                      | Product decision | Changes what every screen reports; decide once, with re-scoring rules                 |
| 5     | Reminders offered on Day 1, then D1 per-habit cues                                                                                   | Product          | The main lever for automaticity; needs design for cue wording and per-habit reminders |
| 6     | D4 progression content and post-Mastery offers                                                                                       | Content + engine | Keeps ambitious people engaged through Days 45–66                                     |
| 7     | D5 Day 60 review and maintenance mode                                                                                                | Product          | Protects outcomes after the program, where gains are kept or lost                     |

---

## 10. On the science (and its limits)

- **The 66 days.** The number comes from a single study (Lally et al., 2010, 96 participants, self-reported automaticity). The _median_ time to plateau was 66 days, and individuals ranged from 18 to 254. Some never plateaued. Simpler behaviours plateaued sooner. The program uses the number as a structure, and should never imply that habits are automatic by Day 66. The current copy doesn't claim this; keep it that way.
- **Missing once.** In the same study, a single missed opportunity did not materially affect the automaticity curve. This is why W3 matters.
- **Cues and context.** Context-stable repetition and implementation intentions ("if-then plans") are among the better-supported tools for making new behaviour stick. The size of the effect varies by behaviour and population.
- **Rewards.** Points and streaks can help early repetition. Evidence on extrinsic rewards suggests they can weaken intrinsic interest when they feel controlling. Schwung's calm, optional framing is the right side of that line; it should stay there as streak and day-counting rules change.

---

## Appendix: reproducing the simulations

```
AUDIT=1 npx jest scripts/audit
```

It prints each person's checkpoint days (1, 7, 14, 21, 30, 44, 45 and 66), their events and offers, the catalogue's targets at every level, and these probes:

- the 80% rule's requirements;
- an all-11 set-up;
- step-ups that change nothing;
- A's "make easier" attempts;
- the post-summit welcome back.

Without `AUDIT=1` the file is skipped, so the regular suite is unchanged.
