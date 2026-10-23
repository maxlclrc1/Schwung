# Schwung Habit Science 2.0 — Final Product Specification (revision 3)

**Status:** proposal for approval. No app code, habit library, quiz, saved data or program behavior has been
changed.
**Supersedes:** revision 1 of this document. **Builds on:** `HABIT_SCIENCE_AUDIT.md`.

**How to read this.**
- **[AGREED]** is an owner decision.
- **[PROPOSED]** is Claude's design, for approval.
- **[FACT]** is the current code.
- **[PRODUCT]** is a number or target chosen by product judgment, not taken from research.
- **[VERIFY]** is a scientific or safety claim not yet verified.

**Nothing in this document has been verified against a source.** No research results with citations have
been supplied so far, so every evidence status below reads *unverified*. "Expected strength" is only a
prioritization hint for research.

---

## R3. Final corrections (revision 3, approved direction, not implemented)
**This section supersedes earlier sections wherever they conflict.** The affected rows in B.2 are marked
"→ R3".

### R3.1 Change log
| # | Change | Supersedes |
|---|---|---|
| 1 | **Strength starter (#7) is no longer automatically assigned.** It becomes a voluntary, add-only "preparation routine". It never counts toward the fitness goal guarantee, and its copy says plainly that it is **not** equivalent to recommended strength sessions | B.2 #7, B.4, D.5 |
| 2 | **Bedtime (#2) now starts from the user's actual bedtime** and moves 15 min earlier per rung, capped by an age-based ceiling. It's offered only when reported sleep is below the age band, and **never** with trouble 3+ nights, a diagnosed sleep condition, or (new) trouble 1–2 nights | B.2 #2, C.5, A.2 question W |
| 3 | **Fruit and veg (#8) is a behavioral check-off, not a nutrition measure.** The portion definition is aligned with WHO, and the copy separates the habit from meeting dietary guidelines | B.2 #8, A.2 question 5a |
| 4 | **Established routines:** never recommend the same behavior a user already does consistently (Make Your Bed excepted). A harder variation only if the spec declares it a **new behavior** | D.3 |
| 5 | **Plan size:** aim for 5 suitable daily habits. With only 4, a short "choose one more" step offers eligible alternatives and explains the 80% implication | B.1, D.1 step 3, H3 |
| 6 | **WHO and CDC population guidance added** (R3.3), kept separate from product-defined targets. No ladder is called clinically validated | G |
| 7 | **Owner decisions applied** (R3.4) | H |

### R3.2 Updated habit specifications (affected habits only)

**#2 `sleep_bedtime`: Earlier bedtime** (spec 2, R3)
- **Population guidance** (R3.3): CDC: teens 8–10 h, adults (18–60) 7 h or more.
- **Product target:** small, stepwise moves from the user's own bedtime. Not a prescription to reach a number.
- **Offered only if all of these hold:**
  - reported sleep is below the age band (teen: under 8 h; adult: under 7 h)
  - trouble sleeping is `rarely`
  - no diagnosed sleep condition is reported
  - precautions are not "unknown" (a skipped safety question is treated as unknown) [PROPOSED: offer with a
    note instead? → R3.5 Q2]
- **Inputs** (conditional screen W, extended): "What time do you usually get up on school or work days?" and,
  **only when this habit is a candidate**, "What time do you usually fall asleep on those nights?" Both use
  time pickers with no preset; "It changes a lot" and "I work shifts or nights" are options.
- **Ladder** [PRODUCT]: "In bed by {usual bedtime − 15 / 30 / 45 / 60 min}".
  - **Ceiling:** no rung may put time in bed above (wake − bedtime) = teen 10 h, adult 9 h [PRODUCT; VERIFY].
    Rungs beyond the ceiling are removed. If fewer than 3 remain, the habit isn't offered.
  - Varies/shift: "Lights out 15 / 30 / 45 / 60 min earlier than usual".
- **Why** (claim-free until reviewed): "Getting to bed a little earlier than you do now."

**#7 `move_strength_snack`: Strength preparation routine** (spec 2, R3)
- **Assignment:** **never automatic.** It's available only through the 4-habit choice step (R3.1 #5),
  through swaps, or through Add, and only when eligible.
- **Eligibility:** ages 16+. Excluded with heart/BP or pregnancy. Gentle variant for joint/back, 65+, or
  unknown precautions.
- **Ladder** [PRODUCT]: 1 set of 1 move · 1 set of 2 moves · 1 set of 3 moves · 2 sets of 3 moves (squats or
  sit-to-stands, wall or knee push-ups, glute bridges), stopping well before exhaustion.
- **Mandatory copy:** "This is practice to build a strength routine. It isn't a full strength workout.
  Health guidelines recommend muscle-strengthening activity for all major muscle groups on 2 or more days a
  week." The WHO and CDC basis is in R3.3.
- **Goal role:** support only. The fitness goal guarantee is met by Walk (#6) in V2.0, and by the scheduled
  strength session (#22) once that's approved.
- **Interim limitation:** V2.0 can't schedule strength sessions, so fitness plans in V2.0 don't include
  guideline-level strength training. The plan reveal for the fitness goal states this:
  - users not already training get: "Strength sessions a few times a week will come in a later update; you
    can add a starter routine now."
  - users already training twice a week or more get: "You're already training. Keep it up."

**#8 `food_produce`: Fruit and veg** (spec 2, R3)
- **Population guidance** (R3.3): WHO: at least 400 g of fruit and vegetables a day (about five portions),
  not counting potatoes, sweet potatoes, cassava and other starchy roots.
- **Quiz 5a, revised:** "On a typical day, how many portions of fruit and vegetables do you eat? A portion is
  about a handful (roughly 80 g). Potatoes don't count." Options unchanged.
- **Ladder** [PRODUCT]: "Add a portion of fruit or veg to 1 / 2 / 3 / 4 of today's meals or snacks". Start rung
  = baseline + 1 (hardly any → 1; 1–2 → 2; 3–4 → 3). At 5+ the habit isn't offered.
- **Mandatory copy:** "This builds the habit of adding fruit and veg. It doesn't measure whether your diet
  meets nutrition guidelines." The app never says "you're eating enough".
- Teens: allowed (additive only).

**#9 `food_sugary_drinks`: Unsweetened drinks** (adults only; spec 2, R3; positively framed)
- **Population guidance** (R3.3): WHO: keep free sugars under 10% of energy intake (further reduction to
  under 5% is a conditional recommendation). Fruit juice counts as free sugars.
- **Ladder** [PRODUCT]: "Choose water or an unsweetened drink instead of a sugary one, 1 time / 2 times
  today" · "All your drinks today are unsweetened".
- **Start:** sugary drinks `most` days → rung 0; `some` → rung 1; `rarely` → not offered.
- **Never offered to under-18s.** No weight or calorie language.
- **Why:** "Picking an unsweetened drink is an easy swap."

**#10 `food_water_meals`: Water with meals** (add-only, unchanged)
- Never automatic. No quantities beyond "a glass".
- Excluded with a fluid limit.

**#18 `focus_top3`** (routine rule, R3.1 #4)
- If "Planning my day" is a routine, the writing rung is the same behavior, so it's skipped. The habit is
  offered only from rung 1 ("…and work on it for 10 min first"), because acting on the top task is a new
  behavior. The ladder window then starts at rung 1.

**Routine map (D.3, revised)** [PROPOSED]
| Routine | Effect |
|---|---|
| Reading 10+ min | `mind_read` excluded |
| Breathing / meditation | `mind_breathe` excluded |
| Journaling | `mind_journal` excluded |
| Planning my day | `focus_top3` only from rung 1 (new behavior: starting the task) |
| A 30+ minute walk | `move_walk` excluded (longer walks aren't a new behavior) |
| Phone out of reach 30 min before sleep | `sleep_no_phone_bed` excluded |
| Making my bed | Foundation stays [AGREED]; reason: "You already do this, so it's an easy first check" |

Each spec declares `routineUpgradeFrom?: rung` only where a higher rung is a genuinely different behavior.
Tests assert that no excluded routine behavior appears in any plan.

**Plan size and the choice step** (D.1 step 3, revised) [PROPOSED]
- The engine fills only with **suitable** habits (need ≥ 1, or a goal habit). Target: **5**. Six only when the
  goal guarantee adds one.
- **If only 4 are suitable** (foundation included), the plan screen shows **"Choose one more?"** with up to
  3 *eligible* alternatives:
  - they pass every age, safety, routine and duplicate filter, but weren't needed;
  - #7 appears here when eligible;
  - a "Keep 4 habits" option is also shown.
- **80% implication** (mechanic unchanged; the copy explains it):

  | Habits | A day counts at |
  |---|---|
  | 4 | all 4 (3 of 4 is 75%) |
  | 5 | 4 of 5 |
  | 6 | 5 of 6 |

  Choice-step copy: *"With 4 habits, a day counts when all 4 are done. With 5, one can slip."*
- **3 habits** remains the floor for manual removals [FACT]; the engine never proposes fewer than 4.

### R3.3 Population guidance (WHO and CDC)
**Retrieval note:**
- Confirmed on 2026-10-23 through web search results that cite these official pages.
- **This environment couldn't open who.int or cdc.gov directly** (network policy), so exact wording and
  currency must be re-checked on the pages before any of it is quoted in the app.
- These are population recommendations. **Schwung's ladders are product-defined habit steps.** None is
  clinically validated, and none may be described as such.

| Topic | Guidance | Source |
|---|---|---|
| Adult activity (18–64) | 150–300 min/week moderate aerobic activity, or 75–150 vigorous, or an equivalent mix; muscle-strengthening (major muscle groups) on 2+ days/week | WHO 2020 guidelines; [WHO physical activity](https://who.int/initiatives/behealthy/physical-activity) |
| Adult activity (CDC) | 150 min/week moderate (or 75 vigorous); muscle-strengthening for all major muscle groups on at least 2 days/week; e.g. 30 min × 5 days; bodyweight exercises count | [CDC Adult Activity](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) |
| Older adults (65+) | Same as adults, plus balance activities; those with poor mobility do balance-focused activity 3+ days/week | [WHO physical activity](https://who.int/initiatives/behealthy/physical-activity); [CDC Older Adults](https://www.cdc.gov/physical-activity-basics/guidelines/older-adults.html) |
| Adolescents (5–17, so includes 16–17) | An average of 60 min/day moderate-to-vigorous, mostly aerobic, across the week; vigorous aerobic and muscle- and bone-strengthening on at least 3 days/week | [WHO Guidelines at a glance](https://iris.who.int/server/api/core/bitstreams/f3885485-e7eb-4504-8026-edd9bb53a6ee/content) |
| Sleep | Teens 8–10 h (CDC lists 13–17 on one page, 13–18 on another; based on AASM); adults 18–60 at least 7 h | [CDC About Sleep](https://www.cdc.gov/sleep/about/index.html); [CDC Sleep and Health (schools)](https://www.cdc.gov/healthy-schools/sleep/index.html) |
| Fruit and vegetables | At least 400 g/day (about five portions), excluding potatoes, sweet potatoes, cassava and other starchy roots | [WHO Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) |
| Free sugars | Under 10% of energy intake (strong); under 5% suggested (conditional); free sugars include fruit juices, honey and syrups | [WHO Healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet) |

**How Schwung uses this:**
- **Product decisions informed by the guidance:**
  - the age-band sleep thresholds (R3.2 #2)
  - the strength copy (2+ days/week)
  - the produce portion definition
  - teen activity framing
- **Product targets the guidance does not set:**
  - 15-min bedtime steps
  - walk rungs
  - "add a portion to N meals"
  - "swap 1–2 drinks"

### R3.4 Owner decisions applied
| Decision | Applied as |
|---|---|
| Under-16 stop screen | C.1, final. No data saved |
| Conditional wake-time question | Screen W, shown only when needed, now also asking usual sleep time when Bedtime is a candidate |
| Personalized baseline for V2 swaps | V2 swaps start at the user's baseline window (F.7); V1 swaps unchanged (legacy library, phase level) |
| No cold exposure in V2 | `discipline_cold` is not in the V2 library at all (not in auto, swap or add); V1 plans keep it |
| Hydration optional, add-only | #10 unchanged: never automatic, no quantities |
| Adult sugary-drink habit, positively framed | #9 "Unsweetened drinks", adults only |
| Scheduled strength: designed, not implemented | #22 and section E stay design-only; V2.0 is daily-only |
| Voluntary upgrade deferred | No "Try the new plan" in V2.0; V1 users get V2 only by choosing Restart |

**Still open:**
- **H1:** the App Store age rating.
- **H4:** release gate (may habits ship with claim-free explanations before their evidence is verified?).

### R3.5 Unresolved safety questions
1. **Skipped safety question and Bedtime:** with precautions unknown, should Bedtime be withheld (current R3
   rule) or offered with a note? An undiagnosed sleep disorder can't be ruled out either way.
2. **Insomnia symptoms 1–2 nights a week:** R3 withholds bedtime extension. Confirm with sleep-medicine
   guidance (CBT-I principles), and settle the wording that suggests seeing a professional for frequent
   sleep trouble or possible sleep apnea.
3. **Sleep ceilings:** time-in-bed caps of teen 10 h and adult 9 h are product choices. Confirm they
   don't encourage excessive time in bed.
4. **Strength preparation routine:** confirm the gentle-variant moves are safe for 65+ and for joint/back
   reports, and whether heart/BP should exclude it or allow it with clinician advice.
5. **Pregnancy and postpartum:** walking-note wording; whether any movement habit needs a stronger referral
   line.
6. **Teen nutrition:** confirm the additive produce habit and its copy carry no risk for teens with
   disordered-eating history; whether the food opt-out should be more prominent.
7. **Sugary-drink habit for adults with diabetes or on glucose management:** neutral copy is fine, but should
   the app add "follow your care plan"?
8. **Activity notes for heart/BP** (walking): exact wording that avoids sounding like medical clearance.
9. **Breathing:** confirm the slow-breathing doses carry no cautions (e.g. panic disorder, pregnancy) beyond
   avoiding breath-holding.
10. **Under-16 handling** versus the App Store age rating and regional consent rules.
11. **Re-check every R3.3 figure** on the primary pages; confirm the CDC teen age band (13–17 or 13–18) and
    that the WHO draft caveat about the 60-min threshold doesn't affect the final adolescent guidance.

---

## 0. Agreed principles [AGREED]
1. **Audience:** one app for **ages 16–17 and adults 18+**; designed for 16+. The six primary goals stay.
2. **Plans:** 5–6 habits, minimum 3. 66 days, with Foundation / Momentum / Mastery.
3. **Selection** is baseline-aware and age-appropriate. Inputs: age, sleep, activity, nutrition, digital
   behavior, routines, optional precautions.
4. **Not collected:** height, weight or BMI. **Never offered:** calorie counting, weight-loss targets or
   fasting challenges (for anyone), and no restrictive diet for minors.
5. **Mechanics unchanged:** daily 80% success, XP, streaks, early level-up (7 in a row, offered), step-down
   (3 misses), and the mandatory day-22 and day-45 level-ups.
6. **"Make your bed"** stays the always-first foundation habit.
7. **Cold exposure** is retired from automatic recommendations. **Hydration** is optional, with no universal
   amounts. **Reading** is measured in minutes.
8. **Existing users:** active V1 plans and their targets are preserved. V1 swaps stay within the legacy
   library. Any upgrade is voluntary.
9. **Technical limits:** offline, deterministic, no account, backend, analytics, AI messages or new
   libraries; works in Expo Go.

---

## A. Onboarding quiz [PROPOSED]

### A.1 Shape
- **8 main screens.** The last one (precautions) is optional and can be skipped with one tap.
- **Up to 4 conditional follow-ups**, shown only when their answer changes the plan:
  - 3 appear inline on the screen they belong to, so they add a tap but not a screen.
  - 1 (wake time) is its own screen.
- **No defaults are pre-selected.** Every answer is an explicit choice (the wake-time picker starts empty).
  A skipped or unknown answer is never treated as "no problem" (see C.4).

### A.2 Questions
| # | Screen / question (exact copy) | Options (stored value) | Shown when | Effect on the plan |
|---|---|---|---|---|
| 1 | **How old are you?** | Under 16 (`u16`) · 16–17 (`16_17`) · 18–29 (`18_29`) · 30–49 (`30_49`) · 50–64 (`50_64`) · 65 or older (`65p`) | Always | `u16` → stops onboarding (C.1). `16_17` → teen rules. 50+ → strength follow-up is shown; 65+ → gentlest movement variants |
| 2 | **What do you want most right now?** | More energy (`energy`) · Better focus (`focus`) · More discipline (`discipline`) · More confidence (`confidence`) · Less stress (`calm`) · Get in shape (`fitness`) | Always | Goal habits and core-goal guarantee (D) |
| 3a | **Sleep. How many hours do you usually sleep on a school or work night?** | Less than 6 (`lt6`) · 6 to 7 (`6_7`) · 7 to 8 (`7_8`) · 8 to 9 (`8_9`) · More than 9 (`gt9`) | Always | Sleep-duration need, scored against the age band (C.2) |
| 3b | *(same screen)* **How often do you have trouble falling asleep, staying asleep, or waking too early?** | Rarely (`rarely`) · 1–2 nights a week (`some`) · 3 or more nights a week (`most`) | Always | `most` → no bedtime extension; wind-down, steady wake-up and morning light instead, plus a "worth talking to a professional" note [VERIFY wording] |
| 4a | **Activity. On how many days a week do you do at least 20 minutes of activity that makes you breathe harder?** *(brisk walking, cycling, sport, running)* | 0 · 1–2 · 3–4 · 5 or more | Always | Aerobic baseline: walk start rung; walk not offered at 5+ unless the goal is energy or calm |
| 4b | *(same screen)* **Do you do muscle-strengthening exercise?** *(weights, bodyweight exercises, bands, climbing)* | Not at the moment (`none`) · About once a week (`1`) · Twice a week or more (`2p`) | Goal is fitness or confidence, **or** age 50+ | Strength baseline. **Independent of 4a**; one never implies the other |
| 5a | **Food. On a typical day, how many servings of fruit and vegetables do you eat?** *(a serving is about a handful)* | Hardly any (`0`) · 1–2 (`1_2`) · 3–4 (`3_4`) · 5 or more (`5p`) · I'd rather skip food questions (`skip`) | Always | Fruit-and-veg baseline. `skip` → no food habits (same as the precaution) |
| 5b | *(same screen)* **How often do you have sugary drinks?** *(soda, energy drinks, sweetened coffee or tea)* | Most days (`most`) · A few times a week (`some`) · Rarely or never (`rarely`) | **Adults only** (18+), and 5a ≠ `skip` | Adults: whether the sugary-drink habit is a candidate, and its start rung. Never asked of teens |
| 6a | **Phone. Outside work or school, about how long are you on your phone each day?** | Under 1 h · 1–2 h · 2–4 h · 4–6 h · 6 h or more · Not sure (`unknown`) | Always | Digital need. `unknown` is **not** treated as low: it uses behavior-based digital habits only (no time limits that need a number), and the reason says "Check Screen Time in Settings for your number" |
| 6b | *(same screen)* **What takes most of that time?** | Social media · Videos · Games · Messages and news · A mix | 6a is 2–4 h or more, or `unknown` | Picks the digital habit (D.5) |
| 7 | **Which of these are already part of most of your days (5+ days a week)?** | Reading 10+ minutes · Breathing exercises or meditation · Journaling · Planning my day · A 30+ minute walk · Phone out of reach for the last 30 min before sleep · Making my bed · None of these | Always (pick at least one, or "None") | "Already doing" (D.3). "Making my bed" doesn't remove the foundation habit [AGREED]; its reason becomes "You already do this, so it's an easy first check" |
| 8 | **Anything we should keep in mind?** *(optional, stays on your phone)* | Joint, back or injury pain · Heart or blood-pressure condition · Pregnant or recently gave birth · A clinician told me to limit fluids · Diagnosed sleep condition (e.g. insomnia, sleep apnea) · None of these · **Skip** | Always (skippable) | Safety filtering (C.3). **Skip → `unknown`**, which gets conservative variants (C.4) |
| W | **What time do you usually get up on school or work days?** | Time picker (no preset) · It changes a lot (`varies`) · I work shifts or nights (`shift`) | Only if the provisional plan (D.6) contains a habit with a clock or wake-anchored target | Renders "In bed by 22:45" or "until 2 h after you wake". `varies` / `shift` → duration variants; steady wake-up becomes unavailable |

### A.3 Interaction estimates
A *tap* is any answer, Continue or Skip.

| Profile | Screens | Taps | Notes |
|---|---|---|---|
| **Sedentary 16-year-old student, goal Better focus**, sleeps 6–7 h, trouble 1–2 nights, 0 active days, fruit and veg 1–2, phone 4–6 h (social), routines: none, precautions: None | 9 (8 + wake-time) | **13**: age 1, goal 1, sleep 2, activity 1 (no strength follow-up), food 1 (no sugary-drinks question), phone 2, routines 2, precautions 1, wake 2 | The plan has wake-anchored digital and sleep habits, so the wake-time screen shows |
| **Inactive 35-year-old adult, goal More energy**, sleeps <6 h, trouble rarely, 0–1 active days, fruit and veg hardly any, sugary drinks most days, phone 2–4 h (videos), routines: Making my bed, precautions: Skip | 9 | **14**: age 1, goal 1, sleep 2, activity 1, food 2, phone 2, routines 2, precautions 1, wake 2 | |
| **Active 60-year-old, goal Get in shape**, sleeps 7–8 h, trouble rarely, 5+ active days, strength none, fruit and veg 3–4, sugary rarely, phone 1–2 h, routines: Reading, A 30+ minute walk, Planning my day, precautions: Joint pain | 8 (no wake-time screen if no anchored habit is picked) | **14**: age 1, goal 1, sleep 2, activity 2, food 2, phone 1, routines 4, precautions 2 | |

Today's quiz is 6 screens and 6 taps [FACT], so this adds roughly 2–3 screens and 7–8 taps.

---

## B. Habit Library V2 [PROPOSED]

### B.1 Rules for every ladder
- **One behavior across all rungs:** the same practice, more of it.
- **Levels map to rungs.** Each habit has a ladder of rungs. The user's baseline gives a start rung `r0`, and
  their levels are a three-rung window starting at **`s = min(r0, rungs − 3)`**:
  - Easy = rung `s`, Medium = `s + 1`, Hard = `s + 2`.
  - The stored level stays `easy / medium / hard` [FACT-compatible], so the day-22 and day-45 level-ups,
    early level-ups and step-downs are unchanged.
- **Phase changes can never make a target inappropriate.** Every rung of a user's ladder (after age and
  precaution variants) is itself an appropriate target for that user, and the top rung is the ceiling.
  Reaching Mastery can at most reach the top rung [PROPOSED].
- **No universal step ratio.** The previous "≤1.5×" rule is removed. Step sizes are chosen per habit [PRODUCT].
  Low rungs grow by small absolute amounts (e.g. +5 min), so a lapse never faces a large jump.
- **Baseline at or above the top rung → "already doing"** (not offered).
- **Not enough suitable habits:** a plan may have **4** habits rather than filling with an unsuitable one (an
  owner decision, H3). The current minimum of 3 still applies.

### B.2 Library
Columns:
- *Ages:* T = 16–17, A = 18+. "adapt" means a different ladder variant.
- *Goals:* ★ = core (protected; satisfies the goal guarantee), · = support.
- *Freq:* D = daily, S = scheduled (future, not approved).
- *Evidence:* expected strength **E1** = likely well established, **E2** = promising or mixed,
  **E3** = mainly practical or motivational. **All are unverified.**

| # | ID (stable) | Habit | Intended benefit [VERIFY] | Ages | Goals | Baseline → start rung | Ladder (rungs) [PRODUCT] | Freq | Evidence | Safety exclusions / adaptations | User-facing explanation (draft; ships only per G.0) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `discipline_bed` (spec 2) | Make your bed | A quick, concrete first win; routine anchor | T, A | foundation (all) | Always rung 0 [AGREED: foundation rule] | Make your bed · Make your bed and clear one surface · Make your bed and a 2-min room reset | D | E3 (motivational) | — | "A small win to start the day." |
| 2 → R3 | `sleep_bedtime` (spec 2) | Bedtime | More sleep opportunity for short sleepers | T (teen ladder), A | energy ★, fitness ·, focus · | First rung above reported sleep; not offered if reported sleep ≥ the top rung | **Adult:** in bed 7:00 / 7:30 / 8:00 h before wake. **Teen:** 8:00 / 8:30 / 9:00 / 9:30 h [VERIFY teen need]. Rendered "In bed by {wake − n}" | D | E1 (duration), E2 (habit form) | **Excluded:** trouble `most`, sleep condition. Wake `varies` / `shift` → variant "Lights out {15/30/45} min earlier than usual" | "Getting to bed a little earlier gives you more time to sleep." |
| 3 | `sleep_wake` (spec 2) | Steady wake-up | Regular sleep timing | T, A | energy ★, focus ·, discipline ★ | Fixed start rung 0 (no consistency baseline) | Up within 60 / 45 / 30 / 15 min of {wake} | D | E2 | **Excluded:** wake `varies` / `shift`; not offered without a wake time | "Getting up at about the same time helps your days feel steadier." |
| 4 | `sleep_no_phone_bed` (spec 2) | Phone-free wind-down | Less stimulation before sleep | T, A | calm ★, energy · | Routine "phone out of reach" → already doing; trouble `most` or `some` → rung 1; else rung 0 | Phone away 15 / 30 / 45 / 60 min before bed | D | E2 | — (phone rule) | "A screen-free last half hour makes it easier to switch off." |
| 5 | `sleep_morning_light` (new) | Morning daylight | Body-clock and alertness support | T, A | energy ★, calm ·, focus · | Fixed rung 0 | Outside within an hour of waking for 5 / 10 / 15 / 20 min | D | E2 | Shift → "after your main sleep" | "Daylight early in the day helps you feel awake." |
| 6 | `move_walk` (spec 2) | Walk | Aerobic activity, mood | T, A (65+ variant) | energy ★, calm ★, fitness · | Active days 0 → 5 min; 1–2 → 10; 3–4 → 20; 5+ → not offered unless energy or calm (then 20). Routine "30+ min walk" → already doing | 5 / 10 / 15 / 20 / 25 / 30 / 40 / 50 / 60 min, easy to brisk pace | D | E1 | Heart/BP, pregnancy, joint → note "Keep it comfortable; follow your clinician's advice" | "A daily walk is one of the simplest ways to move more." |
| 7 → R3 | `move_strength_snack` (new) | Strength starter | Builds the habit of muscle-strengthening work. **Not a full program** (B.4) | T, A (50+ and 65+ variants) | fitness ★, confidence · | Strength `none` → rung 0; `1` → rung 2; `2p` → not offered (already training). Not shown to 50+ without the 4b answer | **Standard:** 1 set of 1 move · 1 set of 2 moves · 1 set of 3 moves · 2 sets of 3 moves (moves: squats or sit-to-stands, wall or knee push-ups, glute bridges; stop well before exhaustion). **Gentle** (65+, joint, unknown precautions): sit-to-stands from a chair · + wall push-ups · + heel raises holding support · 2 rounds | D (interim) | E1 (strength in general), E3 (daily micro-dose) | **Excluded:** heart/BP, pregnancy. **Gentle variant:** joint/back, 65+, unknown precautions. Never daily full workouts | "A few strength moves a day to build the habit." |
| 8 → R3 | `food_produce` (new) | Fruit and veg | Diet quality | T, A | energy ·, fitness · | Servings `0` → rung 0; `1_2` → rung 1; `3_4` → rung 2; `5p` → already doing | Fruit or veg at 1 / 2 / 3 / 4 meals or snacks | D | E1 (diet pattern), E2 (this form) | **Excluded:** skipped food questions. **Additive only**: never "less" or "no" | "Adding fruit or veg to your meals is an easy upgrade." |
| 9 → R3 | `food_sugary_drinks` (new) | Fewer sugary drinks | Less added sugar from drinks | **A only** | energy ·, fitness · | `most` → rung 0; `some` → rung 1; `rarely` → already doing | Sugary drinks today: at most 2 · at most 1 · none | D | E1 [VERIFY] | **Teens: never.** Excluded with skipped food questions | "Swapping a sugary drink for water or an unsweetened drink is a simple change." |
| 10 | `food_water_meals` (new) | Water with meals | Hydration routine, **with no universal amount** | T, A | — (optional) | **Not auto-recommended**; add or swap only | A glass of water with 1 / 2 / 3 meals | D | E3 [VERIFY] | **Excluded:** fluid limit | "A glass of water with meals, if that suits you." |
| 11 | `screen_morning` (spec 2) | Phone-free start | Calmer, self-directed mornings | T, A | energy ·, calm · | Phone 6+ h → rung 0; 2–6 h → rung 1; 1–2 h → rung 2; <1 h → not offered | No phone for the first 15 / 30 / 45 / 60 min after waking (an alarm doesn't count) | D | E2 | — (phone rule; overlap group `morning_phone`) | "Start the day on your own terms before your phone does." |
| 12 | `screen_social` (spec 2) | Social-free start | Fewer reactive social-app hours | T, A | focus ★, calm · | 6b social only; phone 6+ h → rung 0; 4–6 h → rung 1; 2–4 h → rung 2 | No social apps for the first 1 / 2 / 3 / 4 h after waking (shift: "of your day") | D | E2 | — (phone rule; overlap group `morning_phone`) | "Keeping social apps out of your first hours protects your focus." |
| 13 | `screen_app_limit` (new) | App limit | Less time in your biggest time sink | T, A | focus ·, calm ·, energy · | 6b videos, games or a mix; phone 6+ h → rung 0; 4–6 h → rung 1; 2–4 h → rung 2 | Keep {app type} under 90 / 60 / 45 / 30 min (with Screen Time's App Limits as a cue) | D | E2 | — (phone rule) | "A daily limit on the app that pulls you in most." |
| 14 | `mind_read` (spec 2) | Read | Sustained attention, enjoyment | T, A | focus ★ (with deep work), calm · | Routine "Reading" → already doing; else rung 0 (focus goal: rung 1) | Read 5 / 10 / 15 / 20 / 30 min | D | E2 [VERIFY focus link] | — | "A few minutes of reading a day." |
| 15 | `mind_breathe` (new; replaces `mind_meditate` for V2) | Slow breathing | Short-term stress relief | T, A | calm ★, focus · | Routine "Breathing or meditation" → already doing; else rung 0 | 2 / 3 / 5 / 8 / 10 min of slow breathing | D | E2 | Pregnancy and heart/BP: no breath-holding variants (none are used) [VERIFY] | "A few slow breaths can take the edge off a busy day." |
| 16 | `mind_journal` (spec 2) | Journal | Reflection, getting worries out of your head | T, A | calm ·, confidence ·, discipline · | Routine "Journaling" → already doing; else rung 0 | Write 1 / 2 / 3 / 5 sentences (prompt: "What went well? What's on your mind?") | D | E2 [VERIFY by type] | — | "One or two sentences a day to clear your head." |
| 17 | `focus_deepwork` (spec 2) | Deep work | Uninterrupted focus | T (max 60), A | focus ★, discipline · | No baseline input → rung 1 (15 min) for everyone [PRODUCT] | 10 / 15 / 25 / 45 / 60 / 90 min, phone in another room (teen ladder ends at 60) | D | E2 | — | "One protected block of focus a day." |
| 18 → R3 | `focus_top3` (spec 2) | First task | Starting on what matters | T, A | focus ★, discipline ★, calm · | Routine "Planning my day" → rung 1; else rung 0 | Write your #1 task · …and work on it for 10 min first · …25 min · …45 min | D | E2 | — | "Decide your most important task and start with it." |
| 19 | `social_reach_out` (new) | Reach out | Social connection | T, A | calm ·, confidence ·, energy · | Fixed rung 0 | Message or call 1 / 2 / 3 people you care about | D | E1 (connection), E2 (this form) | — (always possible: a message counts) | "A quick message to someone you care about." |
| 20 | `confidence_talk` (spec 2) | Start a conversation | Social confidence through small reps | T, A | confidence ★ | Fixed rung 0 | Start 1 / 2 / 3 conversations (in person or a call) | D | E2 [VERIFY exposure framing] | Opportunity-dependent (max 1 per plan) | "Small conversations make the next one easier." |
| 21 | `confidence_compliment` (spec 2) | Genuine compliment | Positive social contact | T, A | confidence ★ | Fixed rung 0 | Give 1 / 2 / 3 genuine compliments (a message counts) | D | E3 | — | "Noticing what others do well." |
| 22 | `move_strength_session` (new, **future**) | Strength session | Muscle-strengthening at a guideline-like frequency [VERIFY] | T, A (variants) | fitness ★ | Strength `none` / `1` → rung 0 / 1 | 2 sessions a week of: 2 / 3 / 4 sets of 3–4 moves | **S (not approved)** | E1 | As #7 | — |

### B.3 Retired from V2 recommendations (kept for V1 plans) [AGREED and PROPOSED]
- `discipline_cold` (cold finish): retired from automatic recommendations [AGREED]. Not offered in V2
  swaps either (H6).
- `screen_limit`: an outcome-based total cap, ambiguous between work and phone; replaced by #12 and #13.
- `move_steps`: needs a step counter; replaced by walking minutes.
- `move_workout`: a 40-minute daily workout is inappropriate; replaced by #7, with #22 planned.
- `mind_meditate`: the practice switched between levels; replaced by #15.
- `water` (quantities): replaced by optional #10.

### B.4 Interim fitness limits (daily-only version) [PROPOSED, explained to users]
- **Strength guidance usually means a few sessions a week [VERIFY].** A daily checklist can't express that,
  so V2.0 only offers **Strength starter**: a small, daily, sub-maximal habit that builds the routine. It is
  not a training program.
- **People already training twice a week or more get no strength habit.** Their fitness plan leans on
  walking, sleep and nutrition. Copy for them: "You're already training. Keep it up; we'll focus on what
  supports it."
- **The goal guarantee for fitness** is satisfied by Walk or Strength starter, with no daily workouts.
- **When scheduled habits are approved (E),** #22 replaces #7 for fitness plans.

---

## C. Age and safety rules [PROPOSED; all thresholds VERIFY]

### C.1 Under 16
- Choosing **Under 16** shows a final screen: *"Schwung is made for people 16 and older. We hope you'll come
  back when you're 16."* The only action is **Back to start**.
- **No answers are saved** (the quiz answers are discarded), and no plan is created.
- **No birth date is collected** and nothing is enforced beyond this screen.
- **The App Store age rating** is a separate owner decision (H1).

### C.2 Age bands
| Band | Rules |
|---|---|
| **16–17** (teen) | **Sleep:** duration scored against teen bands (need if under 8 h, or under 8–9 h [VERIFY]); teen bedtime ladder. **Food:** additive only (#8); never #9 or any restriction, fasting or weight-related habit; the sugary-drinks question is not asked. **Strength:** #7 standard variant at most, never above rung 3; no scheduled max-effort work. **Focus:** deep work up to 60 min. **Copy:** "school" wording. No caffeine-related habits exist |
| **18–49** | Full V2 library, subject to precautions |
| **50–64** | Strength follow-up always asked; #7 standard variant |
| **65+** | Gentle variants for #7; walk ladder unchanged, with a comfort note |
| **Birthdays** | Only an age range is stored. A plan keeps its band for its whole run; **Restart** asks the age again. A 17-year-old who turns 18 mid-program keeps teen targets until a voluntary restart |

### C.3 Precautions (question 8)
| Tag | Effect |
|---|---|
| Joint, back or injury | #7 gentle variant; #6 note |
| Heart or blood pressure | **Exclude** #7 and #22; #6 note; cold never offered |
| Pregnant / postpartum | **Exclude** #7 and #22; #6 note |
| Fluid limit | **Exclude** #10 |
| Sleep condition | **Exclude** #2 (bedtime extension); #3 note |
| "I'd rather skip food" (from Q5a) | **Exclude** #8, #9, #10 |

### C.4 Unknown precautions (Q8 skipped) [AGREED principle; PROPOSED rule]
- Treated as **unknown**, not as "none".
- #7 uses the **gentle** variant, and #22 (future) is not offered.
- Walk notes are shown.
- A one-line note on the plan screen: "If you have a health condition, check these with a professional"
  [VERIFY wording].

### C.5 Sleep difficulty
- `most` excludes #2, prefers #4, #3 and #5, and shows a gentle professional note [VERIFY].
- `some` prefers #4 over #2 when both are candidates.

---

## D. Deterministic recommendation algorithm [PROPOSED]

### D.1 Pipeline
```text
selectPlan(profile):
  p = normalize(profile)                 // derive ageBand, needs, tags (unknown if skipped), food opt-out
  pool = LIBRARY_V2.filter(released)     // G.0 release gate; retired specs never in pool
  pool = pool.filter(s => ageAllowed(s, p.ageBand))              // C.2
  pool = pool.filter(s => !excludedBy(s, p.tags, p.sleepTrouble, p.wake))   // C.3–C.5, wake-dependent rules
  pool = pool.filter(s => s.frequency == 'daily')                // E is not approved
  pool = pool.filter(s => !alreadyDoing(s, p))                   // routines (Q7) + top-rung baselines
  pool = pool.filter(s => !s.addOnly)                            // e.g. #10 water: never auto

  picks = [foundation(discipline_bed, rung 0)]                   // [AGREED]

  // 1. Needs, most foundational first
  for domain in [sleep, activity, nutrition, digital, mind]:
      if need(p, domain) >= 2:
          c = best(pool, domain, p)          // D.5 domain rules; goal breaks ties between valid options
          if c && fits(c, picks): picks += answerPick(c)

  // 2. Goal guarantee
  if !picks.some(isCore(goal)):
      c = first(pool, isCore(goal) && fits)        // prefer a domain not yet in the plan
      if c: picks += goalPick(c)
      if picks.length > 6: drop lowest-need non-core answer pick (tie: mind, digital, nutrition, activity, sleep)

  // 3. Fill to 5, suitable habits only
  for c in rankFill(pool, p):                      // goal support (by need), then general (by need)
      if picks.length >= 5: break
      if fits(c, picks) && suitable(c, p): picks += fillPick(c)
  // If the pool runs out, the plan has 4 (H3), never an unsuitable habit

  return order(picks)        // foundation, forGoal, answer, fill (stable)

fits(c, picks) =  not in plan
               && overlapGroup unused                       // morning_phone, walk groups
               && phoneRules(picks + c) <= 2
               && domainCount(picks + c, c.domain) <= 2
               && opportunityDependent(picks + c) <= 1

suitable(c, p) = c's need score >= 1 || c is a goal habit   // never add a habit for a healthy area just to fill
```

### D.2 Start rungs and targets
- Each pick gets `r0 = baseline(spec, p)` per B.2, then the window `s = min(r0, rungs − 3)`.
- Variants: teen, gentle, or the wake-anchored or duration form.
- Rendering uses wake time when known (A.2, question W).

### D.3 Already doing
- **Routines (Q7)** map to specs: Reading → #14, Breathing → #15, Journaling → #16, Planning → #18 at a
  raised start rung (it stays eligible), 30+ min walk → #6, Phone out of reach → #4, Making my bed → foundation
  copy only.
- **Baselines at or above the top rung** → not offered (#6 at 5+ active days without an energy or calm goal;
  #8 at 5+ servings; #9 at rarely).

### D.4 Contradictions [PROPOSED]
| Case | Rule |
|---|---|
| 0 active days + strength 2+/week | Both taken as stated (**independent**, per [AGREED]): no strength habit, walk at the 5-min rung |
| 5+ active days + "a 30+ minute walk" not ticked | No conflict: walk is not offered unless the goal is energy or calm |
| Sleep 8–9 h + trouble 3+ nights | Duration is fine but quality is low → C.5; never #2 |
| Phone "Not sure" | Behavior-based digital habit (#11) only; no number-based limits (#13) |
| "None of these" plus other routines | "None" is ignored |
| Teen chooses "Get in shape" | #6 and #7 (standard), #8; never #9 or any weight-related framing in copy |

### D.5 Domain rules (who wins inside a domain)
- **Sleep:**
  - trouble `most` or a sleep condition → #4, then #3 (if a wake time is known), then #5
  - otherwise a duration need → #2 (if eligible), else #4
  - energy goal with no duration need → #5 or #3
- **Activity:** walk need → #6; the fitness goal adds #7 through the goal guarantee.
- **Nutrition:** produce need (0 or 1–2 servings) → #8; adults with sugary `most` and goal energy or
  fitness → #9 replaces or adds (at most 2 food habits).
- **Digital:**
  - social → #12
  - videos, games or a mix → #13
  - messages/news or not sure → #11
  - phone ≥ 2 h with sleep trouble → #4 is preferred in sleep (it's a phone rule too)
- **Mind:** the goal chooses: calm → #15, focus → #14, confidence → #16; otherwise #16.

### D.6 Wake-time question
1. Compute the provisional plan with `wake = unknown`, without excluding wake-anchored habits.
2. If any pick needs a wake time, ask question W **once**.
3. Recompute with the answer. `varies` / `shift` excludes #3 and switches the others to their duration forms.
4. Question W is never asked twice. If the recompute adds a wake-anchored habit after `varies` / `shift`, it
   uses its duration form.

### D.7 Explainability
- Every pick carries reason tokens (e.g. `answer:sleep.6_7`, `goal:energy`, `baseline:walk.0`).
- Tokens are rendered by fixed templates, never free text.
- Reasons within a plan are distinct (tested).

---

## E. Scheduled habits (designed; **not approved for implementation**)

| Aspect | Design |
|---|---|
| **Model** | A scheduled habit has a weekly pattern of days (e.g. Mon, Wed, Fri) that the user picks when it's added (default suggestion: 2 non-consecutive days). It's **planned** only on those days |
| **Today's checklist** | Shows only habits planned today. A small "Not today: Strength (next Wed)" line lists unscheduled ones; it isn't checkable |
| **80% rule** | Unchanged. The ratio uses **that day's planned list** [FACT: `dayRatio` divides by `log.planned`]. Example: 5 daily + 1 scheduled → 6 on session days (5 of 6 = 83% counts), 5 on other days (4 of 5 = 80% counts) |
| **XP and streaks** | Unchanged: XP per check-off plus the full-day bonus over that day's list; streaks use `dayQualifies`. Scheduled habits simply earn on fewer days |
| **Early level-up** | ⚠ Counts **consecutive scheduled sessions** completed (7 sessions ≈ 3–4 weeks at 2×/week), not calendar days. Needs `completionRun` to skip unscheduled days |
| **Step-down** | ⚠ Counts **consecutive missed scheduled sessions** (3). Needs the miss loop in `reconcile` to skip unscheduled days |
| **Phase level-ups** | Unchanged (day 22 and day 45 apply to all habits) |
| **Yesterday edits** | Unchanged: yesterday's log keeps its own planned list, so a session planned yesterday can be checked until noon [FACT] |
| **Journey** | Day cells unchanged (based on the 80% rule). The habit detail screen shows sessions as dots on scheduled days |
| **Missed or moved sessions** | "Do it today instead": allowed once per scheduled session, only within the same week. It adds the habit to today's planned list and removes it from the missed day's list **only while that day is still editable** (yesterday before noon). Final days are never rewritten. Otherwise the miss stands |
| **Rest days** | Unscheduled days are rest days by design and are never counted as misses |
| **Edge cases** | Changing days mid-week applies from the next day. The foundation habit is daily, so no day has an empty plan. A habit added mid-week starts on its next scheduled day |
| **Approval needed** | The changes to early level-up and step-down counting, plus new UI (day picker, "not today" line). Not part of V2.0 |

---

## F. Compatibility [AGREED and PROPOSED]
1. **New optional saved fields:**
   - `programVersion?: 1 | 2` (absent = 1)
   - `profile?: ProfileV2`
   - per-habit `spec?: { id, specVersion, startRung, variant, anchors }`

   The saved-data version stays 1, because the store merges saved data over defaults (the theme-preference
   precedent).
2. **Active V1 plans are unchanged:** old answers, plan, levels, text targets, logs, XP and streaks. V1 text
   comes from a **frozen legacy library**.
3. **V1 swaps stay within the legacy library** [AGREED], with today's behavior: the swapped-in habit starts
   at the phase level [FACT].
4. **V2 applies only to new programs:** a fresh install or **Settings → Restart** (which keeps reminder and
   theme [FACT]).
5. **Voluntary upgrade** [AGREED]: a later optional "Try the new plan" in Settings explains what changes and
   restarts with consent. Never automatic.
6. **IDs:** V2 keeps legacy IDs where the practice is the same (with `specVersion` 2) and adds new IDs for
   new or changed practices. Logs store IDs only, so history stays valid.
7. **V2 swaps** offer released, eligible V2 daily specs that pass the same safety filters, starting at the
   user's baseline rung. (Whether a V2 swap starts at its baseline window rather than the phase level is
   decision H5; mechanics are otherwise unchanged.)

---

## G. Evidence and safety questions still needing verification

### G.0 Release gate [PROPOSED]
**A user-facing explanation ships only when** its claim has a verified source recorded in the spec.
**Otherwise** it ships claim-free (e.g. "A daily walk"), or the habit is held back (H4).

### Questions
1. Teen sleep needs and whether bedtime targets suit 16–17-year-olds (school start times, circadian
   timing).
2. Adult sleep-opportunity rungs (7:00–8:00 h); when extending time in bed is contraindicated (insomnia, CBT-I
   principles); professional-referral wording for frequent sleep trouble and possible apnea.
3. Wake-time regularity: evidence and sensible tolerance rungs (60 → 15 min).
4. Morning daylight: evidence, dose (5–20 min) and the shift-work variant.
5. Walking: aerobic guidelines; starting doses for inactive people; whether a 5-min start is sensible; notes
   for heart, pregnancy and joint conditions.
6. Strength: guideline frequency; whether a daily sub-maximal "starter" is safe and useful as a habit
   bridge; teen, 50+ and 65+ variants; exclusion versus adaptation for heart/BP and pregnancy.
7. Fruit and veg: serving definitions, and whether "meals or snacks with produce" is a good behavior target.
8. Sugary drinks for adults: evidence and the "at most 2 → 1 → none" ladder; wording that avoids weight
   framing.
9. Hydration: whether any water-routine habit is justified; fluid-limit precautions.
10. Digital: evidence for social-media reduction, phone-free mornings and evenings, and app limits; sensible
    window and limit rungs.
11. Reading and attention; slow breathing (doses, any cautions); journaling type (expressive, gratitude,
    planning) and who should avoid rumination-prone prompts.
12. Deep work and first-task planning (implementation intentions).
13. Social connection and graded social exposure; framing for social anxiety.
14. The 66-day habit-formation claim and the role of daily versus scheduled practice.
15. Safety-question wording, the under-16 message and age-rating implications.

---

## H. Remaining owner decisions
1. **App Store age rating** and whether the under-16 screen is final (C.1).
2. **Wake-time question:** keep it conditional (proposed), or always ask?
3. **Plans with only 4 suitable habits:** accept 4 (proposed), or always reach 5?
4. **Release gate:** may habits ship with claim-free explanations before verification, or must they wait?
5. **V2 swaps:** start at the baseline window (proposed), or the current phase-level rule?
6. **Cold exposure in V2:** fully unavailable (proposed), or available as a manual adult add-on with
   precautions?
7. **Optional water habit (#10):** keep as add-only, or drop entirely?
8. **Sugary-drinks habit (#9, adults):** include in V2.0?
9. **Scheduled habits (E):** approve for a later phase, including the early level-up and step-down counting
   change?
10. **"Try the new plan" upgrade:** build in V2.0, or later?
11. **Teens choosing "Get in shape":** any extra copy guidance beyond D.4?

---

## Implementation phases (after approval)
| Phase | Scope | Mechanics change |
|---|---|---|
| 0 | Research fills G; specs updated with verified sources; ladders adjusted | No |
| 1 | Spec types, the frozen legacy library, the V2 library, and the selection and target engine as pure functions, with the test suite (below) | No |
| 2 | Quiz V2 in the existing onboarding layout (A), including the under-16 screen and conditional follow-ups | No |
| 3 | Program V2 wiring (F): fresh start and Restart use V2; V1 untouched | No |
| 4 | V2 swaps, precaution notes on habit detail | No |
| 5 | (If approved) Scheduled habits (E) | **Yes ⚠** |
| 6 | (If approved) Voluntary upgrade | No |

### Test plan (summary)
- **Exhaustive** over core answers: age (5) × goal (6) × sleep (5) × trouble (3) × activity (4) × strength (3)
  × produce (5) × phone (6) × pull (5) = 1,620,000 combinations. That's too many per CI run, so: exhaustive
  over 7 dimensions with the rest pairwise, plus 200k seeded random profiles that include routines,
  precautions (including Skip) and wake answers.
- **Properties:**
  - plan validity, and never an unsuitable filler
  - safety and age exclusions (teens never #9; heart/BP and pregnancy never #7)
  - unknown precautions → gentle variants
  - a sleep condition or trouble `most` never yields #2
  - every rung within the variant's ladder, and phase level-ups never exceed the top
  - one behavior per ladder
  - "already doing" respected
  - core goal present when eligible
  - determinism; templated, distinct reasons
  - question W asked only when needed, and at most once
- **Scenarios:** the three A.3 profiles, the contradictions (D.4), the under-16 flow (nothing saved), the age
  boundaries (16, 17, 18; birthday mid-program), shift workers, "Not sure" phone use, the food opt-out.
- **Compatibility:**
  - V1 fixtures load and render identical targets
  - V1 swaps use the legacy library
  - Restart produces V2 and keeps reminder and theme
  - existing XP, streak, early level-up, step-down and phase tests pass unchanged on V2 plans
