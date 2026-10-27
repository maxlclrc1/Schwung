# Schwung — The 66-Day Life Reset: Habit System Audit and Redesign

**Status:** proposal for review. **Nothing here is implemented.** No code, saved programs, artwork, tabs, ceremonies,
Field Notes or production behaviour were changed. Held fitness prototypes stay inactive.

**Baseline:** development commit `8649f5d`.

**What was inspected:**

- **Habit content:** `src/core/habits.ts` (V1 library) and `src/core/v2/library.ts` (V2 library and ladders).
- **Recommendation engines:** `src/core/plan.ts` (V1) and `src/core/v2/engine.ts` with `program.ts` and `gate.ts`
  (V2, release gate).
- **Onboarding:** `src/core/v2/quiz.ts` and `src/core/onboarding.ts`.
- **Progression and scheduling:** `src/core/progression.ts` and `src/core/schedule.ts`.
- **Earlier reviews:** `SCHWUNG_V2_EVIDENCE_REGISTER.md`, `SCHWUNG_HABIT_COMPETITOR_REVIEW.md` and
  `SCHWUNG_V2_SCHEDULED_HABITS.md`.

The "existing recommendations" in section 9 are the actual output of `buildPlan` (V1) and `previewPlan` (V2, under the
release gate) for the three profiles, run on this commit.

**How evidence is labelled in this document:**

| Label           | Meaning                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **[Guideline]** | A public-health guideline in Schwung's evidence register (WHO, AASM, NHS…)                                                            |
| **[Evidence]**  | Supported by reviews or trials in the register (IDs such as `II`, `HABIT66`)                                                          |
| **[Mixed]**     | The register records contradictory or weak findings                                                                                   |
| **[Principle]** | A well-known behaviour-change principle **not yet reviewed in Schwung's register**; needs review before any claim is shown in the app |
| **[Design]**    | A product choice. Every number in the targets below is a design choice unless it says otherwise                                       |

No target in this document is "scientifically validated". The 66 days come from Lally et al. 2010 (`HABIT66`): a
**median** of about 66 days to automaticity, with a range of about 18–254. Schwung should present 66 days as a
**structured challenge**, never as the time it takes to form a habit.

---

## Contents

1. [How the habit system works today](#1-how-the-habit-system-works-today)
2. [Habit inventory and verdicts](#2-habit-inventory-and-verdicts)
3. [Microhabits versus flagship challenges](#3-microhabits-versus-flagship-challenges)
4. [The flagship Life Reset challenges](#4-the-flagship-life-reset-challenges)
5. [Difficulty and progression](#5-difficulty-and-progression)
6. [Weekly missions](#6-weekly-missions)
7. [Onboarding](#7-onboarding)
8. [The habit limit (6 → 12)](#8-the-habit-limit-6--12)
9. [Example transformations](#9-example-transformations)
10. [Safety and scientific credibility](#10-safety-and-scientific-credibility)
11. [Implementation sequence](#11-implementation-sequence)
12. [The five highest-impact changes](#12-the-five-highest-impact-changes)

---

## 1. How the habit system works today

### 1.1 Two systems, two audiences

|                | **V1** (public production)                                                                      | **V2** (development and internal testing)                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Library        | 19 habits (`habits.ts`), fixed Easy, Medium and Hard text                                       | 25 entries (`library.ts`). 20 are cleared by the release gate, 4 are development-only exercise prototypes, and 1 is held. Personal ladders of 3–9 rungs                                                               |
| Quiz           | 6 questions: goal, sleep, screen, exercise, water, "read, meditate or journal"                  | Up to 12 screens: age (16+ gate), goal, sleep hours and trouble, active days, fruit and veg, sugary drinks (adults), phone hours, what pulls you, existing routines, precautions; then wake and bed times when needed |
| Plan           | 5–6 habits. Always Make your bed, one per "problem area", one for the goal, then fill           | 3–6 habits (target 5). Always Make your bed, 2 goal habits, up to 2 "need" habits, then fill                                                                                                                          |
| Starting level | Easy (water can start at Medium)                                                                | Easy = a "baseline rung" picked from the answers. The plan freezes **3 rungs only** (start, +1, +2)                                                                                                                   |
| Safety         | Almost none: cold showers, water quotas, workouts and step counts are offered without screening | Extensive: age bands, precautions, food habits held for 16–17, no bedtime shift with insomnia, time-in-bed ceilings, at most 2 phone rules                                                                            |

### 1.2 Mechanics that both share

| Mechanic             | Value (code)                                                                   | Effect                                                                                    |
| -------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Plan size            | `MIN_HABITS` 3; `PLAN_MAX` 6                                                   | "Add a habit" stops at 6                                                                  |
| Daily success        | 80% of that day's planned habits (`dayQualifies`)                              | 5 habits → 4 needed; 6 habits → 5 needed; 3 habits → all 3                                |
| XP                   | 10 per habit done, +20 for a full day; 200 XP per player level                 | XP grows with the **number** of habits, not their difficulty                              |
| Phase level-ups      | Day 22 and Day 45: **every** habit rises one level automatically (`reconcile`) | Calendar-driven, whatever the person's performance                                        |
| Early level-up       | Offered after a 7-day completion run                                           | Opt-in                                                                                    |
| Step-down            | 3 consecutive misses → one level down, never below Easy                        | Automatic, with one kind message                                                          |
| Scheduled habits     | 2–3 fixed weekdays (`SESSIONS_PER_WEEK`)                                       | Infrastructure only: **no real scheduled habit is offered**; the strength session is held |
| Milestone ceremonies | Days 7, 21 and 44 need a **fully** done day; Day 66 needs 80%                  | Relevant to the habit limit (section 8)                                                   |

### 1.3 Critical findings

1. **The flagship slot is a ten-second task.** Every plan, V1 and V2, starts with _Make your bed_. It's a fine
   warm-up, but it occupies the most prominent card of a "life reset".
2. **Every habit has the same weight.** Two minutes of breathing counts exactly as much as 45 minutes of focused work
   for the 80% rule, the streak and XP. The system has no notion of a habit that matters more.
3. **Mastery is modest by construction.** V2 plans freeze three rungs from the starting rung, so the higher rungs of
   the ladders are never reached:
   - **Walk:** a beginner's Mastery is a 15–20 minute walk, although the ladder goes to 60.
   - **Focused work:** an ambitious adult who chose Focus ends at **45 minutes**, although the ladder goes to 90.
   - **Read:** tops out at 15–20 minutes.
4. **Difficulty rises with the calendar, not with readiness.** On Day 22 every habit steps up, even one that was
   completed 9 times out of 21. Someone completing every habit all along gets no more than one early offer per habit.
   An ambitious person can't start higher; a struggling person is pushed up anyway.
5. **Nothing changes over 66 days except numbers.** The same checklist every day: no weekly arc, no measured
   starting point, no destination, no "proof" at the end. That's the founder's "beautiful checklist" problem.
6. **Ambition and available time are never asked.** Plans are built from deficits (sleep, fruit, phone hours), so an
   ambitious user's goal competes with their health gaps. A real example from the engine (section 9, Profile A):
   - **The answers:** a Discipline goal and 4–6 hours a day of social media.
   - **The plan it gets:** fruit and veg plus a 10-minute walk.
   - **What's missing:** no phone habit at all. The two "need" slots were filled by activity and nutrition before
     the digital domain was reached.
7. **Production still recommends habits V2 retired on principle.** V1 offers:
   - **Cold showers** (`discipline_cold`): to every Discipline goal in the examples.
   - **Water quotas** of 1–2 L (`water`): to almost everyone.
   - **Workouts** (`move_workout`): unscreened.
   - **Step counts** (`move_steps`).
   - **A total screen-time cap** (`screen_limit`, "Under 3h" at Mastery) regardless of work or school use.

   This is the most urgent content issue, but changing production needs explicit approval (section 11, stage 2).

8. **Outcomes are invisible.** Logs are binary (done or not done). Schwung can't show "you read 4 books", "your
   screen time fell from 5 h 40 to 3 h 10" or "you did 31 hours of focused work", which is exactly what makes a
   transformation feel real.

---

## 2. Habit inventory and verdicts

### 2.1 Summary

31 stable IDs exist across V1 and V2. **Ambition** is rated 1 (trivial) to 5 (transformational); it's a product
judgement of how much the habit, at its current Mastery, feels like a meaningful 66-day undertaking.

| ID                      | Name (V1 / V2)                                 | In             | Category        | Ambition | Progression meaningful? | Verdict                                | New role                                              |
| ----------------------- | ---------------------------------------------- | -------------- | --------------- | -------- | ----------------------- | -------------------------------------- | ----------------------------------------------------- |
| `discipline_bed`        | Clean start / Make your bed                    | V1, V2         | Foundation      | 1        | No                      | **Demote**                             | Optional warm-up, never the first card by default     |
| `sleep_bedtime`         | Earlier bedtime                                | V1, V2         | Sleep           | 3        | V1 no, V2 yes           | **Combine**                            | Part of _Sleep Anchor_                                |
| `sleep_wake`            | Steady wake-up                                 | V1, V2         | Sleep           | 3        | Yes                     | **Strengthen**                         | Core of _Sleep Anchor_                                |
| `sleep_no_phone_bed`    | Phone-free wind-down                           | V1, V2         | Sleep / digital | 2        | Yes                     | **Keep** (support)                     | Support for _Sleep Anchor_ and _Phone Under Control_  |
| `sleep_morning_light`   | Morning daylight                               | V2             | Sleep           | 2        | Partly                  | **Keep** (support)                     | Optional support                                      |
| `screen_morning`        | Phone-free morning                             | V1, V2         | Digital         | 2        | Yes                     | **Combine**                            | A "phone-free zone" in _Phone Under Control_          |
| `screen_social`         | Social-free mornings / Social media later      | V1, V2         | Digital         | 2        | Partly                  | **Combine**                            | Zone or budget in _Phone Under Control_               |
| `screen_app_limit`      | App time (Video/Gaming time)                   | V2             | Digital         | 3        | Yes                     | **Strengthen**                         | The budget in _Phone Under Control_                   |
| `screen_limit`          | Screen time cap                                | V1             | Digital         | 3        | No                      | **Retire** from new recommendations    | Replaced by a baseline-relative budget                |
| `move_walk`             | Daily walk / Walk                              | V1, V2         | Activity        | 2        | Partly                  | **Strengthen**                         | Starter path of _Move Every Day_                      |
| `move_steps`            | Step count                                     | V1             | Activity        | 2        | Partly                  | **Retire** from new recommendations    | Steps can count toward _Move Every Day_ minutes later |
| `move_workout`          | Workout                                        | V1             | Activity        | 3        | No                      | **Retire** from new recommendations    | Unscreened; replaced by user-chosen activity minutes  |
| `move_strength_prep`    | Beginner strength preparation                  | V2 (prototype) | Activity        | 3        | Yes                     | **Keep held**                          | Future _Strength Foundations_ (inactive)              |
| `move_strength_gentle`  | Gentle strength preparation                    | V2 (prototype) | Activity        | 2        | Yes                     | **Keep held**                          | Inactive                                              |
| `move_balance`          | Supported balance practice                     | V2 (prototype) | Activity        | 2        | Yes                     | **Keep held**                          | Inactive                                              |
| `move_seated`           | Seated mobility                                | V2 (prototype) | Activity        | 2        | Yes                     | **Keep held**                          | Inactive                                              |
| `move_strength_session` | Strength session                               | V2 (held)      | Activity        | 4        | —                       | **Keep held**                          | Inactive                                              |
| `water`                 | Hydrate                                        | V1             | Water           | 1        | No                      | **Retire** from new recommendations    | None (no universal quotas)                            |
| `food_produce`          | Fruit and veg                                  | V2             | Nutrition       | 2        | Yes                     | **Keep** (support, adults)             | Optional health support                               |
| `food_unsweetened`      | Unsweetened drinks                             | V2             | Nutrition       | 2        | Yes                     | **Keep** (support, 18+)                | Optional health support                               |
| `food_water_meals`      | Water with meals                               | V2             | Nutrition       | 1        | No                      | **Keep** (add-only)                    | Optional micro support                                |
| `mind_read`             | Read                                           | V1, V2         | Learning        | 2        | Partly                  | **Strengthen**                         | _The Reading Path_                                    |
| `mind_meditate`         | Breathe (meditation)                           | V1             | Mind            | 2        | Partly                  | **Retire** in favour of `mind_breathe` | —                                                     |
| `mind_breathe`          | Slow breathing                                 | V2             | Mind            | 1        | Partly                  | **Keep** (support)                     | Optional calm support                                 |
| `mind_journal`          | Journal                                        | V1, V2         | Mind            | 1        | No                      | **Combine**                            | Weekly reflection in every flagship's check-in        |
| `focus_deepwork`        | Deep work / Focused work                       | V1, V2         | Focus           | 4        | Yes (capped low)        | **Strengthen**                         | _Deep Work Sprint_                                    |
| `focus_top3`            | Top priorities / Most important task           | V1, V2         | Execution       | 3        | Partly                  | **Strengthen**                         | _Plan and Execute_                                    |
| `discipline_cold`       | Cold finish                                    | V1             | "Discipline"    | 2        | No                      | **Retire** from new recommendations    | None (never mandatory cold)                           |
| `confidence_talk`       | Start a conversation / Meaningful conversation | V1, V2         | Social          | 3        | V1 partly, V2 yes       | **Combine**                            | _Social Courage Ladder_                               |
| `confidence_compliment` | Genuine compliment                             | V1, V2         | Social          | 1        | No                      | **Keep** (support)                     | Support for _Real Connections_                        |
| `social_reach_out`      | Reach out                                      | V2             | Social          | 2        | Partly                  | **Strengthen**                         | Daily action of _Real Connections_                    |

**"Retire from new recommendations"** never touches a saved program. A V1 plan with Cold finish keeps it, with its
frozen text, logs and level. Retired habits simply stop being offered to new plans and in swap lists.

### 2.2 Habit-by-habit

Each card lists the current targets as implemented. All habits are **daily** today: no real habit is scheduled.

#### Foundation

**`discipline_bed` — Clean start (V1) / Make your bed (V2)**

- **Intended outcome:** a small first win to start the day.
- **Targets:**
  - V1: Make your bed → Make your bed and tidy your room → Bed, tidy room and plan tomorrow.
  - V2: Make your bed → Make your bed and clear one surface → Make your bed and a 2-minute room reset.
- **Personalisation:** V2 notes "you already do this" when the person reports it; it's still always included.
- **Science:** no claim made (register). The "small win" idea is a [Principle].
- **Ambition:** 1. **Progression:** cosmetic.
- **Verdict:** demote. Keep it as an optional warm-up and as the Starter rung of _Order Out of Chaos_. It should
  never be the first and largest card in a Life Reset.

#### Sleep

**`sleep_bedtime` — Earlier bedtime**

- **Intended outcome:** more sleep opportunity.
- **Targets:**
  - V1: 30 min earlier → in bed 7 h before alarm → 8 h before alarm.
  - V2: "In bed by HH:MM", stepping 15/30/45/60 min earlier than the person's own time, under a time-in-bed ceiling
    (adults 9 h, 16–17 10 h).
- **Safety:** V2 excludes it for 16–17 (pending sleep-expert review), insomnia (more time in bed can worsen it),
  diagnosed sleep conditions, unknown precautions and irregular wake times.
- **Science:** [Guideline] adults 7+ h, teens 8–10 h (`AASM-ADULT`, `AASM-PED`, `CDC-SLEEP`). Adolescent body clocks
  shift later (`AAP-SST`).
- **Ambition:** 3. **Progression:** V1's levels are arbitrary; V2's are personal and capped.
- **Verdict:** combine into _Sleep Anchor_ as its "protect your sleep opportunity" part, with V2's safety rules
  unchanged.

**`sleep_wake` — Steady wake-up**

- **Targets:**
  - V1: within 60 → 30 min of target, then exact time on weekends too.
  - V2: up within 60/45/30/15 min of the person's own time.
- **Safety:** excluded for varying or shift wake times, and when the person already wakes regularly.
- **Science:** NHS sleep-hygiene leaflets favour a fixed wake time (`NHS-INS`); no outcome claim.
- **Ambition:** 3. **Progression:** meaningful (a tighter window).
- **Verdict:** strengthen. It becomes the core of _Sleep Anchor_. The anchor is always the person's **own**
  current wake time, never an earlier one.

**`sleep_no_phone_bed` — Phone-free wind-down**

- **Targets:**
  - V1: 15 → 30 → 60 min before sleep.
  - V2: phone away 15/30/45/60 min before bed; starts one rung up with sleep trouble.
- **Science:** [Mixed] Bedtime phone use is associated with later and shorter sleep (`SCREEN-SLEEP`, observational);
  trials are contradictory (`PHONE-RCT`).
- **Ambition:** 2.
- **Verdict:** keep as a support for both _Sleep Anchor_ and _Phone Under Control_.

**`sleep_morning_light` — Morning daylight (V2)**

- **Targets:** outside within an hour of waking for 5/10/15/20 min (a shift-work variant exists).
- **Science:** [Mixed] Evidence on morning daylight specifically is thin (`LIGHT`).
- **Ambition:** 2.
- **Verdict:** keep as an optional support.

#### Digital

**`screen_morning` — Phone-free morning**

- **Targets:** no phone for the first 15/30/60 min (V1), or 15/30/45/60 min, alarm excluded (V2).
- **Science:** [Mixed]; no well-being claim (register).
- **Ambition:** 2.
- **Verdict:** combine as the first "phone-free zone" of _Phone Under Control_.

**`screen_social` — Social-free mornings (V1) / Social media later (V2)**

- **Targets:**
  - V1: before 10:00 / 12:00 / 17:00.
  - V2: the first 30 min to 4 h after waking. Only offered when social media is the main pull.
- **Science:** [Mixed] One RCT was positive and a 644-person replication found no well-being benefit, with poor
  adherence (`SM-LIMIT`).
- **Ambition:** 2. **Progression:** V1's "before 17:00" is a large, arbitrary jump.
- **Verdict:** combine as a zone or budget option in _Phone Under Control_.

**`screen_app_limit` — App time (V2; named Video time or Gaming time)**

- **Targets:** under 120/90/60/45/30 min a day for the main pull.
- **Personalisation:** named after the pull. **Science:** [Mixed]. **Ambition:** 3.
- **Verdict:** strengthen. It becomes the measured budget of _Phone Under Control_, set from the person's real
  Screen Time number, not a fixed ladder.

**`screen_limit` — Screen time cap (V1)**

- **Targets:** under 7 h → 5 h → 3 h of total screen time.
- **Problem:** total screen time includes work and school, so "under 3 h" is unreachable for many students and
  office workers, and it isn't anchored to the person's own baseline.
- **Ambition:** 3 on paper, 1 in practice.
- **Verdict:** retire from new recommendations.

#### Activity

**`move_walk` — Daily walk (V1) / Walk (V2)**

- **Targets:**
  - V1: 15/30/45 min.
  - V2: a 5–60 min ladder at a comfortable pace, starting by active days (0 → 5 min, 1–2 → 10 min, 3+ → 20 min).
    A plan only reaches start +2 rungs.
- **Safety (V2):** excluded with walking difficulty, heart conditions and pregnancy (individual advice); a
  stop-if-unwell note for 65+, joint pain or unknown precautions.
- **Science:** [Evidence] Walking interventions improve fitness and blood pressure with few adverse events
  (`WALK-MA`). [Guideline] 150–300 min of moderate activity a week (`WHO-PA`).
- **Ambition:** 2 at a 20-minute Mastery.
- **Verdict:** strengthen into the Starter path of _Move Every Day_, measured in weekly minutes toward the
  person's next guideline step.

**`move_steps` — Step count (V1)**

- **Targets:** 5,000 / 7,500 / 10,000 steps.
- **Science:** [Evidence, observational] More steps are associated with lower mortality (`STEPS`). The fixed
  numbers aren't personal.
- **Verdict:** retire from new recommendations. Health-app steps may later count as minutes of activity.

**`move_workout` — Workout (V1)**

- **Targets:** 10 push-ups + 20 squats → 20 min → 40 min workout.
- **Problem:** unscreened, universal physical targets, no form or safety guidance. This is exactly what the V2
  fitness review held back.
- **Verdict:** retire from new recommendations.

**`move_strength_prep`, `move_strength_gentle`, `move_balance`, `move_seated` (V2 prototypes) and
`move_strength_session` (held)**

- **Status:** development-only exercise prototypes behind the Exercise Preview, or held, pending physiotherapist
  and exercise-protocol review (`SCHWUNG_V2_PHYSIO_REVIEW_PACKET.md`).
- **Science:** [Guideline] Strength on 2+ days a week (`WHO-PA`, `UK-CMO`); [Evidence] falls prevention for older
  adults (`FALLS-CR`).
- **Verdict:** keep held. A future _Strength Foundations_ challenge (section 4, challenge 11) depends on that
  review. **Nothing in this proposal activates them.**

#### Nutrition and water

**`water` — Hydrate (V1)**

- **Targets:** 4 / 6 / 8 glasses (1–2 L); starts at Medium for 4–8 glasses.
- **Problem:** no source supports a universal quota (`HYDRATE`), and it conflicts with fluid-limit conditions,
  which V1 never asks about.
- **Verdict:** retire from new recommendations.

**`food_produce` — Fruit and veg (V2)**

- **Targets:** eat 1–5 portions a day, starting by baseline.
- **Safety:** held for 16–17 (eating-disorder-informed review, `TRACK-ED`, `AAP-ED`); skippable food questions; a
  "swap it if counting feels stressful" note.
- **Science:** [Guideline] 400 g a day (`WHO-DIET`); [Evidence, observational] (`FV-MA`).
- **Ambition:** 2.
- **Verdict:** keep as an optional health support for adults. It is **not** a flagship: a "Life Reset" must not
  slide toward diet culture.

**`food_unsweetened` — Unsweetened drinks (V2, 18+)**

- **Targets:** swap up to 1/2/3 sugary drinks. A day with none counts; hypo treatment always comes first.
- **Science:** [Evidence, observational] (`SSB-DM`); [Guideline] (`ADA-SOC`).
- **Verdict:** keep as a support (18+).

**`food_water_meals` — Water with meals (V2, add-only)**

- **Science:** no claim (`HYDRATE`). **Ambition:** 1.
- **Verdict:** keep as add-only.

#### Mind and learning

**`mind_read` — Read**

- **Targets:**
  - V1: 5/10/20 pages.
  - V2: 5–30 min; Focus-goal users start at 10.
- **Science:** no outcome claim (register).
- **Ambition:** 2 (a "15-minute read" isn't a reading transformation; "finish four books" is).
- **Verdict:** strengthen into _The Reading Path_, with a books-finished destination.

**`mind_meditate` — Breathe (V1)**

- **Targets:** 3 min of slow breathing → **10 min meditation** → **20 min meditation**.
- **Problems:** the activity changes between levels; no precautions.
- **Verdict:** retire in favour of `mind_breathe`.

**`mind_breathe` — Slow breathing (V2)**

- **Targets:** 2–10 min. Excluded with heart conditions or pregnancy; a stop-if-dizzy note.
- **Science:** [Evidence] Small stress reduction, mostly at moderate-to-high risk of bias (`BREATH`); transient
  light-headedness reported (`BREATH-AE`).
- **Ambition:** 1.
- **Verdict:** keep as an optional calm support, not a flagship.

**`mind_journal` — Journal**

- **Targets:**
  - V1: 1 line → 3 lines → a full page.
  - V2: 1–5 sentences.
- **Science:** [Mixed] Expressive writing has a small and inconsistent effect (`WRITE`).
- **Ambition:** 1.
- **Verdict:** combine. Reflection becomes the **weekly check-in** of every flagship ("What moved? What got in the
  way? Too easy, right, or too hard?"), not a separate daily checkbox.

#### Focus and execution

**`focus_deepwork` — Deep work (V1) / Focused work (V2)**

- **Targets:**
  - V1: 20 → 45 → 90 min, phone in another room.
  - V2: a 10–90 min ladder (16–17 capped at 60), always starting at 15.
- **Science:** no outcome claim (register). Phone-out-of-reach is a [Principle].
- **Ambition:** 4 — the habit closest to a flagship already.
- **Problem:** V2 plans end at **45 min** for everyone, and it's undirected: nothing ties the minutes to a project.
- **Verdict:** strengthen into _Deep Work Sprint_, with a named project, weekly focused hours and a milestone.

**`focus_top3` — Top priorities (V1) / Most important task (V2)**

- **Targets:**
  - V1: write #1 → top 3 and do #1 → do all 3.
  - V2: write #1 → work on it 10/25/45 min first.
- **Science:** [Evidence] Implementation intentions (when/where plans) improve goal attainment, d ≈ 0.65 (`II`,
  from secondary summaries).
- **Ambition:** 3.
- **Verdict:** strengthen into _Plan and Execute_: an evening plan, the most important task done by a chosen time,
  and a weekly review.

**`discipline_cold` — Cold finish (V1)**

- **Targets:** 30 s → 1 min → 2 min cold at the end of a shower.
- **Problem:** never suitable as a recommendation. Cold exposure carries cardiovascular risk for some people, and
  V1 asks nothing about health. "Doing one hard thing on purpose" is a fine idea; it doesn't need to be cold water.
- **Verdict:** retire from new recommendations. Never mandatory; at most a custom habit someone writes themselves.

#### Social

**`confidence_talk` — Start a conversation (V1) / Meaningful conversation (V2, choice-only)**

- **Targets:**
  - V1: 1 → 2 conversations → speak up once in a group.
  - V2: a genuine conversation → ask a follow-up question → start one yourself with someone you know.
- **Safety (V2):** no strangers needed; swappable.
- **Science:** [Evidence] Brief conversations, even with strangers, were rated more positively than expected
  (`STRANGERS`; one-off, US urban settings).
- **Ambition:** 3.
- **Verdict:** combine into the _Social Courage Ladder_, a self-authored, graded set of social initiatives.

**`confidence_compliment` — Genuine compliment**

- **Targets:** 1/2 compliments → tell someone specifically what they did well (V1); 1–3, a message counts (V2).
- **Ambition:** 1.
- **Verdict:** keep as a support of _Real Connections_. The competitor review also suggests "one kind act" as a
  warmer variant.

**`social_reach_out` — Reach out (V2)**

- **Targets:** message or call 1/2/3 people you care about.
- **Science:** [Evidence, observational] Social relationships are associated with survival (`SOCIAL`); no claim is
  shown.
- **Ambition:** 2.
- **Verdict:** strengthen as the daily action of _Real Connections_, with a weekly quality-time goal.

### 2.3 What the inventory says

- **Useful microhabits** (keep, but as supports): Make your bed, Phone-free wind-down, Morning daylight, Slow
  breathing, Genuine compliment, Fruit and veg, Unsweetened drinks, Water with meals.
- **Flagship material** (strengthen): Focused work, Most important task, Steady wake-up (with Earlier bedtime), App
  time (with the morning and social zones), Read, Walk, Reach out, Meaningful conversation.
- **Retire from new recommendations:** Cold finish, Hydrate, Workout, Step count, Screen time cap, Breathe/meditate
  (V1). All are V1-only; V2 already excludes them.
- **Missing entirely:** skill development, personal organisation, a weekly review, any measured outcome, and any
  way to start ambitious.

---

## 3. Microhabits versus flagship challenges

|             | **Supporting microhabit**                              | **Flagship challenge**                                                                             |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Size        | Under 5 minutes, or a single rule                      | 15–120 minutes, or a substantial behaviour (an initiative, a review)                               |
| Purpose     | Makes the flagship easier (cue, environment, recovery) | Builds a capability the person wants                                                               |
| Measured by | Done or not done                                       | A **weekly metric** (focused hours, screen-time average, books, initiatives) plus done or not done |
| Destination | None needed                                            | A concrete **Day 66 destination**, set during onboarding                                           |
| Progression | Optional, small steps                                  | Readiness-based (section 5), across three intensities                                              |
| Weekly      | —                                                      | A weekly check-in, and optionally a mission (section 6)                                            |
| On screen   | Compact card                                           | Large scene card (the current habit card) with its weekly progress                                 |

**Default plan shape:**

- **Challenges:** 2–3 flagships.
- **Supports:** 1–3 supporting microhabits.
- **Size:** 4–6 cards in total. The 6-habit limit is enough for a default plan.

Section 8 covers optional extras beyond that.

---

## 4. The flagship Life Reset challenges

Ten active challenges and one future challenge that stays held. Each lists its capability, why someone would take it
on, the Day 66 destination, the activity, the measurement, suitability and safety, evidence, and the existing habits it
absorbs. Concrete targets for each phase and intensity are in section 5.4.

### 4.1 Deep Work Sprint — _Deep Focus_

- **Capability:** sustaining undistracted attention on one demanding piece of work.
- **Why take it on:** to finish the thesis chapter, the portfolio, the exam revision or the side project that keeps
  getting pushed to "later".
- **Day 66 destination (Standard):**
  - Five 60-minute protected blocks a week as a normal part of the week.
  - About 30 hours of focused work on **one named project** over the program.
  - A milestone of that project reached and shown (for example "first draft submitted").
- **Activity:** a timed block with the phone in another room and notifications off. One line afterwards: "What
  moved?"
- **Measure:** focused minutes per week against the weekly target, blocks completed, and the project milestone.
- **Suitability:** students, knowledge workers, creators.
  - Blocks count only on chosen work days (weekly quota, section 5.5), so rest days are protected.
  - **16–17:** blocks capped at 60 min (as V2 already does).
- **Safety:** encourage a short break every block; a block is never a reason to cut sleep (the copy says so).
- **Evidence:** [Principle] (single-tasking, phone out of reach); the targets are [Design].
- **Absorbs:** `focus_deepwork`.

### 4.2 Phone Under Control — _Digital Discipline_

- **Capability:** using the phone on purpose instead of by reflex.
- **Why take it on:** to win back hours a day, without pretending to quit the phone.
- **Day 66 destination (Standard):**
  - The main "pull" (social, video or games) averages **at least 40% below the person's own Week 1 baseline**.
  - Three phone-free zones are routine: the first hour, meals, and the last 30 minutes before bed.
- **Activity:** a daily budget for the pull app or category, set from the real Screen Time number, plus the zones
  for the current phase.
- **Measure:** the Screen Time weekly average for the pull category, entered on Sundays from the phone's own
  Settings, against the Week 1 baseline; days within budget; days with the zones kept.
- **Suitability:** anyone with 2+ hours of leisure phone use.
  - Work, school, navigation and messages to family are never counted.
  - The budget never goes below what the person says they need.
- **Safety:** no total-abstinence targets. If phone use feels compulsive and distressing, the app suggests talking
  to someone (no diagnosis).
- **Evidence:** [Mixed] (`SM-LIMIT`, `SCREEN-SLEEP`). A baseline-relative budget is a [Design] improvement over
  fixed caps; no well-being claim is made.
- **Absorbs:** `screen_app_limit`, `screen_social`, `screen_morning` and `sleep_no_phone_bed` (as zones), and
  `screen_limit` (retired).

### 4.3 Plan and Execute — _Daily Execution_

- **Capability:** deciding what matters before the day starts, and doing the most important thing first.
- **Why take it on:** to stop ending busy days with nothing important done.
- **Day 66 destination (Standard):**
  - Every work or school day has three priorities chosen the evening before, with a start time for #1.
  - #1 is done before the person's chosen time on **at least 4 of 5 days**.
  - A 20-minute weekly review sets 3 outcomes for the week, and at least 2 of 3 are hit most weeks.
- **Activity:**
  - Evening (2 min): tomorrow's top 3, with when and where for #1.
  - Day: #1 first.
  - Weekly: a review on a day the person chooses.
- **Measure:** the share of days with #1 done by the chosen time; weekly outcomes hit (0–3); reviews held.
- **Suitability:** everyone; especially busy adults and students in exam periods.
- **Safety:** none specific. The copy avoids "productivity guilt" (a missed #1 just moves to tomorrow).
- **Evidence:** [Evidence] Implementation intentions, d ≈ 0.65 (`II`, secondary summaries). The weekly review is a
  [Principle].
- **Absorbs:** `focus_top3`, V1 `discipline_bed` Hard ("plan tomorrow"), and the competitor review's "Plan
  tomorrow".

### 4.4 The Reading Path — _Reading and Learning_

- **Capability:** a sustained reading habit that actually finishes books, or works through a course.
- **Why take it on:** "I used to read" is one of the most common regrets; finishing books is visible proof of change.
- **Day 66 destination (Standard):**
  - Reading 30–40 minutes on most days.
  - **Four books finished** (about 1,200 pages), each with a three-sentence takeaway.
- **Activity:**
  - Timed reading; audiobooks and e-readers count.
  - A **Learning mode** swaps books for a course: lessons and notes.
- **Measure:** minutes a week, pages or percent, books finished, takeaways written.
- **Suitability:** everyone. Audiobooks make it accessible with dyslexia or visual impairment.
- **Safety:** none specific.
- **Evidence:** no outcome claim. The book target is [Design].
- **Absorbs:** `mind_read`.

### 4.5 Social Courage Ladder — _Social Confidence_

- **Capability:** taking social initiative despite discomfort.
- **Why take it on:** confidence follows action. Many people want to speak up in class, start conversations or
  invite people, and wait to "feel ready".
- **Day 66 destination (Standard):**
  - About five social initiatives a week as normal.
  - The person has done the step they rated **6–7 out of 10** for discomfort on their own Week 1 list (for example,
    speaking up in a meeting, or inviting a classmate to study).
- **Activity:**
  - In Week 1 the person writes their own ladder: 8–10 everyday social actions, each rated 0–10 for discomfort.
    Schwung offers safe examples to choose from.
  - Each week they climb to the next rungs.
- **Measure:** initiatives a week, the highest rung reached, and expected versus actual discomfort (a one-tap rating
  before and after).
- **Suitability:** 16+. **Every rung is self-chosen.** Ordinary situations only. Nobody is ever required to approach
  strangers, meet people from the internet, share personal information, go out alone at night, or do anything in
  alcohol-centred settings.
- **Safety:** this is practice, not treatment. If anxiety stops someone doing everyday things, the app suggests a GP
  or counsellor. A rung can be skipped or swapped at any time with no penalty.
- **Evidence:** [Evidence] Conversations rated more positively than expected (`STRANGERS`). Graded exposure is a
  [Principle]: well established in CBT, not yet in Schwung's register, and needs review before any claim.
- **Absorbs:** `confidence_talk`; `confidence_compliment` as a warm-up rung.

### 4.6 Move Every Day — _Physical Activity_

- **Capability:** regular activity as part of every week, in activities the person chooses.
- **Why take it on:** more energy and a body that feels capable, without a gym plan from an app.
- **Day 66 destination:** the person's **next guideline step**, reached gradually from where they are:
  - From little or no activity: about 150 minutes a week of walking or other moderate activity
    ([Guideline] `WHO-PA` lower bound).
  - From 1–2 active days: about 200 minutes a week.
  - Already active: keep consistency (a fitness ramp isn't Schwung's job), or add a new activity they choose.
- **Activity:** active minutes in walking, cycling, dancing, sport or swimming. **Schwung never prescribes exercises,
  sets or intensity.**
- **Measure:** weekly active minutes (self-entered, or later from Apple Health), and days active.
- **Suitability:** V2's precaution rules apply unchanged:
  - **Excluded:** heart conditions, pregnancy and walking difficulty. These people get individual-advice notes.
  - **Extra note:** a stop-if-unwell note for 65+, joint pain or unknown precautions.
- **Weekly increases:** a design limit of about 10–20% a week, never a jump.
- **16–17:** WHO's adolescent recommendation (an average of 60 minutes a day for ages 5–17) is **not yet in the
  register**. It must be reviewed before any 16–17 target cites it. Until then 16–17 use the same gradual minutes
  with no guideline claim.
- **Evidence:** [Guideline] `WHO-PA`, `CDC-PA`; [Evidence] `WALK-MA`.
- **Absorbs:** `move_walk` as the Starter path; `move_steps` and `move_workout` (retired).
- **Held separately:** strength sessions stay held (challenge 11).

### 4.7 Sleep Anchor — _Sleep Consistency_

- **Capability:** a stable sleep schedule with enough opportunity for sleep.
- **Why take it on:** steady energy, and the base everything else is built on.
- **Day 66 destination (Standard):**
  - Up within 30 minutes of the person's **own** anchor time on 6 of 7 days, weekends included.
  - Time in bed at least the age band's minimum (adults 7 h, 16–17 8 h), within the existing ceilings.
  - A 30-minute wind-down most nights.
- **Activity:** the wake window, the wind-down, and (when eligible) an in-bed time.
- **Measure:** days a week inside the wake window; average time in bed (both self-reported in two taps).
- **Never:**
  - an earlier wake time than the person's own;
  - less time in bed;
  - an earlier-bedtime target for 16–17 (pending review, as now);
  - a time-in-bed increase with insomnia or a sleep condition (consistency only).

  With trouble sleeping most nights, the existing "worth mentioning to a doctor" note stays. Shift workers get the
  existing variants or are excluded.

- **Evidence:** [Guideline] `AASM-ADULT`, `AASM-PED`; [Principle] `NHS-INS` (fixed wake time).
- **Absorbs:** `sleep_wake` (core), `sleep_bedtime` (where eligible), and `sleep_no_phone_bed` and
  `sleep_morning_light` as supports.

### 4.8 Order Out of Chaos — _Personal Organisation_

- **Capability:** a trusted system for tasks, time, space and life admin.
- **Why take it on:** to stop things slipping: the forgotten deadline, the messy room, the 3,000 unread emails, the
  bills.
- **Day 66 destination (Standard):**
  - One task list and one calendar used every day.
  - A 10-minute evening reset that keeps space and inbox clear.
  - A 30-minute **weekly reset** held 9 weeks running.
  - The person's own backlog of life-admin items (listed in Week 1) cleared.
- **Activity:** the daily reset, the weekly reset, and admin items cleared from the backlog.
- **Measure:** weekly resets held, backlog items cleared against the Week 1 list, days with the evening reset.
- **Suitability:** everyone.
- **Safety:** none specific. Money items are the person's own tasks; Schwung gives no financial advice.
- **Evidence:** [Principle]; the targets are [Design].
- **Absorbs:** `discipline_bed` (Starter rung) and the "room reset" rungs.

### 4.9 Skill Sprint — _Skill Development_

- **Capability:** deliberate practice toward a skill the person can demonstrate.
- **Why take it on:** to finally learn the guitar piece, the language or the coding project, and have something to
  show on Day 66.
- **Day 66 destination (Standard):**
  - About 25 hours of focused practice.
  - **A recorded or shared result:** play the piece, hold a 10-minute conversation, publish the small project.
  - A Day 1 versus Day 66 comparison using the same test recorded twice.
- **Activity:** practice blocks on one sub-goal at a time, plus a weekly "proof" (a recording, screenshot or
  short note).
- **Measure:** practice minutes a week, weekly proofs, and the Day 1 versus Day 66 benchmark.
- **Suitability:** everyone.
  - Physical or sport skills are self-directed; Schwung gives no drills.
  - **16–17:** the same 60-minute block cap as focus.
- **Safety:** none specific beyond the block cap and rest days.
- **Evidence:** [Principle] (deliberate practice, retrieval); the targets are [Design].
- **Absorbs:** nothing (new).

### 4.10 Real Connections — _Meaningful relationships_

- **Capability:** keeping and deepening the relationships that matter.
- **Why take it on:** loneliness is common, and connection takes action rather than intention.
- **Day 66 destination (Standard):**
  - A regular rhythm with **3–5 key people**: a weekly call, a standing plan or a shared activity.
  - **Two reconnections** with people the person had lost touch with.
  - At least one quality-time plan every week.
- **Activity:**
  - Daily: a meaningful message or call (not just reacting to a post).
  - Weekly: one quality-time plan, in person or a 20+ minute call.
- **Measure:** meaningful contacts a week, quality-time plans kept, reconnections.
- **Suitability:** everyone.
- **Safety:**
  - Never a prompt to contact someone who harmed the person.
  - The ladder lets people include online friends.
  - If loneliness feels heavy, the app points to support.
- **Evidence:** [Evidence, observational] `SOCIAL`; no mortality claim is shown.
- **Absorbs:** `social_reach_out`; `confidence_compliment` as a support.

### 4.11 Strength Foundations — _held, inactive_

A placeholder for when the exercise-protocol and physiotherapist reviews are complete: two sessions a week, from the
held prototypes and `move_strength_session`. **Not offered, not designed further here, and not activated by
anything in this document.**

### 4.12 Coverage

| Founder's area           | Challenge                                  |
| ------------------------ | ------------------------------------------ |
| Deep Focus               | Deep Work Sprint                           |
| Digital Discipline       | Phone Under Control                        |
| Daily Execution          | Plan and Execute                           |
| Reading and Learning     | The Reading Path (with Learning mode)      |
| Social Confidence        | Social Courage Ladder                      |
| Physical Activity        | Move Every Day (Strength Foundations held) |
| Sleep Consistency        | Sleep Anchor                               |
| Personal Organisation    | Order Out of Chaos                         |
| Skill Development        | Skill Sprint                               |
| Meaningful relationships | Real Connections                           |

---

## 5. Difficulty and progression

### 5.1 Principles

1. **Intensity sets the start; phases set _when_ a step-up can be considered; performance decides whether it
   happens.**
2. **A step-up is always offered, never imposed.** A step-down is always suggested, never punitive.
3. **Phases change _what_ you do, not only how much.**
   - **Foundation:** baseline and consistency.
   - **Momentum:** depth.
   - **Mastery:** a capstone and proof.
4. **Mastery is a level the person can keep after Day 66**, not the most they can survive.
5. Physical, sleep and social targets **never** escalate beyond the safety rules in section 10, whatever the
   intensity.

### 5.2 The three intensities

| Intensity     | For                                   | Recommended when (onboarding)                                                                                                                                                          |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Starter**   | Re-establishing consistency           | Low baseline for this challenge, under 30 min a day available, or the person says they've struggled with routines                                                                      |
| **Standard**  | A meaningful challenge (the default)  | Moderate baseline, 30–60 min a day available                                                                                                                                           |
| **Challenge** | People with routines who want to push | High baseline for this challenge **and** 60+ min a day available. Never recommended by default for 16–17 in Move Every Day or Sleep Anchor (there, "Challenge" only means consistency) |

Intensity is **per challenge**: a student can take Deep Work Sprint at Challenge and Social Courage at Starter.
People can change intensity in Habit Detail at any time; the change takes effect the next day.

### 5.3 Readiness rules (replacing the automatic Day 22/45 rises, for new Life Reset programs only)

Each flagship is evaluated over its **last 14 days** (scheduled or quota habits: the last two weeks of sessions):

| Condition                                                                                                                                                                                                | What the app does                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Step up offered**: on or after a phase start (Day 22 or 45), with ≥ 80% of the last 14 days done (≥ 11 of 14, or the weekly quota met both weeks) **and** the latest weekly check-in is not "too hard" | Offer the next phase's target ("Ready for Momentum?"). Accept, or "Not yet" (asked again in a week)                             |
| **Early step up**: 14 days at ≥ 90% before a phase start **and** a check-in of "too easy"                                                                                                                | Offer the next target early. At most one step per 14 days                                                                       |
| **Hold**: 60–79% done                                                                                                                                                                                    | Stay; the card shows what's working; no offer                                                                                   |
| **Suggest a step down**: < 60% over 14 days, or "too hard" in two consecutive check-ins                                                                                                                  | Kindly offer the previous target, or the next intensity down ("Make it fit your life for now?"). Never below Starter Foundation |
| **Stay at Mastery**: Mastery reached                                                                                                                                                                     | Keep it; offer the Day 66 capstone. No "Beyond" level inside the 66 days                                                        |

The **weekly check-in** is three taps on a day the person chooses:

- this week felt _too easy / about right / too hard_;
- the weekly metric (for example, minutes or a Screen Time average);
- one optional line.

It replaces daily journaling for flagships.

**Supporting microhabits** keep today's mechanics: the 7-day early offer and the 3-miss step-down. They don't rise
automatically at phase starts in Life Reset programs either; they're offered, like flagships.

**Existing V1 and V2 programs keep the current `reconcile` rules exactly**, with automatic phase rises. New rules
apply only to programs created as Life Reset programs (stored with a program version, section 11).

### 5.4 Progression tables

Each cell gives the Foundation (Days 1–21), Momentum (22–44) and Mastery (45–66) target. "×5/wk" is a weekly quota
on days the person chooses (section 5.5).

**Deep Work Sprint** (one named project; phone in another room)

| Intensity | Foundation   | Momentum     | Mastery                          | Day 66 total (approx.) |
| --------- | ------------ | ------------ | -------------------------------- | ---------------------- |
| Starter   | 20 min ×4/wk | 30 min ×5/wk | 45 min ×5/wk                     | ~22 h                  |
| Standard  | 30 min ×5/wk | 45 min ×5/wk | 60 min ×5/wk                     | ~32 h                  |
| Challenge | 60 min ×5/wk | 90 min ×5/wk | 2 × 75 min ×5/wk (16–17: 2 × 60) | ~75 h                  |

**Phone Under Control** (budget for the main pull, as a share of the person's Week 1 baseline; zones are cumulative)

| Intensity | Foundation                                 | Momentum                                           | Mastery                                                                                  |
| --------- | ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Starter   | Budget −15%; zone: first 30 min of the day | −25%; + last 30 min before bed                     | −35%; + meals                                                                            |
| Standard  | −25%; first 60 min                         | −40%; + last 30 min + meals                        | −50%; + one phone-free evening a week                                                    |
| Challenge | −40%; first 60 min + last 60 min           | −60%; + meals + notifications off for the pull app | Pull app ≤ 30 min a day (or −70%, whichever is higher); + two phone-free evenings a week |

**Plan and Execute**

| Intensity | Foundation                                                       | Momentum                                                                             | Mastery                                                              |
| --------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Starter   | Write tomorrow's #1 each evening; start it for 10 min            | #1 done on 3 of 5 days; 10-min weekly review                                         | Top 3 written; #1 done on 4 of 5 days; 20-min review                 |
| Standard  | Top 3 plus a start time for #1, each evening; #1 started by then | #1 done before your chosen time on 4 of 5 days; 20-min weekly review with 3 outcomes | Time-block the top 3; ≥ 2 of 3 weekly outcomes most weeks            |
| Challenge | Time-blocked workdays; #1 first, every workday                   | + 30-min weekly review; one "hard thing first" a day                                 | + monthly outcome set in Week 6; ≥ 3 of 3 weekly outcomes most weeks |

**The Reading Path** (Learning mode: lessons instead of books)

| Intensity | Foundation   | Momentum | Mastery | Day 66 destination                   |
| --------- | ------------ | -------- | ------- | ------------------------------------ |
| Starter   | 10 min a day | 15 min   | 20 min  | 2 books finished                     |
| Standard  | 20 min       | 30 min   | 40 min  | 4 books, a 3-sentence takeaway each  |
| Challenge | 30 min       | 45 min   | 60 min  | 6+ books, a one-page reflection each |

**Social Courage Ladder** (rungs are the person's own discomfort ratings, 0–10)

| Intensity | Foundation                  | Momentum        | Mastery                                       |
| --------- | --------------------------- | --------------- | --------------------------------------------- |
| Starter   | 3 initiatives a week at 1–3 | 4 a week at 3–4 | 5 a week at 4–5, plus one at 6                |
| Standard  | 4 a week at 2–4             | 5 a week at 4–5 | 5 a week at 5–7, including your "summit" rung |
| Challenge | 5 a week at 3–5             | Daily at 5–6    | Daily at 6–8; organise one group plan         |

**Move Every Day** (weekly active minutes, the person's chosen activities; increases of at most about 20% a week
inside each phase)

| Intensity (starting point)  | Foundation                           | Momentum                     | Mastery                        |
| --------------------------- | ------------------------------------ | ---------------------------- | ------------------------------ |
| Starter (0 active days)     | 70 min/wk (10 a day)                 | 105 min/wk                   | 150 min/wk                     |
| Standard (1–2 active days)  | 120 min/wk                           | 150 min/wk                   | 200 min/wk                     |
| Challenge (3–4 active days) | Keep the current routine + 30 min/wk | + a new activity once a week | 250–300 min/wk, if comfortable |

**Sleep Anchor** (window around the person's own wake time; never earlier, never less time in bed)

| Intensity | Foundation                 | Momentum                                       | Mastery                                                                    |
| --------- | -------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Starter   | Within 60 min, 5 of 7 days | Within 45 min, 5 of 7                          | Within 30 min, 5 of 7, plus a 15-min wind-down                             |
| Standard  | Within 45 min, 6 of 7      | Within 30 min, 6 of 7, plus a 30-min wind-down | Within 30 min, 7 of 7, plus wind-down; age-band time in bed where eligible |
| Challenge | Within 30 min, 7 of 7      | + a 45-min wind-down + morning daylight        | Within 15–20 min, 7 of 7, plus a 60-min wind-down                          |

**Order Out of Chaos**

| Intensity | Foundation                                       | Momentum                                               | Mastery                                       |
| --------- | ------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------- |
| Starter   | Make your bed + a 5-min evening reset            | + one task list for everything                         | + a 20-min weekly reset                       |
| Standard  | A 10-min evening reset + one list + one calendar | + a 30-min weekly reset; 2 backlog items a week        | Backlog cleared; weekly reset held every week |
| Challenge | As Standard Foundation + inbox triage daily      | + digital declutter (files, email, apps), 15 min a day | + a monthly admin and money review            |

**Skill Sprint** (one skill; a weekly proof from Momentum)

| Intensity | Foundation   | Momentum                             | Mastery                  | Day 66                           |
| --------- | ------------ | ------------------------------------ | ------------------------ | -------------------------------- |
| Starter   | 15 min ×5/wk | 20 min ×5/wk + weekly proof          | 25 min ×5/wk             | ~11 h; Day 1 vs Day 66 benchmark |
| Standard  | 20 min ×5/wk | 30 min ×5/wk + proof                 | 45 min ×5/wk             | ~25 h; a shared result           |
| Challenge | 45 min ×5/wk | 60 min ×5/wk + proof (16–17: 60 max) | 90 min ×5/wk as 2 blocks | ~60 h; a public result           |

**Real Connections**

| Intensity | Foundation               | Momentum                                                       | Mastery                                                     |
| --------- | ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Starter   | Reach out 3 times a week | Reach out 5 times a week + one quality-time plan every 2 weeks | Daily + a weekly plan                                       |
| Standard  | Reach out daily          | + a weekly quality-time plan                                   | + 2 reconnections + one recurring ritual set up             |
| Challenge | Daily + a weekly plan    | + host or organise something every 2 weeks                     | + 3–5 people in a regular rhythm; a group tradition started |

### 5.5 Mechanics this needs (not built)

| Need                                                  | Why                                                                             | Fits existing code?                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Weekly quota** ("5 times this week, any days")      | Flagships like Deep Work need flexible days; fixed weekdays don't suit students | New: `schedule.ts` supports 2–3 fixed weekdays only. A quota type would extend it (approved decision 4, "move once within the week", points the same way) |
| **Quantities** (minutes, pages, an initiative's rung) | Weekly metrics and the destinations                                             | New optional `amounts` map in a day's log; old logs stay valid                                                                                            |
| **Weekly check-in**                                   | Readiness rules and reflection                                                  | New; one record a week per flagship                                                                                                                       |
| **Program version**                                   | Old programs keep old rules                                                     | New optional field; absent = V1 or V2 as now                                                                                                              |

---

## 6. Weekly missions

### 6.1 How missions work

- **One optional mission a week**, chosen on the person's review day from 2–3 suggestions tied to their flagships.
  Missions are never assigned, and "No mission this week" is a first-class choice.
- **Missions are bigger and one-off, not daily.** They're done once during the week: a real project, a test, a
  measurement. They complement the daily habits rather than repeat them.
- **They never affect the daily 80% rule, streaks or step-downs.** A completed mission gives bonus XP and a line in
  the Journey (for example, "Week 3: first presentation to the group"). A missed mission disappears without comment.
- **Not every challenge needs missions.**
  - **Get them:** Sleep Anchor and supporting microhabits get missions only in Week 1 (baseline) and Week 9
    (capstone).
  - **Benefit most:** Deep Work, Phone, Plan and Execute, Social Courage, Skill and Reading.
- **The arc:**

  | Week(s)         | Theme                                 |
  | --------------- | ------------------------------------- |
  | 1               | Measure and set up                    |
  | 2–3             | First real test                       |
  | 4–6             | Stretch                               |
  | 7–9             | Build toward the capstone             |
  | 10 (Days 64–66) | The Summit: re-measure against Week 1 |

### 6.2 Sample missions

| Challenge             | Week 1 (measure and set up)                                                                                              | Week 3 (first test)                                                                                          | Week 6 (stretch)                                                               | Week 9 (capstone build)                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Deep Work Sprint      | Name your project and its Day 66 milestone; plan this week's blocks in your calendar                                     | Finish one concrete deliverable (an essay section, a feature, a chapter's notes) using only protected blocks | One "deep day": three blocks on the project in a single day, with breaks       | Hand in, ship or show the milestone, or set its exact date                      |
| Phone Under Control   | Write down last week's real Screen Time for your main pull; that's your baseline. Move the pull app off your home screen | A personalised screen-time plan: set the phone's own app limit to this phase's budget and keep it all week   | A phone-free evening with something planned instead (a friend, sport, a film)  | A full weekend day under half your baseline                                     |
| Plan and Execute      | List the 3 outcomes that would make the next 9 weeks a success                                                           | Plan and execute three important priorities this week, each scheduled in your calendar                       | One week of fully time-blocked workdays; review what got in the way            | Your weekly review: compare the last 9 weeks with Week 1 and set the next month |
| The Reading Path      | Choose your 2/4/6 books and get the first one                                                                            | Finish your first book; write its three-sentence takeaway                                                    | Read somewhere new for an hour (a library, a park)                             | Finish the last book on your list, or recommend one to a friend                 |
| Social Courage Ladder | Write your ladder: 8–10 situations, rated 0–10                                                                           | Do one rung above your comfort zone, then rate how it actually went                                          | Take a social initiative that would normally feel uncomfortable: your 5–6 rung | Your "summit" rung, the 6–7 from your own Week 1 list                           |
| Move Every Day        | Record a normal week's active minutes; pick two activities you enjoy                                                     | Try one new activity (a class, a cycle route, a sport with friends)                                          | Your longest comfortable walk or ride so far, or an active day out             | Plan how movement continues after Day 66 (a team, a regular route, a buddy)     |
| Sleep Anchor          | Note your wake times for 7 days; choose your anchor                                                                      | —                                                                                                            | —                                                                              | Keep the anchor every day this week, weekends included                          |
| Order Out of Chaos    | List your admin backlog (everything that's been nagging you)                                                             | Clear the three oldest items                                                                                 | A 2-hour "deep reset": one area of life sorted (desk, files, finances)         | The backlog is empty, or scheduled                                              |
| Skill Sprint          | Record your Day 1 benchmark (play, speak, build)                                                                         | Learn one specific sub-skill and record it                                                                   | Show your progress to one person and ask for one piece of feedback             | Prepare the Day 66 demonstration                                                |
| Real Connections      | List the 3–5 people who matter most and one you've lost touch with                                                       | Plan quality time with one of them this week                                                                 | Reconnect with someone you've lost touch with                                  | Set up something recurring (a weekly call, a standing plan)                     |

**Week 10 summit (Days 64–66), every challenge:** re-measure the Week 1 baseline (Screen Time, active minutes,
benchmark recording, books, ladder rung) and see both side by side. That's the moment the 66 days become visible.
It's a summary screen; ceremonies are unchanged.

---

## 7. Onboarding

### 7.1 What's wrong now

- **V1** asks about six health areas and builds the plan around deficits. The goal is one of six inputs.
- **V2** is careful about safety but still deficit-first. A focus-minded student answers questions about fruit and
  veg and sugary drinks before anything about what they want to achieve.
- **Neither asks** about ambition, available time, or the specific thing the person wants to accomplish (the
  project, the books, the skill).

### 7.2 Proposed flow: transformation first, about 8–9 screens

| #   | Screen                                                                                                                  | Purpose                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | **How old are you?** (unchanged, with the 16+ gate)                                                                     | Safety; sets the 16–17 rules                |
| 2   | **What do you want to change in the next 66 days?** Choose up to 2                                                      | Picks the candidate flagships (below)       |
| 3   | **Where are you starting from?** 1–2 baseline questions **only for the chosen areas**                                   | Starting intensity and targets              |
| 4   | **How much time can you give this most days?** 15 / 30 / 60 / 90+ min                                                   | Caps the plan's daily load                  |
| 5   | **How hard do you want to push?** Starter / Standard / Challenge, with the recommended one marked                       | Intensity (overridable per challenge later) |
| 6   | **Make it yours** (optional): name your project, skill or books; one line on "what would make Day 66 a win?"            | Destination and motivation                  |
| 7   | **Keeping it safe**: the existing precautions question (skippable = unknown)                                            | Exclusions and notes                        |
| 8   | **Your Life Reset**: 2–3 flagships plus supports, each with its Day 66 destination and daily time; edit, swap or remove | Confirmation                                |
| 9   | Times (wake and in-bed), **only when a chosen challenge needs them** (as now)                                           | Personal sleep targets                      |

The current V2 health baseline (fruit and veg, sugary drinks, sleep trouble) is asked **only** when a related area is
chosen ("Build a healthier routine", or a sleep-related answer) or a red flag needs it. That keeps the flow short.

### 7.3 Transformations → candidate flagships

| Answer                                  | First choices                        | Often paired with                          |
| --------------------------------------- | ------------------------------------ | ------------------------------------------ |
| Become more disciplined                 | Plan and Execute, Sleep Anchor       | Phone Under Control                        |
| Stop wasting time on my phone           | Phone Under Control                  | The Reading Path (something to do instead) |
| Improve my focus and productivity       | Deep Work Sprint, Plan and Execute   | Phone Under Control                        |
| Become more confident                   | Social Courage Ladder                | Real Connections, Move Every Day           |
| Build a healthier routine               | Move Every Day, Sleep Anchor         | Fruit and veg, Unsweetened drinks (adults) |
| Feel more in control of my life         | Order Out of Chaos, Plan and Execute | Sleep Anchor                               |
| Learn or build something _(new option)_ | Skill Sprint, The Reading Path       | Deep Work Sprint                           |

### 7.4 Baseline questions (one or two per chosen area)

| Challenge             | Question                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Deep Work Sprint      | How long can you usually work on something hard before checking your phone? (<10 / 10–30 / 30–60 / 60+ min)    |
| Phone Under Control   | Your daily Screen Time for your biggest pull, from Settings (a number, or "not sure": then Week 1 measures it) |
| Plan and Execute      | How often do your most important tasks get done on the day you planned them?                                   |
| The Reading Path      | How many books did you finish in the last year?                                                                |
| Social Courage Ladder | How comfortable are you starting conversations or speaking up in a group? (1–5)                                |
| Move Every Day        | The existing active-days question                                                                              |
| Sleep Anchor          | The existing sleep hours, trouble and wake-time questions                                                      |
| Order Out of Chaos    | How often do things slip (deadlines, bills, messages)?                                                         |
| Skill Sprint          | Which skill, and where are you now (never tried / beginner / some experience)?                                 |
| Real Connections      | How many people do you have a meaningful conversation with in a typical week?                                  |

### 7.5 How the plan is chosen

1. **Flagships:** the first choice for each transformation (up to 2), plus one pairing if it fits the available time.
   - Under 30 min available: 2 flagships.
   - 30–90 min: 2–3.
   - 90+ min: 3.
2. **Supports:** 1–3 microhabits that make the flagships easier (Phone-free wind-down with Sleep Anchor or Phone
   Under Control; a warm-up), plus any **red-flag** need from the existing V2 needs logic (for example, under 6
   hours of sleep), at most one.
3. **Load check:** the sum of daily minutes at Foundation must fit the available time. If it doesn't, intensity is
   lowered or a flagship is dropped, and the person is told why.
4. **Safety:** V2 `exclusion` rules run on every candidate, unchanged. Held and prototype habits are never
   candidates.
5. **Intensity:** recommended from the baseline (5.2) and the age rules. The person can override, except where
   safety rules apply.

---

## 8. The habit limit (6 → 12)

### 8.1 Consequences of simply raising the limit

| Area                        | With up to 12 equal habits                                                                                                                                                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **80% rule**                | 12 habits → 10 needed (9.6 rounded up). Two can slip, so the rule gets _easier_ in relative terms while flagships count the same as microhabits. Someone could qualify every day while never doing their hardest habit                                         |
| **XP**                      | 10 per habit, so a 12-habit day earns 140 XP against 70 for 5. Player levels would reward **habit count**, not effort, and push people to add trivial habits                                                                                                   |
| **Full-day ceremonies**     | Days 7, 21 and 44 need a fully done day. With 12 habits a single miss blocks them (they still play later, but it feels like failure). Ceremonies aren't changed in this proposal, but this dependency must be decided before the limit rises                   |
| **Step-downs and offers**   | Per habit; unaffected. More habits means more step-down messages; the existing single combined message helps                                                                                                                                                   |
| **Scheduled and rest days** | Planned counts vary by day, so the 80% threshold moves daily. Already handled by `plannedForDay`, but less predictable with many scheduled habits                                                                                                              |
| **Swipe cards**             | 12 cards at 240–250 pt is about 3,000 pt of scrolling (~4.5 screens on a small iPhone), and swiping becomes tedious. Decoded scene images are about 4 MB per visible card, so all 12 rendered could approach 50 MB. Needs a virtualised list and compact cards |
| **Overwhelm**               | The strongest finding of the habit literature Schwung relies on is that fewer, well-chosen behaviours stick. 12 new habits on Day 1 would undermine the premise                                                                                                |

### 8.2 Recommendation

- **Core plan: max 6** (2–3 flagships plus supports).
  - The core is what counts for daily success (80%), the streak, step-downs and ceremonies.
  - The default plan is 4–6, as now.
- **Extras: up to 6 more (12 in total)**, added voluntarily, never recommended in onboarding.
  - Extras earn a little XP and show as compact cards in an "Extras" group below the core.
  - They **never** affect daily success or the streak.
  - Unlock: after Week 1 for Starter and Standard, immediately for Challenge, with a one-line warning
    ("More habits isn't more progress. Extras don't count toward your day.").
- **XP rework (for Life Reset programs only):**
  - Day XP is based on the core completion share (0–60), plus 2 per extra (max 12).
  - A flagship done counts double toward the day's XP.
  - Mission bonus: 50.
  - Existing programs keep 10/20 XP exactly.
- **Cards:**
  - Core flagships keep the large scene cards.
  - Supports and extras get a compact variant, with the same swipe.
  - The list becomes virtualised (only the visible scenes are loaded).
- **Do not implement yet.** This is stage 8 of section 11 and depends on the progression and quantity work.

---

## 9. Example transformations

The **existing** recommendations below are the real output of the engines on `8649f5d`:

- **V1:** `buildPlan`, as used in production for new programs.
- **V2:** `previewPlan` under the release gate, as used in testing builds.

**Assumptions:**

- Targets at Days 1/22/45/66 follow `reconcile`: Easy, then Medium from Day 22, then Hard from Day 45. Day 66 is the
  same as Day 45.
- The person never misses 3 days in a row and accepts no early offers.

### Profile A — Ambitious student (19)

Wants stronger discipline, better focus, less scrolling and more confidence.

**Answers used:**

- **V1:** goal Focus; 6–7 h sleep; 4–6 h screens; exercise 1–2×/week; 4–8 glasses of water; rarely
  reads/meditates/journals.
- **V2:** 18–29; goal Focus; 6–7 h sleep, rarely trouble; active 1–2 days; fruit and veg 1–2; sugary drinks some;
  phone 4–6 h, mostly social media; no routines; no precautions; wake 07:30, in bed 00:30.

**Existing V1 (production):**

| Habit                   | Day 1                   | Day 22                  | Day 45                        | Day 66 |
| ----------------------- | ----------------------- | ----------------------- | ----------------------------- | ------ |
| Clean start             | Make your bed           | + tidy your room        | Bed, tidy room, plan tomorrow | same   |
| Read                    | 5 pages                 | 10 pages                | 20 pages                      | same   |
| Deep work               | 20 min focused          | 45 min                  | 90 min                        | same   |
| Earlier bedtime         | 30 min earlier          | In bed 7 h before alarm | 8 h before alarm              | same   |
| Workout                 | 10 push-ups + 20 squats | 20 min workout          | 40 min workout                | same   |
| Hydrate (starts Medium) | 6 glasses               | 8 glasses               | 8 glasses                     | same   |

The phone (their biggest problem) isn't addressed. They get an unscreened workout and a water quota, and nothing
for confidence.

**Existing V2 (testing builds):**

| Habit              | Day 1                                         | Day 22              | Day 45             | Day 66 |
| ------------------ | --------------------------------------------- | ------------------- | ------------------ | ------ |
| Make your bed      | Make your bed                                 | + clear one surface | + 2-min room reset | same   |
| Social media later | No social apps for the first 1 h after waking | 2 h                 | 3 h                | same   |
| Focused work       | 15 min                                        | 25 min              | 45 min             | same   |
| Earlier bedtime    | In bed by 00:15                               | 00:00               | 23:45              | same   |
| Walk               | 10 min                                        | 15 min              | 20 min             | same   |

Safer and more personal, but the most ambitious target on Day 66 is 45 minutes of focus. With goal **Discipline**
instead (same answers), V2 gives Steady wake-up, Most important task, a 10-minute Walk and **Fruit and veg**, and
**no phone habit** despite 4–6 hours of social media.

**Proposed Life Reset** (transformations: _focus_ + _confidence_; 60–90 min a day; intensities chosen per challenge):

| Card                                                 | Intensity | Day 1                                                                    | Day 22 (if ready)          | Day 45 (if ready)                     | Day 66 destination                          |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------ | -------------------------- | ------------------------------------- | ------------------------------------------- |
| **Deep Work Sprint**: "Statistics coursework"        | Challenge | 60 min ×5/wk                                                             | 90 min ×5/wk               | 2 × 75 min ×5/wk                      | ~70 h of focused work; coursework submitted |
| **Phone Under Control**: social, baseline 3 h 20/day | Standard  | Budget 2 h 30; no phone first 60 min                                     | 2 h; + last 30 min + meals | 1 h 40; + a phone-free evening a week | Social ≈ 50% of baseline, measured          |
| **Social Courage Ladder**                            | Starter   | 3 initiatives/wk at 1–3 ("ask a classmate a question about the lecture") | 4/wk at 3–4                | 5/wk at 4–5, + one at 6               | Their own 6/10: "speak up in the seminar"   |
| Phone-free wind-down (support)                       | —         | 15 min                                                                   | offered 30 min             | offered 45 min                        | Wind-down routine                           |
| Make your bed (optional warm-up)                     | —         | as today                                                                 |                            |                                       |                                             |

- **Missions:**
  - **Week 1:** baseline Screen Time; name the project.
  - **Week 3:** finish one coursework section in blocks only.
  - **Week 6:** take a social initiative that would normally feel uncomfortable.
  - **Week 9:** submit or set the date.
- **Daily time:** about 75 min at Foundation, rising to about 2.5 h on block days at Mastery. That fits a student
  week of 5 work days, with weekends free from blocks.
- **Day 22 isn't automatic:**
  - **Deep Work, steps up:** done on 10 of 10 required days, check-in "about right", so Momentum is offered and
    accepted.
  - **Phone, holds:** 9 of 14 days within budget. It stays at Foundation for another week and steps up on Day 29.

### Profile B — Busy working adult (34)

Wants better time management, healthier routines and more consistency.

**Answers used:**

- **V1:** goal Discipline; 6–7 h sleep; 2–4 h screens; exercises a few times a month; 4–8 glasses of water; rarely
  reads/meditates/journals.
- **V2:** 30–49; goal Discipline; 6–7 h sleep, trouble 1–2 nights/week; active 1–2 days; fruit and veg 1–2; sugary
  drinks most days; phone 2–4 h, mostly messages and news; already makes their bed; no precautions; wake 06:30, in
  bed 23:15.

**Existing V1 (production):**

| Habit            | Day 1                              | Day 22            | Day 45            | Day 66 |
| ---------------- | ---------------------------------- | ----------------- | ----------------- | ------ |
| Clean start      | Make your bed                      | + tidy your room  | + plan tomorrow   | same   |
| **Cold finish**  | 30 s cold at the end of the shower | 1 min             | 2 min             | same   |
| Earlier bedtime  | 30 min earlier                     | 7 h before alarm  | 8 h before alarm  | same   |
| Step count       | 5,000                              | 7,500             | 10,000            | same   |
| Hydrate (Medium) | 6 glasses                          | 8 glasses         | 8 glasses         | same   |
| Breathe          | 3 min slow breathing               | 10 min meditation | 20 min meditation | same   |

**"Discipline" is a cold shower.** Nothing addresses time management.

**Existing V2 (testing builds):**

| Habit               | Day 1                                                  | Day 22               | Day 45         | Day 66 |
| ------------------- | ------------------------------------------------------ | -------------------- | -------------- | ------ |
| Make your bed       | Make your bed (they already do: "an easy first check") | + clear one surface  | + room reset   | same   |
| Steady wake-up      | Up within 60 min of 06:30                              | 45 min               | 30 min         | same   |
| Most important task | Write your #1 task                                     | + 10 min on it first | + 25 min first | same   |
| Walk                | 10 min                                                 | 15 min               | 20 min         | same   |
| Fruit and veg       | 2 portions                                             | 3                    | 4              | same   |

Sensible, but it reads as five small chores. There's no weekly structure, and time management ends at "25 minutes on
your #1 task".

**Proposed Life Reset** (transformations: _in control of my life_ + _healthier routine_; 30–45 min a day):

| Card                              | Intensity                                       | Day 1                                  | Day 22 (if ready)                                          | Day 45 (if ready)                            | Day 66 destination                                      |
| --------------------------------- | ----------------------------------------------- | -------------------------------------- | ---------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------- |
| **Plan and Execute**              | Standard                                        | Evening top 3 plus a start time for #1 | #1 done before 11:00 on 4 of 5 days + Sunday 20-min review | Time-blocked top 3; ≥ 2 of 3 weekly outcomes | 9 weekly reviews held; #1 before 11:00 ~80% of workdays |
| **Move Every Day**                | Starter → Standard                              | 70 min/wk (lunchtime walks)            | 105 min/wk                                                 | 150 min/wk (walks + a weekend ride)          | ~150 min/wk as normal, measured                         |
| **Sleep Anchor**                  | Standard (consistency only: some sleep trouble) | Up within 45 min of 06:30, 6 of 7 days | Within 30 min + a 30-min wind-down                         | Within 30 min, 7 of 7                        | Steady 06:30 anchor, weekends included                  |
| Unsweetened drinks (support, 18+) | —                                               | Swap 1 sugary drink                    | offered: up to 2                                           | offered: up to 3                             | —                                                       |

- **Missions:**
  - **Week 1:** list 3 outcomes for the 9 weeks.
  - **Week 3:** plan and execute three important priorities.
  - **Week 6:** one fully time-blocked week.
  - **Week 9:** a review comparing with Week 1.
- **Make your bed:** dropped (they already do it).
- **Daily time:** about 30 min at Foundation, about 45 min at Mastery.

### Profile C — Beginner rebuilding routines (23)

Needs manageable starting targets but wants meaningful long-term progress.

**Answers used:**

- **V1:** goal Energy; 5–6 h sleep; 6–8 h screens; never exercises; 2–4 glasses of water; never
  reads/meditates/journals.
- **V2:** 18–29; goal Energy; < 6 h sleep, trouble 1–2 nights/week; active 0 days; hardly any fruit and veg; sugary
  drinks most days; phone 6 h+, mostly videos; no routines; no precautions; wake 09:00, in bed 01:30.

**Existing V1 (production):**

| Habit           | Day 1          | Day 22           | Day 45           | Day 66 |
| --------------- | -------------- | ---------------- | ---------------- | ------ |
| Clean start     | Make your bed  | + tidy           | + plan tomorrow  | same   |
| Earlier bedtime | 30 min earlier | 7 h before alarm | 8 h before alarm | same   |
| Daily walk      | 15 min         | 30 min           | 45 min           | same   |
| Hydrate         | 4 glasses      | 6                | 8                | same   |
| Screen time cap | Under 7 h      | Under 5 h        | Under 3 h        | same   |
| Journal         | 1 line         | 3 lines          | a full page      | same   |

Six habits on Day 1 for someone with no routines. The jumps (walk 15 → 30 → 45 min; screens 7 h → 3 h) happen on
fixed days whether or not they've managed the previous step.

**Existing V2 (testing builds):**

| Habit          | Day 1                     | Day 22              | Day 45       | Day 66 |
| -------------- | ------------------------- | ------------------- | ------------ | ------ |
| Make your bed  | Make your bed             | + clear one surface | + room reset | same   |
| Steady wake-up | Up within 60 min of 09:00 | 45 min              | 30 min       | same   |
| Walk           | 5 min                     | 10 min              | 15 min       | same   |
| Fruit and veg  | 1 portion                 | 2                   | 3            | same   |
| Video time     | Videos under 120 min      | 90 min              | 60 min       | same   |

Earlier bedtime was correctly excluded (sleep trouble). Manageable, but on Day 66 they walk 15 minutes: a good
start, not a transformation.

**Proposed Life Reset** (transformations: _healthier routine_ + _stop wasting time on my phone_; 15–30 min a day;
all Starter):

| Card                                                                      | Intensity | Day 1                                       | Day 22 (if ready)                    | Day 45 (if ready)                  | Day 66 destination                                                                          |
| ------------------------------------------------------------------------- | --------- | ------------------------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------- |
| **Sleep Anchor** (consistency only: sleep trouble, no time-in-bed change) | Starter   | Up within 60 min of 09:00, 5 of 7 days      | Within 45 min                        | Within 30 min + a 15-min wind-down | A steady 09:00 anchor; the existing "worth mentioning to a doctor" note if trouble persists |
| **Move Every Day**                                                        | Starter   | 70 min/wk (10-min walks)                    | 105 min/wk                           | 150 min/wk                         | 150 min/wk of walking: guideline-level activity from zero, measured week by week            |
| **Phone Under Control**: videos, baseline 4 h                             | Starter   | Budget 3 h 25 (−15%); no phone first 30 min | 3 h (−25%); + last 30 min before bed | 2 h 35 (−35%); + meals             | Videos down about 1 h 25 a day, against their own baseline                                  |
| Make your bed (warm-up)                                                   | —         | Make your bed                               |                                      |                                    |                                                                                             |
| Fruit and veg (support)                                                   | —         | 1 portion                                   | offered: 2                           | offered: 3                         |                                                                                             |

- **Missions:**
  - **Week 1:** record a normal week's wake times and Screen Time.
  - **Week 3:** try one new activity with a friend.
  - **Week 6:** a phone-free evening with something planned.
  - **Week 9:** plan how walking continues after Day 66.
- **If Day 22 isn't ready:**
  - **Move, steps down:** 7 of 14 days done (< 60%), so the step-down is offered (back to 50 min/wk for a week)
    and the Momentum offer waits. Under today's rules the walk would simply have doubled.
  - **Sleep Anchor, holds:** steady, but the check-in says "too hard", so it stays at Foundation.

### Summary of the change

|                      | Existing V1                     | Existing V2                     | Proposed                                         |
| -------------------- | ------------------------------- | ------------------------------- | ------------------------------------------------ |
| Biggest card         | Make your bed                   | Make your bed                   | The person's main challenge                      |
| Personal destination | None                            | None                            | One per flagship, set in onboarding              |
| Measured outcome     | None                            | None                            | Weekly metric plus a Week 1 vs Day 66 comparison |
| Starts ambitious?    | No                              | No                              | Yes, per challenge                               |
| Difficulty rises     | On Days 22 and 45 automatically | On Days 22 and 45 automatically | When ready (performance and check-in), offered   |
| Unsafe items         | Cold, water quota, workout      | None                            | None                                             |

---

## 10. Safety and scientific credibility

### 10.1 Never in a Life Reset

- Universal or extreme exercise targets, prescribed sets, reps or intensity, or "no rest days". Movement is
  user-chosen activity minutes, increased gradually from the person's own baseline.
- Cold exposure in any recommendation.
- Restrictive eating, fasting, calorie or weight goals, or "clean eating". Food supports are additive, adult-only and
  skippable, as V2 already does.
- Hydration quotas.
- Earlier wake times than the person's own, reduced sleep, or "5 a.m. club" framing. Sleep Anchor only stabilises.
- Social challenges involving strangers by obligation, meeting people from the internet, unsafe settings, or public
  embarrassment. Every social rung is self-chosen and swappable.
- Punitive mechanics:
  - no lost progress for missed days (step-downs are offered, never imposed, in Life Reset programs);
  - no streak shaming;
  - no guilt copy ("You failed", "Don't break the chain");
  - no paywalled "recovery".

### 10.2 Protections to keep exactly

- **The 16+ gate,** the 16–17 rules (no earlier bedtime, no food habits, focus capped at 60 min, unsweetened drinks
  18+), the precaution exclusions, and the "unknown precautions" notes.
- **Insomnia and sleep conditions:** no time-in-bed increase. Trouble most nights: the doctor note.
- **Fitness prototypes and the strength session** remain held. Nothing activates them.
- **Release gate:** new content goes through the same gate and the same evidence-register process before it's shown
  outside development.

### 10.3 How claims are worded

- **No target is described as "proven" or "scientifically validated".**
  - **Guideline-based numbers:** say so ("WHO recommends at least 150 minutes a week").
  - **Design choices:** described as Schwung's suggestion.
- **The 66 days:** "A well-known study found habits took a median of about 66 days to feel automatic, with a wide
  range. Schwung uses 66 days as a structured challenge." Never "after 66 days it's automatic".
- **[Principle] items** (graded exposure, deliberate practice, single-tasking, weekly review) must be added to the
  evidence register, with sources checked, before any benefit is claimed. Until then the copy describes the
  activity, not the outcome.

### 10.4 Who needs to review

| Item                                                         | Reviewer                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Social Courage Ladder copy and safeguards                    | Clinical psychologist (graded-exposure framing, signposting)           |
| Move Every Day minutes for 16–17, and weekly increase limits | Exercise professional; add the WHO adolescent guidance to the register |
| Sleep Anchor for 16–17 (consistency only)                    | Sleep expert (the existing pending review)                             |
| Phone Under Control signposting for compulsive use           | Psychologist                                                           |
| Strength Foundations                                         | The existing physiotherapist and exercise-protocol review              |

---

## 11. Implementation sequence

Small stages, each independently testable, committed separately, and **testing builds only** until the founder
approves a production rollout.

**Compatibility rules for every stage:**

- **Saved programs:** existing V1 and V2 programs are never converted, and their plan, levels, logs, XP and rules
  stay exactly as they are.
- **Program version:** Life Reset programs carry a new optional `program: 'reset'` (absent = today's behaviour).
- **New data is optional:** new fields (amounts, check-ins, missions, intensity, project names) are optional, so old
  saves load unchanged.
- **Production:** keeps V1 untouched until the separate approval in stage 2.

| Stage | Area                                           | What                                                                                                                                                                                                       | Tests                                                                                                                        | Size |
| ----- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- |
| 0     | Decisions                                      | Founder approves the challenge list, intensities, readiness rules, missions model and core/extras model; reviewers booked (10.4)                                                                           | —                                                                                                                            | —    |
| 1     | **Habit content**                              | Pure data module for the 10 flagships (capability, destinations, phase × intensity targets, absorbed IDs, safety rules) and the supports list; renames from the competitor review. Not wired to any screen | Unit: every flagship has 9 targets, safety exclusions reuse V2 `exclusion`, no held or prototype IDs                         | S    |
| 2     | **Habit content (production, needs approval)** | Stop recommending Cold finish, Hydrate, Workout, Step count, Screen time cap and V1 Breathe to **new** V1 programs; existing saves keep them                                                               | V1 plan tests: no retired ID in any generated plan; old saves unchanged                                                      | S    |
| 3     | **Progression**                                | Readiness engine (pure): 14-day windows, offer, hold and suggest-down; weekly check-in record; applied only to `program: 'reset'`                                                                          | Deterministic tests like `dayComplete.test.ts`: phase start ± performance, check-in outcomes, never below Starter Foundation | M    |
| 4     | **Progression**                                | Quantities (`amounts` in day logs) and the weekly quota schedule type ("5 a week, any days"); the card shows the weekly metric                                                                             | Old logs load; quota rest days never count as misses; 80% rule unchanged for daily habits                                    | M    |
| 5     | **Onboarding**                                 | Transformation-first quiz (7.2), plan builder (7.5) producing a Reset plan; V2 quiz unchanged for existing flows                                                                                           | Engine tests for the three profiles in section 9; safety exclusions; daily-load cap                                          | L    |
| 6     | **Weekly missions**                            | Mission catalogue, weekly choice on review day, bonus XP, Week 1 baseline and Week 10 summit comparison                                                                                                    | Missions never affect day success, streak or step-downs; skip is free                                                        | M    |
| 7     | **Habit limit**                                | Core (max 6) and Extras (up to 6 more, 12 in total); extras excluded from the 80% rule, streak, ceremonies and step-downs; XP rework for Reset programs; compact cards; virtualised list                   | 80% and XP tests at 3/6/12 habits; card list memory and scroll checks on an iPhone                                           | M–L  |
| 8     | Rollout                                        | Founder review of a full 66-day dev run (with the time-travel tools), then a production decision                                                                                                           | Production unchanged until then (channel tests)                                                                              | —    |

**Order of value:** 1 → 3 → 4 → 5 give the core "Life Reset" feel. Stage 2 is the most urgent safety improvement but
touches production, so it waits for its own approval. 6 and 7 can follow independently.

---

## 12. The five highest-impact changes

**"What are the five highest-impact changes that would make Schwung feel like a genuine 66-Day Life Reset rather
than a beautiful checklist?"**

1. **Build every plan around 2–3 flagship challenges, each with a personal Day 66 destination.**
   - **Why:** today's plans are 5–6 equal microhabits led by Make your bed.
   - **Instead:** a named project, a books target, a skill demonstration, a screen-time goal against the person's
     own baseline. Supports stay small and secondary.
   - **Single change:** this one most changes what the app _is_.

2. **Ask what the person wants to change, and let them start ambitious.**
   - **Onboarding:** transformation first, with a short baseline, available time and a per-challenge intensity
     (Starter, Standard, Challenge).
   - **Effect:** a confident student begins at 60-minute focus blocks, not 15 minutes, while a beginner still starts
     small. Safety rules stay exactly as strict.

3. **Make progression depend on readiness, not the calendar.**
   - **Mechanics:** step-ups offered on performance over 14 days plus a weekly "too easy / right / too hard"
     check-in, gated by phases; kind step-downs; Mastery is a level the person can keep.
   - **Effect:** progress feels earned, and struggling users aren't pushed into failure on Day 22.

4. **Measure the transformation: from a Week 1 baseline to a Day 66 comparison.**
   - **What's tracked:** quantities (focused hours, Screen Time, active minutes, books, ladder rungs) and a weekly
     metric on each flagship card.
   - **The payoff:** re-measuring at the summit turns 66 days into visible proof. Today the app can't show any
     outcome at all.

5. **Give the 66 days a weekly arc with optional missions.**
   - **Shape:** one meaningful, one-off mission a week (measure, first test, stretch, capstone) that never punishes
     skipping and never touches the streak.
   - **Effect:** it makes the program feel like an expedition with chapters instead of the same list repeated 66
     times. It also fits the mountain and the Journey tab.

**And, before any of this reaches the public:** stop production V1 recommending cold showers, water quotas and
unscreened workouts to new programs (stage 2, with approval). A Life Reset has to be credible as well as ambitious.
